import { ReactNode, useId, useMemo, useState } from 'react';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { DpaLegalReader } from '../../../../DpaLegalForm/DpaLegalReader';
import { M3Button } from '../../../../M3Button';
import { Modal } from '../../../../Modal';
import type { LegalProposalAdoptionMode } from '../../../../../api/tenant/legalProposals';
import type { LegalTemplateArchive, LegalTemplateProposal } from '../../hooks/useLegalProposalInbox';
import { formatLegalDateTime } from '../../utils/legalDateTime';
import styles from './styles.module.scss';

export interface LegalTemplateCompareProps {
    /** The newest adoptable template; absent = nothing to compare. */
    proposal?: LegalTemplateProposal;
    /** Who sent it: the platform (to a Träger) or the Träger (to a Beratungsstelle). */
    source: 'platform' | 'traeger';
    documentType: 'privacy' | 'imprint';
    /** The editor's active language; the template is shown in the same one where it exists. */
    language: string;
    /** A draft exists (or unsaved work): adopting then archives it, after a confirmation. */
    hasDraft: boolean;
    readOnly?: boolean;
    readOnlyReason?: string;
    /** Adopting is blocked for another reason than permissions (e.g. an open draft conflict). */
    adoptBlockedReason?: string;
    archives?: LegalTemplateArchive[];
    onAdopt: (mode: LegalProposalAdoptionMode) => Promise<void> | void;
    onDismiss: () => Promise<void> | void;
    /** The own draft — the normal editor, unchanged. */
    children: ReactNode;
}

const pickLanguage = (content: Record<string, string>, language: string) => {
    if (content[language] !== undefined) return { language, html: content[language] };
    const fallback = content.de !== undefined ? 'de' : Object.keys(content)[0];
    return { language: fallback, html: fallback ? content[fallback] : '' };
};

/**
 * One received legal template beside the own draft (ORISO-Admin#1070). Both rungs use it:
 * platform → Träger and Träger → Beratungsstelle; only the permissions differ. The template
 * is read-only and selectable, adopting copies it into the draft and publishes nothing, and
 * dismissing never touches local work.
 */
