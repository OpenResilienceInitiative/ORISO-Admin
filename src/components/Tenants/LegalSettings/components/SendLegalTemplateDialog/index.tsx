import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import getAgencyData from '../../../../../api/agency/getAgencyData';
import {
    distributeAgencyLegalProposal,
    distributeTenantLegalProposal,
    newDistributionRequestKey,
    TenantLegalProposalAudience,
} from '../../../../../api/tenant/legalProposals';
import type { TenantLegalDraftKind } from '../../../../../api/tenant/legalDrafts';
import { searchTenantData } from '../../../../../api/tenant/searchTenantData';
import { ConsultantPicker, ConsultantOption } from '../../../../ConsultantPicker';
import { GdprIcon, ImprintIcon } from '../../../../CustomIcons/LegalIcons';
import { Modal } from '../../../../Modal';
import { RadioButton } from '../../../../radioButton/RadioButton';
import { formatLegalDateTime } from '../../utils/legalDateTime';
import styles from './styles.module.scss';

/**
 * Who a template goes to. The platform offers its drafts to Träger; a Träger offers its
 * drafts to its own Beratungsstellen. Same dialog, same positions — only the words, the
 * recipient list and the endpoint change.
 */
export type TemplateRecipientLevel = 'traeger' | 'agencies';

export interface SendLegalTemplateDialogProps {
    level: TemplateRecipientLevel;
    kind: TenantLegalDraftKind;
    /** The saved draft revision (`id:version`) that is sent — never unsaved content. */
    draftRevision: string;
    /** When that revision was saved; named in the dialog so the admin knows which version goes out. */
    draftSavedAt: string;
    onClose: () => void;
}

const PER_PAGE = 200;

/**
 * Every recipient as a picker option. Sequential paging on purpose: each page's total
 * decides whether another one exists (same shape as the invite pre-flagging).
 */
