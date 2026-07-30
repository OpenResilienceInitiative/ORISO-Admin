import { useMemo, useState } from 'react';
import { DeleteOutlined, DownloadOutlined, MoreOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { message, Upload, type MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import {
    agencyIdAllocationClient,
    tenantIdAllocationClient,
    type AllocationMode,
    type IdAllocationClient,
} from '../../api/idAllocation/idAllocation';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';
import { IdAllocationField, useIdAllocation } from '../../components/IdAllocationField';
import { GlobalSearchBar, GlobalSearchMenu } from '../../components/GlobalSearch';
import { SplitButton } from '../../components/GlobalSearch/SplitButton';
import splitButtonStyles from '../../components/GlobalSearch/splitButton.module.scss';
import { M3NumberField } from '../../components/M3NumberField';
import { parseInviteCsv, type ParseInviteCsvResult } from './csv/parseInviteCsv';
import { downloadInviteCsvTemplate } from './csv/inviteCsvTemplate';
import { ReactComponent as MailFilledIcon } from '../../resources/img/svg/oriso/mail_filled_24px.svg';
import { ReactComponent as FileSaveIcon } from '../../resources/img/svg/oriso/file_save_24px.svg';
import { ReactComponent as SendIcon } from '../../resources/img/svg/oriso/send_400_24px.svg';
import { ReactComponent as SendFilledIcon } from '../../resources/img/svg/oriso/send_filled_24px.svg';
import styles from './inviteComposer.module.scss';

/**
 * `direct` = create the invite AND send the templated e-mail;
 * `createOnly` = create the recipient without sending (the API supports this
 * by simply omitting `templateId`).
 */
export type InviteSendMode = 'direct' | 'createOnly';

export interface InviteComposerValues {
    recipientEmail: string;
    firstName?: string;
    lastName?: string;
    tenantId?: number;
    agencyId?: number;
    /**
     * Träger tab only (#570): `AUTO` = the backend assigns the smallest free
     * tenant id atomically — `tenantId` is then deliberately undefined (no
     * browser-pinned id). `MANUAL` = the admin pinned `tenantId` explicitly.
     */
    tenantIdAllocationMode?: AllocationMode;
    /** Same contract for the agency id space (AgencyService, U2). */
    agencyIdAllocationMode?: AllocationMode;
    /** Only set in `direct` mode — `createOnly` posts without a template. */
    templateId?: number;
    sendMode: InviteSendMode;
}

export interface InviteComposerProps {
    /** Templates of this tab's kind; only active ones are offered in the menu. */
    templates: InviteEmailTemplateDTO[];
    /** Currently selected template (lifted so the tab can reuse it, e.g. for resend). */
    templateId?: number;
    onTemplateIdChange: (templateId: number) => void;
    /** Träger tab: the Träger-ID is an allocation field — Auto by default, collision-checked in manual mode (#570). */
    requireTenantId?: boolean;
    /** Non-Träger tabs: prefill with the admin's own tenant. */
    initialTenantId?: number;
    /**
     * Allocation clients for the tenant / agency id spaces. Default to the real
     * TenantService/AgencyService clients; tests and stories inject stubs
     * (the backend endpoints are built in parallel, U1/U2).
     */
    tenantIdAllocation?: IdAllocationClient;
    agencyIdAllocation?: IdAllocationClient;
    includeAgencyField?: boolean;
    submitting?: boolean;
    /** Discriminator for the persisted send mode (one per tab), e.g. the target role. */
    persistKey: string;
    /** Resolve `true` on success — the composer then clears its fields. */
    onSubmit: (values: InviteComposerValues) => Promise<boolean> | boolean;
    /** Open the EmailTemplatesDialog in the requested view. */
    onManageTemplates: (intent: 'create' | 'delete') => void;
    /**
     * Enables the "⋮" more-menu with the "CSV-Datei importieren" entry (#315).
     * Called with the client-side parse result and the send mode captured at
     * import time — the file itself is never uploaded anywhere.
     */
    onCsvParsed?: (result: ParseInviteCsvResult, sendMode: InviteSendMode) => void;
    /**
     * Number of rows currently checked in the invites table (#316). Any value
     * > 0 flips the send split button into bulk mode ("N ausgewählte senden").
     */
    selectionCount?: number;
    /**
     * Bulk mode (#316): resend the selected invites with the currently chosen
     * template. Only reachable while `selectionCount` > 0 and a template is
     * selected — resending always mails, so a template is required regardless
     * of the persisted send mode.
     */
    onBulkSend?: () => void;
    /**
     * Bulk mode: clears the row selection. Drives the counter's up-chevron —
     * the one control that undoes the state the counter is showing.
     */
    onClearSelection?: () => void;
    /**
     * Enables the "Ausgewählte löschen" entry in the "⋮" more-menu (#316).
     * The entry is disabled without a selection; the tab opens the revoke
     * confirmation dialog.
     */
    onDeleteSelected?: () => void;
    searchPlaceholder?: string;
    className?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toAllocationMode = (mode: 'auto' | 'manual'): AllocationMode => (mode === 'auto' ? 'AUTO' : 'MANUAL');

export const sendModeStorageKey = (persistKey: string) => `oriso-admin.invite-composer.send-mode.${persistKey}`;

// `File.text()` with a FileReader fallback — jsdom (tests) implements only the latter.
const readFileText = (file: File): Promise<string> =>
    typeof file.text === 'function'
        ? file.text()
        : new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result ?? ''));
              reader.onerror = () => reject(reader.error);
              reader.readAsText(file);
          });