export const LegalTemplateCompare = ({
    proposal,
    source,
    documentType,
    language,
    hasDraft,
    readOnly = false,
    readOnlyReason,
    adoptBlockedReason,
    archives = [],
    onAdopt,
    onDismiss,
    children,
}: LegalTemplateCompareProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n?.language?.split('-')[0] || 'de';
    const paneId = useId();
    const [openedId, setOpenedId] = useState<number>();
    const [closedId, setClosedId] = useState<number>();
    const [collapsed, setCollapsed] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [pending, setPending] = useState<'adopt' | 'dismiss'>();
    const [archivesOpen, setArchivesOpen] = useState(false);
    const [archiveId, setArchiveId] = useState<number>();

    const isNew = proposal?.status === 'PENDING';
    const open = !!proposal && ((isNew && closedId !== proposal.id) || openedId === proposal.id);
    const shown = useMemo(() => pickLanguage(proposal?.content ?? {}, language), [proposal?.content, language]);
    const safeHtml = useMemo(() => DOMPurify.sanitize(shown.html ?? ''), [shown.html]);
    const sourceLabel = t(`legal.proposal.source.${source}`);
    const adoptDisabled = readOnly || !!adoptBlockedReason || !!pending;

    const run = async (action: 'adopt' | 'dismiss', call: () => Promise<void> | void) => {
        setPending(action);
        try {
            await call();
        } finally {
            setPending(undefined);
        }
    };
    const adopt = () => {
        if (adoptDisabled) return;
        if (hasDraft) {
            setConfirming(true);
            return;
        }
        run('adopt', () => onAdopt('CREATE_IF_EMPTY'));
    };

    const archivesButton = archives.length > 0 && (
        <M3Button variant="text" onClick={() => setArchivesOpen(true)}>
            {t('legal.proposal.archives.open', { count: archives.length })}
        </M3Button>
    );
    const selectedArchive = archives.find((archive) => archive.id === archiveId) ?? archives[0];
    const archiveDialog = archivesOpen && selectedArchive && (
        <Modal
            titleKey="legal.proposal.archives.title"
            descriptionKey="legal.proposal.archives.description"
            cancelLabelKey="legal.proposal.close"
            onClose={() => setArchivesOpen(false)}
            width={720}
        >
            {archives.length > 1 && (
                <div className={styles.archiveList} role="group" aria-label={t('legal.proposal.archives.title')}>
                    {archives.map((archive) => (
                        <M3Button
                            key={archive.id}
                            variant={archive.id === selectedArchive.id ? 'tonal' : 'text'}
                            aria-pressed={archive.id === selectedArchive.id}
                            onClick={() => setArchiveId(archive.id)}
                        >
                            {formatLegalDateTime(archive.archivedAt, locale)}
                        </M3Button>
                    ))}
                </div>
            )}
            <p className={styles.archiveMeta}>
                {t('legal.proposal.archives.entry', {
                    saved: formatLegalDateTime(selectedArchive.draftSavedAt, locale),
                    archived: formatLegalDateTime(selectedArchive.archivedAt, locale),
                })}
            </p>
            <DpaLegalReader
                html={DOMPurify.sanitize(pickLanguage(selectedArchive.content, language).html ?? '')}
                label={t('legal.proposal.archives.title')}
                testId="legal-archive-reader"
            />
        </Modal>
    );

    if (!open) {
        return (
            <>
                {(proposal || archives.length > 0) && (
                    <div className={styles.bar}>
                        {proposal && (
                            <M3Button variant="text" onClick={() => setOpenedId(proposal.id)}>
                                {t('legal.proposal.show')}
                            </M3Button>
                        )}
                        {archivesButton}
                    </div>
                )}
                {children}
                {archiveDialog}
            </>
        );
    }

    const impact = proposal.departmentImpact;

    return (
        <section
            className={styles.compare}
            aria-label={`${sourceLabel} · ${t(`legal.proposal.document.${documentType}`)}`}
            data-legal-compare-open="true"
        >
            <header className={styles.header}>
                <div className={styles.heading}>
                    {isNew && (
                        <span className={styles.marker}>
                            <FiberManualRecordIcon className={styles.markerDot} fontSize="inherit" aria-hidden />
                            {t('legal.proposal.new')}
                        </span>
                    )}
                    <span className={styles.source}>{sourceLabel}</span>
                    <span className={styles.sentAt}>
                        {t('legal.proposal.sentAt')}{' '}
                        <time dateTime={proposal.createdAt}>{formatLegalDateTime(proposal.createdAt, locale)}</time>
                    </span>
                </div>
                <p className={styles.hint}>{t('legal.proposal.hint')}</p>
                {impact && (
                    <p className={styles.hint}>
                        {t('legal.proposal.departmentImpact', {
                            count: impact.affected,
                            notAffected: impact.notAffected,
                        })}
                    </p>
                )}
                {readOnly && readOnlyReason && (
                    <p className={styles.lock} role="note">
                        {readOnlyReason}
                    </p>
                )}
                {!readOnly && adoptBlockedReason && (
                    <p className={styles.lock} role="note">
                        {adoptBlockedReason}
                    </p>
                )}
                <div className={styles.actions}>
                    {archivesButton}
                    {!isNew && (
                        <M3Button
                            variant="text"
                            onClick={() => {
                                setClosedId(proposal.id);
                                setOpenedId(undefined);
                            }}
                        >
                            {t('legal.proposal.hide')}
                        </M3Button>
                    )}
                    {isNew && (
                        <M3Button
                            variant="outlined"
                            disabled={readOnly || !!pending}
                            loading={pending === 'dismiss'}
                            onClick={() => run('dismiss', onDismiss)}
                        >
                            {t('legal.proposal.dismiss')}
                        </M3Button>
                    )}
                    <M3Button variant="filled" disabled={adoptDisabled} loading={pending === 'adopt'} onClick={adopt}>
                        {t('legal.proposal.adopt')}
                    </M3Button>
                </div>
            </header>
            <div className={classNames(styles.panes, { [styles.collapsed]: collapsed })}>
                <div className={styles.templatePane}>
                    <button
                        type="button"
                        className={styles.toggle}
                        aria-expanded={!collapsed}
                        aria-controls={paneId}
                        onClick={() => setCollapsed((current) => !current)}
                    >
                        {t(collapsed ? 'legal.proposal.expand' : 'legal.proposal.collapse')}
                    </button>
                    {!collapsed && (
                        <div id={paneId} className={styles.reader}>
                            {shown.language !== language && shown.language && (
                                <p className={styles.hint}>
                                    {t('legal.proposal.otherLanguage', {
                                        language: t(`language.${shown.language}`, shown.language.toUpperCase()),
                                    })}
                                </p>
                            )}
                            <DpaLegalReader
                                html={safeHtml}
                                label={sourceLabel}
                                contentLanguage={shown.language}
                                testId="legal-template-reader"
                            />
                        </div>
                    )}
                </div>
                <div className={styles.draftPane}>{children}</div>
            </div>
            {confirming && (
                <Modal
                    titleKey="legal.proposal.replace.title"
                    contentKey="legal.proposal.replace.content"
                    okLabelKey="legal.proposal.replace.confirm"
                    cancelLabelKey="cancel"
                    onConfirm={() => {
                        setConfirming(false);
                        run('adopt', () => onAdopt('ARCHIVE_AND_REPLACE'));
                    }}
                    onClose={() => setConfirming(false)}
                />
            )}
            {archiveDialog}
        </section>
    );
};

export default LegalTemplateCompare;