const loadRecipients = async (level: TemplateRecipientLevel): Promise<ConsultantOption[]> => {
    const options: ConsultantOption[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    while (options.length < total) {
        const nextPage =
            level === 'traeger'
                ? searchTenantData({ page, perPage: PER_PAGE })
                : getAgencyData({ current: page, pageSize: PER_PAGE });
        // eslint-disable-next-line no-await-in-loop
        const response = await nextPage;
        const rows: Array<{ id?: number | string | null; name?: string }> = response.data ?? [];
        options.push(
            ...rows
                .filter((row) => row.id != null && Number(row.id) > 0)
                .map((row) => ({ id: String(row.id), name: row.name ?? `#${row.id}` })),
        );
        total = response.total ?? options.length;
        if (rows.length === 0) break;
        page += 1;
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
};

const errorCode = (error: unknown) =>
    error && typeof error === 'object' && 'message' in error ? String((error as Error).message) : '';

/**
 * Offer the saved draft as a template to the level below. The dialog says which document
 * and which saved version goes out, and that nothing is published — the things an admin
 * has to be sure of before sending a legal text to many organisations.
 */
export const SendLegalTemplateDialog = ({
    level,
    kind,
    draftRevision,
    draftSavedAt,
    onClose,
}: SendLegalTemplateDialogProps) => {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [audience, setAudience] = useState<TenantLegalProposalAudience>('ALL');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    // One key per opened dialog: a double click or a retry is the same request, so the
    // server returns the existing distribution instead of a second proposal per recipient.
    const [requestKey] = useState(newDistributionRequestKey);
    const documentKey = kind === 'IMPRINT' ? 'imprint' : 'privacy';

    const recipients = useQuery({
        queryKey: ['legal-template-recipients', level],
        queryFn: () => loadRecipients(level),
    });

    // Zoneless server times are UTC; admins read them in Berlin time.
    const savedAtLabel = useMemo(
        () => formatLegalDateTime(draftSavedAt, i18n.language?.split('-')[0] || 'de'),
        [draftSavedAt, i18n.language],
    );

    const noneSelected = audience === 'SELECTED' && selectedIds.length === 0;
    const selectedNumbers = selectedIds.map(Number);

    const send = async () => {
        if (noneSelected || sending) return;
        setSending(true);
        try {
            let count: number;
            if (level === 'traeger') {
                const result = await distributeTenantLegalProposal({
                    requestKey,
                    kind,
                    sourceRevision: draftRevision,
                    audience,
                    ...(audience === 'SELECTED' ? { tenantIds: selectedNumbers } : {}),
                });
                count = result?.recipientTenantIds?.length ?? 0;
            } else {
                const result = await distributeAgencyLegalProposal({
                    requestKey,
                    kind,
                    sourceRevision: draftRevision,
                    audience,
                    ...(audience === 'SELECTED' ? { agencyIds: selectedNumbers } : {}),
                });
                count = result?.recipientAgencyIds?.length ?? 0;
            }
            notification.success({ message: t(`legal.template.send.${level}.sent`, { count }), duration: 5 });
            // The sent version belongs in the version menu's template section at once.
            queryClient.invalidateQueries({ queryKey: ['legal-template-history'] });
            onClose();
        } catch (error) {
            const code = errorCode(error);
            let messageKey = 'legal.template.send.error';
            if (code === 'CONFLICT') messageKey = 'legal.template.send.conflict';
            else if (code === 'NO_MATCH') messageKey = 'legal.template.send.missing';
            else if (code === 'BAD_REQUEST' && level === 'agencies')
                messageKey = 'legal.template.send.agencies.noAgencies';
            else if (code === 'FORBIDDEN') messageKey = 'legal.template.send.forbidden';
            notification.error({ message: t(messageKey), duration: 8 });
        } finally {
            setSending(false);
        }
    };

    const noneSelectedId = `legal-template-none-selected-${level}`;

    return (
        <Modal
            titleKey={`legal.template.send.${level}.title.${documentKey}`}
            description={t(`legal.template.send.${level}.description`, { savedAt: savedAtLabel })}
            icon={kind === 'IMPRINT' ? <ImprintIcon /> : <GdprIcon />}
            okLabelKey={level === 'agencies' ? 'legal.template.send.agencies.confirm' : 'legal.template.send.confirm'}
            cancelLabelKey="cancel"
            onConfirm={send}
            onClose={onClose}
            confirmDisabled={sending || noneSelected || (audience === 'SELECTED' && !recipients.isSuccess)}
            confirmDescribedBy={noneSelected ? noneSelectedId : undefined}
            width={560}
        >
            <div className={styles.body}>
                <fieldset className={styles.audience}>
                    <legend className={styles.legend}>{t('legal.template.send.audience.label')}</legend>
                    <RadioButton
                        name={`legal-template-audience-${level}`}
                        value="ALL"
                        inputId={`legal-template-audience-all-${level}`}
                        label={t(`legal.template.send.${level}.audience.all`)}
                        checked={audience === 'ALL'}
                        type="default"
                        handleRadioButton={() => setAudience('ALL')}
                    />
                    <RadioButton
                        name={`legal-template-audience-${level}`}
                        value="SELECTED"
                        inputId={`legal-template-audience-selected-${level}`}
                        label={t(`legal.template.send.${level}.audience.selected`)}
                        checked={audience === 'SELECTED'}
                        type="default"
                        handleRadioButton={() => setAudience('SELECTED')}
                    />
                </fieldset>

                {audience === 'SELECTED' && (
                    <div className={styles.picker}>
                        {recipients.isError ? (
                            <p role="alert" className={styles.error}>
                                {t(`legal.template.send.${level}.loadError`)}
                            </p>
                        ) : (
                            <ConsultantPicker
                                consultants={recipients.data ?? []}
                                selectedIds={selectedIds}
                                onChange={setSelectedIds}
                                searchLabel={t(`legal.template.send.${level}.search`)}
                            />
                        )}
                        {noneSelected && (
                            <p id={noneSelectedId} className={styles.hint}>
                                {t(`legal.template.send.${level}.noneSelected`)}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};
