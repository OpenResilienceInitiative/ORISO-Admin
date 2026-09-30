import { cloneElement, ReactElement, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import { EditorHintSnackbar } from '../../../../FormPluginEditor/EditorHintSnackbar';
import {
    EditorSnackbarQueue,
    EditorSnackbarQueueItem,
    editorSnackbarItems,
} from '../../../../FormPluginEditor/EditorSnackbarQueue';
import type { M3RichTextEditorProps } from '../../../../FormPluginEditor/M3RichTextEditor';
import { DpaLegalReader } from '../../../../DpaLegalForm/DpaLegalReader';
import { M3Button } from '../../../../M3Button';
import { Modal } from '../../../../Modal';
import type { LegalProposalAdoptionMode } from '../../../../../api/tenant/legalProposals';
import type { LegalTemplateArchive, LegalTemplateProposal } from '../../hooks/useLegalProposalInbox';
import { formatLegalDateTime } from '../../utils/legalDateTime';
import styles from './styles.module.scss';

type ComparisonHostProps = Pick<M3RichTextEditorProps, 'comparison' | 'snackbarSlot'>;

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
    children: ReactElement<ComparisonHostProps>;
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
    const [openedId, setOpenedId] = useState<number>();
    const [closedId, setClosedId] = useState<number>();
    const [confirming, setConfirming] = useState(false);
    const [pending, setPending] = useState<'adopt' | 'dismiss'>();
    const [archivesOpen, setArchivesOpen] = useState(false);
    const [archiveId, setArchiveId] = useState<number>();

    const isNew = proposal?.status === 'PENDING';
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

    const impact = proposal?.departmentImpact;
    // The editor owns the comparison layout. Add one read-only reference and one
    // editor-local notice to either the tenant editor or the agency card that
    // forwards these two props; neither route creates another editor instance.
    if (proposal) {
        const host = children;
        const originalSlot = host.props.snackbarSlot;
        const originalItems = editorSnackbarItems(originalSlot, 'existing-editor-notice');
        const showNotice = isNew && closedId !== proposal.id && openedId !== proposal.id;
        const notice: EditorSnackbarQueueItem | false = showNotice && {
            key: `template:${source}:${proposal.id}`,
            node: (
                <EditorHintSnackbar
                    layout="long"
                    text={
                        <>
                            <strong>{t('legal.proposal.new')}</strong> · {sourceLabel}. {t('legal.proposal.sentAt')}{' '}
                            {formatLegalDateTime(proposal.createdAt, locale)}. {t('legal.proposal.noticeDraftSafe')}
                        </>
                    }
                    onClose={() => setClosedId(proposal.id)}
                    onDismiss={readOnly ? undefined : () => run('dismiss', onDismiss)}
                    actionDisabled={!!pending}
                    actionLabel={readOnly ? undefined : t('legal.help.snackbar.dismiss')}
                    secondaryAction={{ label: t('legal.proposal.preview'), onClick: () => setOpenedId(proposal.id) }}
                />
            ),
        };
        const injected = cloneElement(host, {
            comparison: {
                title: `${sourceLabel} · ${t(`legal.proposal.document.${documentType}`)}`,
                html: safeHtml,
                language: shown.language,
                open: openedId === proposal.id,
                onOpenChange: (next) => setOpenedId(next ? proposal.id : undefined),
                detail: (
                    <>
                        {t('legal.proposal.sentAt')} {formatLegalDateTime(proposal.createdAt, locale)}
                        {shown.language !== language && (
                            <p>{t('legal.proposal.otherLanguage', { language: shown.language })}</p>
                        )}
                        {impact && (
                            <p>
                                {t('legal.proposal.departmentImpact', {
                                    count: impact.affected,
                                    notAffected: impact.notAffected,
                                })}
                            </p>
                        )}
                        {readOnly && readOnlyReason && <p role="note">{readOnlyReason}</p>}
                        {adoptBlockedReason && <p role="note">{adoptBlockedReason}</p>}
                    </>
                ),
                actions: (
                    <>
                        {archivesButton}
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
                        <M3Button
                            variant="filled"
                            disabled={adoptDisabled}
                            loading={pending === 'adopt'}
                            onClick={adopt}
                        >
                            {t('legal.proposal.adopt')}
                        </M3Button>
                    </>
                ),
            },
            snackbarSlot:
                notice || originalItems.length ? <EditorSnackbarQueue items={[notice, ...originalItems]} /> : undefined,
        });
        return (
            <>
                {injected}
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
            </>
        );
    }

    return (
        <>
            {archivesButton && <div className={styles.bar}>{archivesButton}</div>}
            {children}
            {archiveDialog}
        </>
    );
};

export default LegalTemplateCompare;
