import { useQuery } from '@tanstack/react-query';
import { notification } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    distributeTenantLegalProposal,
    newDistributionRequestKey,
    TenantLegalProposalAudience,
} from '../../../../../api/tenant/legalProposals';
import type { TenantLegalDraftKind } from '../../../../../api/tenant/legalDrafts';
import { searchTenantData } from '../../../../../api/tenant/searchTenantData';
import { ConsultantPicker, ConsultantOption } from '../../../../ConsultantPicker';
import { SendTemplateIcon } from '../../../../CustomIcons/EditorIcons';
import { Modal } from '../../../../Modal';
import { RadioButton } from '../../../../radioButton/RadioButton';
import styles from './styles.module.scss';

export interface SendLegalTemplateDialogProps {
    kind: TenantLegalDraftKind;
    /** The saved platform draft revision (`id:version`) that is sent — never unsaved content. */
    draftRevision: string;
    /** When that revision was saved; named in the dialog so the admin knows which version goes out. */
    draftSavedAt: string;
    onClose: () => void;
}

export const tenantRecipientsKey = ['legal-template-recipients'] as const;

/**
 * Every current Träger as a picker option. Sequential paging on purpose: each page's
 * total decides whether another one exists (same shape as the invite pre-flagging).
 */
const loadTenantRecipients = async (): Promise<ConsultantOption[]> => {
    const perPage = 200;
    const options: ConsultantOption[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    while (options.length < total) {
        // eslint-disable-next-line no-await-in-loop
        const response = await searchTenantData({ page, perPage });
        const rows = response.data ?? [];
        options.push(
            ...rows
                .filter((tenant) => tenant.id != null && tenant.id > 0)
                .map((tenant) => ({ id: String(tenant.id), name: tenant.name ?? `#${tenant.id}` })),
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
 * Platform → Träger: offer the saved platform draft as a template. The dialog says
 * which saved version goes out and that nothing is published — the two things an
 * admin has to be sure of before sending a legal text to many organisations.
 */
export const SendLegalTemplateDialog = ({
    kind,
    draftRevision,
    draftSavedAt,
    onClose,
}: SendLegalTemplateDialogProps) => {
    const { t, i18n } = useTranslation();
    const [audience, setAudience] = useState<TenantLegalProposalAudience>('ALL');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    // One key per opened dialog: a double click or a retry is the same request, so the
    // server returns the existing distribution instead of a second proposal per Träger.
    const [requestKey] = useState(newDistributionRequestKey);

    const recipients = useQuery({ queryKey: tenantRecipientsKey, queryFn: loadTenantRecipients });

    const savedAtLabel = useMemo(() => {
        const date = new Date(draftSavedAt);
        return Number.isNaN(date.getTime())
            ? draftSavedAt
            : new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }, [draftSavedAt, i18n.language]);

    const noneSelected = audience === 'SELECTED' && selectedIds.length === 0;

    const send = async () => {
        if (noneSelected || sending) return;
        setSending(true);
        try {
            const result = await distributeTenantLegalProposal({
                requestKey,
                kind,
                sourceRevision: draftRevision,
                audience,
                ...(audience === 'SELECTED' ? { tenantIds: selectedIds.map(Number) } : {}),
            });
            const count = result?.recipientTenantIds?.length ?? 0;
            notification.success({ message: t('legal.template.send.sent', { count }), duration: 5 });
            onClose();
        } catch (error) {
            const code = errorCode(error);
            let messageKey = 'legal.template.send.error';
            if (code === 'CONFLICT') messageKey = 'legal.template.send.conflict';
            else if (code === 'NO_MATCH') messageKey = 'legal.template.send.missing';
            notification.error({ message: t(messageKey), duration: 8 });
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            titleKey="legal.template.send.title"
            description={t('legal.template.send.description', { savedAt: savedAtLabel })}
            icon={<SendTemplateIcon />}
            okLabelKey="legal.template.send.confirm"
            cancelLabelKey="cancel"
            onConfirm={send}
            onClose={onClose}
            confirmDisabled={sending || noneSelected || (audience === 'SELECTED' && !recipients.isSuccess)}
            confirmDescribedBy={noneSelected ? 'legal-template-none-selected' : undefined}
            width={560}
        >
            <div className={styles.body}>
                <fieldset className={styles.audience}>
                    <legend className={styles.legend}>{t('legal.template.send.audience.label')}</legend>
                    <RadioButton
                        name="legal-template-audience"
                        value="ALL"
                        inputId="legal-template-audience-all"
                        label={t('legal.template.send.audience.all')}
                        checked={audience === 'ALL'}
                        type="default"
                        handleRadioButton={() => setAudience('ALL')}
                    />
                    <RadioButton
                        name="legal-template-audience"
                        value="SELECTED"
                        inputId="legal-template-audience-selected"
                        label={t('legal.template.send.audience.selected')}
                        checked={audience === 'SELECTED'}
                        type="default"
                        handleRadioButton={() => setAudience('SELECTED')}
                    />
                </fieldset>

                {audience === 'SELECTED' && (
                    <div className={styles.picker}>
                        {recipients.isError ? (
                            <p role="alert" className={styles.error}>
                                {t('legal.template.send.loadError')}
                            </p>
                        ) : (
                            <ConsultantPicker
                                consultants={recipients.data ?? []}
                                selectedIds={selectedIds}
                                onChange={setSelectedIds}
                                searchLabel={t('legal.template.send.search')}
                            />
                        )}
                        {noneSelected && (
                            <p id="legal-template-none-selected" className={styles.hint}>
                                {t('legal.template.send.noneSelected')}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};