const readPersistedSendMode = (persistKey: string): InviteSendMode => {
    try {
        return window.localStorage.getItem(sendModeStorageKey(persistKey)) === 'createOnly' ? 'createOnly' : 'direct';
    } catch {
        return 'direct';
    }
};

/**
 * Invite composer row (#314, Figma 1165:17005 middle row): minimized global
 * search pill, floating-label recipient fields, the pill-shaped Träger-ID
 * number field (auto-suggest preserved), a tonal template split button whose
 * chevron menu selects/creates/deletes templates, and the send split button.
 * The send button rests `outlined` + disabled and only turns `primary` once
 * everything is validly filled; its chevron switches the persisted send mode
 * ("Direkt Versenden" vs "Empfänger nur anlegen", saved per tab in
 * localStorage until the admin changes it again).
 */
export const InviteComposer = ({
    templates,
    templateId,
    onTemplateIdChange,
    requireTenantId = false,
    initialTenantId,
    tenantIdAllocation,
    agencyIdAllocation,
    includeAgencyField = false,
    submitting = false,
    persistKey,
    onSubmit,
    onManageTemplates,
    onCsvParsed,
    selectionCount = 0,
    onBulkSend,
    onClearSelection,
    onDeleteSelected,
    searchPlaceholder,
    className,
}: InviteComposerProps) => {
    const { t } = useTranslation();
    const [recipientEmail, setRecipientEmail] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    // `null` = untouched → the field renders the admin's own tenant (non-Träger
    // tabs). Any admin edit (including clearing) becomes an override; a
    // successful submit resets to `null`.
    const [tenantIdOverride, setTenantIdOverride] = useState<number | undefined | null>(null);
    const [sendMode, setSendMode] = useState<InviteSendMode>(() => readPersistedSendMode(persistKey));

    // Träger tab (#570): the Träger-ID is allocated, not guessed — visible Auto
    // default, deliberate manual mode with authoritative availability states.
    // The counsellor tab's Beratungsstellen-ID follows the same contract in the
    // agency id space. Both hooks always run (rules of hooks); an unused one
    // stays idle and never issues a request.
    const tenantAllocation = useIdAllocation({ client: tenantIdAllocation ?? tenantIdAllocationClient });
    const agencyAllocation = useIdAllocation({ client: agencyIdAllocation ?? agencyIdAllocationClient });

    const fallbackTenantId = tenantIdOverride !== null ? tenantIdOverride : initialTenantId;
    const tenantId = requireTenantId ? tenantAllocation.value : fallbackTenantId;

    const activeTemplates = useMemo(() => templates.filter((template) => template.active), [templates]);
    const selectedTemplate = activeTemplates.find((template) => template.id === templateId);

    const emailValid = EMAIL_PATTERN.test(recipientEmail.trim());
    // Auto is always sendable; a manual id only once the check confirmed it free.
    const tenantIdValid = !requireTenantId || tenantAllocation.canSubmit;
    const agencyIdValid = !includeAgencyField || agencyAllocation.canSubmit;
    const templateValid = sendMode === 'createOnly' || selectedTemplate != null;
    const isValid = emailValid && tenantIdValid && agencyIdValid && templateValid;
    const showEmailError = emailTouched && recipientEmail.length > 0 && !emailValid;

    // Bulk mode (#316): while rows are checked, sending acts on the selection
    // (resend per row) instead of creating a new invite. Resending always mails,
    // so readiness is gated on a chosen template — independent of the persisted
    // send mode, which only applies to the single-create flow.
    const bulkMode = selectionCount > 0 && onBulkSend != null;
    const bulkValid = selectedTemplate != null;
    const sendReady = bulkMode ? bulkValid : isValid;

    const changeSendMode = (mode: InviteSendMode) => {
        setSendMode(mode);
        try {
            window.localStorage.setItem(sendModeStorageKey(persistKey), mode);
        } catch {
            // Storage unavailable (e.g. private mode) — the choice still holds for this session.
        }
    };

    const handleSend = async () => {
        if (!isValid || submitting) {
            return;
        }

        const succeeded = await onSubmit({
            recipientEmail: recipientEmail.trim(),
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            // AUTO pins no id in the browser — the backend assigns the smallest free one.
            tenantId,
            tenantIdAllocationMode: requireTenantId ? toAllocationMode(tenantAllocation.mode) : undefined,
            agencyId: includeAgencyField ? agencyAllocation.value : undefined,
            agencyIdAllocationMode: includeAgencyField ? toAllocationMode(agencyAllocation.mode) : undefined,
            templateId: sendMode === 'direct' ? templateId : undefined,
            sendMode,
        });

        if (succeeded) {
            setRecipientEmail('');
            setEmailTouched(false);
            setFirstName('');
            setLastName('');
            setTenantIdOverride(null);
            // The next invite starts with no deliberate number choice again.
            tenantAllocation.resetToAuto();
            agencyAllocation.resetToAuto();
        }
    };

    const templateMenu: MenuProps = {
        items: [
            {
                key: 'templates',
                type: 'group',
                // Two lines (Figma): what the list is FOR, then what it lists.
                label: (
                    <>
                        <div>{t('links.composer.templateGroupLead', 'Auswählen oder neu erstellen')}</div>
                        <strong className={styles.templateGroupTitle}>
                            {t('links.composer.templateGroupTitle', 'E-Mail-Vorlagen')}
                        </strong>
                    </>
                ),
                children: activeTemplates.map((template, index) => ({
                    key: String(template.id),
                    // Names are user input and often near-identical, so each entry
                    // also carries its position in the list.
                    label: (
                        <span className={splitButtonStyles.menuEntry}>
                            <span aria-hidden className={splitButtonStyles.menuIndex}>
                                {index + 1}
                            </span>
                            {template.name}
                        </span>
                    ),
                })),
            },
            { key: 'divider', type: 'divider' },
            {
                key: 'create',
                className: splitButtonStyles.menuCreate,
                icon: <PlusOutlined aria-hidden />,
                label: t('links.composer.templateCreate', 'Neue E-Mail-Vorlage erstellen'),
            },
            {
                key: 'delete',
                icon: <DeleteOutlined aria-hidden />,
                label: t('links.composer.templateDelete', 'E-Mail-Vorlage löschen'),
            },
        ],
        selectable: true,
        selectedKeys: templateId != null ? [String(templateId)] : [],
        onClick: ({ key }) => {
            if (key === 'create' || key === 'delete') {
                onManageTemplates(key);
                return;
            }
            onTemplateIdChange(Number(key));
        },
    };

    // "CSV-Datei importieren" (#315, Figma "Invite Link Options"): the file is read
    // and parsed entirely client-side; the parse result plus the CURRENT persisted
    // send mode go to the tab, which opens the preview modal. Direct mode needs a
    // template — same gate as the send button — otherwise the batch would silently
    // create-without-send.
    const handleCsvFile = async (file: File) => {
        if (sendMode === 'direct' && selectedTemplate == null) {
            message.error(t('links.accountInvites.templateRequired', 'Bitte zuerst ein Template auswählen.'));
            return Upload.LIST_IGNORE;
        }
        try {
            const result = parseInviteCsv(await readFileText(file));
            if (result.rows.length === 0 && result.rejected.length === 0) {
                message.info(t('links.csvImport.emptyFile', 'Die CSV-Datei enthält keine Empfänger.'));
            } else {
                onCsvParsed?.(result, sendMode);
            }
        } catch {
            message.error(t('links.csvImport.readFailed', 'CSV-Datei konnte nicht gelesen werden.'));
        }
        return Upload.LIST_IGNORE;
    };

    // The id column is the Träger-ID on the Träger tab and the agency id
    // everywhere else — the template header has to say which one.
    const csvIdLabel = requireTenantId
        ? t('links.accountInvites.tenantId', 'Träger-ID')
        : t('links.accountInvites.agencyId', 'Beratungsstellen-ID');

    const moreMenuItems: NonNullable<MenuProps['items']> = [];
    if (onCsvParsed) {
        moreMenuItems.push({
            key: 'csv-import',
            label: (
                <Upload accept=".csv,text/csv" beforeUpload={handleCsvFile} showUploadList={false}>
                    <span className={styles.csvImportEntry}>
                        <UploadOutlined aria-hidden />
                        <span className={styles.csvImportLabel}>
                            {t('links.csvImport.menuEntry', 'CSV-Datei importieren')}
                            {/* The import expects a fixed column ORDER, and an
                                admin standing in this menu has no other way to
                                learn it (#315 follow-up). */}
                            <span className={styles.csvImportHint}>
                                {t('links.csvImport.columns', 'Spalten: {{columns}}', {
                                    columns: [
                                        t('links.accountInvites.email', 'E-Mail'),
                                        t('links.accountInvites.firstName', 'Vorname'),
                                        t('links.composer.lastName', 'Name'),
                                        `${csvIdLabel} ${t('links.csvImport.optional', '(optional)')}`,
                                    ].join(', '),
                                })}
                            </span>
                        </span>
                    </span>
                </Upload>
            ),
        });
        moreMenuItems.push({
            key: 'csv-template',
            icon: <DownloadOutlined aria-hidden />,
            label: t('links.csvImport.downloadTemplate', 'CSV-Vorlage herunterladen'),
        });
    }
    if (onDeleteSelected) {
        // Owner wording is "löschen"; the confirmation dialog explains that
        // deleting means revoking (there is no hard-delete endpoint, #316).
        moreMenuItems.push({
            key: 'delete-selected',
            danger: true,
            disabled: selectionCount === 0,
            icon: <DeleteOutlined aria-hidden />,
            label: t('links.bulk.deleteSelected', 'Ausgewählte löschen'),
        });
    }

    const moreMenu: MenuProps = {
        items: moreMenuItems,
        onClick: ({ key }) => {
            if (key === 'delete-selected') {
                onDeleteSelected?.();
                return;
            }
            if (key === 'csv-template') {
                downloadInviteCsvTemplate(
                    {
                        email: t('links.accountInvites.email', 'E-Mail'),
                        firstName: t('links.accountInvites.firstName', 'Vorname'),
                        lastName: t('links.composer.lastName', 'Name'),
                        id: csvIdLabel,
                    },
                    t('links.csvImport.templateFileName', 'oriso-einladungen-vorlage.csv'),
                );
            }
        },
    };

    const singleSendLabel =
        sendMode === 'direct'
            ? t('links.composer.sendDirect', 'Direkt Versenden')
            : t('links.composer.sendCreateOnly', 'Empfänger nur anlegen');
    const bulkSendLabel = t('links.bulk.sendSelected', '{{count}} ausgewählte senden', { count: selectionCount });

    const sendMenu: MenuProps = {
        items: [
            {
                key: 'direct',
                icon: <SendIcon aria-hidden className={styles.menuIcon} />,
                label: t('links.composer.sendDirect', 'Direkt Versenden'),
            },
            {
                key: 'createOnly',
                icon: <FileSaveIcon aria-hidden className={styles.menuIcon} />,
                label: t('links.composer.sendCreateOnly', 'Empfänger nur anlegen'),
            },
        ],
        selectable: true,
        selectedKeys: [sendMode],
        onClick: ({ key }) => changeSendMode(key as InviteSendMode),
    };

    // "⋮" control before the search pill (Figma "Invite Link Options"): opens the
    // more-menu with secondary composer actions — CSV import (#315) and
    // "Ausgewählte löschen" (#316).
    const moreButton =
        moreMenuItems.length > 0 ? (
            <GlobalSearchMenu menu={moreMenu}>
                <button
                    aria-haspopup="menu"
                    aria-label={t('links.csvImport.moreMenuLabel', 'Weitere Aktionen')}
                    className={styles.moreButton}
                    type="button"
                >
                    <MoreOutlined aria-hidden />
                </button>
            </GlobalSearchMenu>
        ) : undefined;

    return (
        <GlobalSearchBar className={className} leading={moreButton} searchPlaceholder={searchPlaceholder}>
            <FloatingLabelInput
                className={styles.emailField}
                error={showEmailError}
                label={t('links.accountInvites.email', 'E-Mail')}
                name="recipientEmail"
                supportingText={
                    showEmailError
                        ? t('links.composer.emailInvalid', 'Bitte gültige E-Mail-Adresse eingeben.')
                        : undefined
                }
                type="email"
                value={recipientEmail}
                onBlur={() => setEmailTouched(true)}
                onChange={(event) => setRecipientEmail(event.target.value)}
            />
            <FloatingLabelInput
                className={styles.nameField}
                label={t('links.accountInvites.firstName', 'Vorname')}
                name="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
            />
            <FloatingLabelInput
                className={styles.nameField}
                label={t('links.composer.lastName', 'Name')}
                name="lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
            />
            {requireTenantId ? (
                <IdAllocationField
                    allocation={tenantAllocation}
                    label={t('links.accountInvites.tenantId', 'Träger-ID')}
                />
            ) : (
                <M3NumberField
                    label={t('links.accountInvites.tenantId', 'Träger-ID')}
                    min={1}
                    value={tenantId}
                    onChange={setTenantIdOverride}
                />
            )}
            {includeAgencyField && (
                <IdAllocationField
                    allocation={agencyAllocation}
                    label={t('links.accountInvites.agencyId', 'Beratungsstellen-ID')}
                />
            )}
            <SplitButton
                icon={<MailFilledIcon />}
                label={selectedTemplate?.name ?? t('links.composer.templatePlaceholder', 'E-Mail-Vorlage')}
                menu={templateMenu}
                menuLabel={t('links.composer.templateMenuLabel', 'E-Mail-Vorlage wählen')}
                variant="tonal"
            />
            {/* Filled primary is reserved for the selected item / main CTA; every
                other resting state is tonal M3 secondary (owner call). The icon
                stays in both states — a send button without its glyph was the
                "icons are missing" note. */}
            <SplitButton
                icon={bulkMode ? <SelectAllIcon fontSize="small" /> : <SendFilledIcon />}
                label={bulkMode ? String(selectionCount) : singleSendLabel}
                mainDisabled={!sendReady || submitting}
                menu={sendMenu}
                menuLabel={t('links.composer.sendMenuLabel', 'Sendeoptionen')}
                title={bulkMode ? bulkSendLabel : undefined}
                // Filled primary is the single-send CTA. The selection counter stays
                // tonal secondary even when it is ready to fire (Figma 1165:16407
                // selection variant): it is a state display with actions hanging off
                // it, not the page's call to action.
                variant={!bulkMode && sendReady ? 'primary' : 'secondary'}
                collapseLabel={t('links.bulk.clearSelection', 'Auswahl aufheben')}
                onClick={bulkMode ? onBulkSend : handleSend}
                onCollapse={bulkMode ? onClearSelection : undefined}
            />
        </GlobalSearchBar>
    );
};

export default InviteComposer;
