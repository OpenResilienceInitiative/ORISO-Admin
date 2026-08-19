import { useMemo, useState } from 'react';
import { DeleteOutlined, DownloadOutlined, MoreOutlined, UploadOutlined } from '@ant-design/icons';
import { message, Upload, type MenuProps } from 'antd';
import classNames from 'classnames';
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
import { M3NumberField } from '../../components/M3NumberField';
import { TemplateSplitButton } from '../../components/PlaceholderTemplate';
import { parseInviteCsv, type ParseInviteCsvResult } from './csv/parseInviteCsv';
import { downloadInviteCsvTemplate } from './csv/inviteCsvTemplate';
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
    /** Templates of this tab's kind; active ones gate send and label the template pill. */
    templates: InviteEmailTemplateDTO[];
    /** Currently selected template (lifted so the tab can reuse it, e.g. for resend). */
    templateId?: number;
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
    requireNames?: boolean;
    submitting?: boolean;
    /** Discriminator for the persisted send mode (one per tab), e.g. the target role. */
    persistKey: string;
    /** Resolve `true` on success — the composer then clears its fields. */
    onSubmit: (values: InviteComposerValues) => Promise<boolean> | boolean;
    /** Open the EmailTemplatesDialog in the requested view (`list` is the picker). */
    onManageTemplates: (intent: 'create' | 'delete' | 'list') => void;
    /**
     * #746: the template pill's chevron menu switches the active template
     * directly (module split-button semantics); the selection stays lifted in
     * the tab, same as picking in the dialog.
     */
    onSelectTemplate?: (templateId: number) => void;
    /**
     * "Neu aus „X"" in the pill menu: start a new template prefilled from the
     * given one (opens the dialog's create view with that source). Omit to
     * hide the menu's create group.
     */
    onCreateFromTemplate?: (templateId: number) => void;
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
    /**
     * Toolbar search (A4/#376). Controlled by the tab, which owns the invite
     * list the query filters — the composer only renders the control. Without
     * both props the search pill stays uncontrolled and, as before, inert.
     */
    searchQuery?: string;
    onSearchQueryChange?: (query: string) => void;
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
 * number field (auto-suggest preserved), a tonal template pill that opens the
 * EmailTemplatesDialog picker, and the send split button.
 * The send button rests `outlined` + disabled and only turns `primary` once
 * everything is validly filled; its chevron switches the persisted send mode
 * ("Direkt Versenden" vs "Empfänger nur anlegen", saved per tab in
 * localStorage until the admin changes it again).
 */
export const InviteComposer = ({
    templates,
    templateId,
    requireTenantId = false,
    initialTenantId,
    tenantIdAllocation,
    agencyIdAllocation,
    includeAgencyField = false,
    requireNames = false,
    submitting = false,
    persistKey,
    onSubmit,
    onManageTemplates,
    onSelectTemplate,
    onCreateFromTemplate,
    onCsvParsed,
    selectionCount = 0,
    onBulkSend,
    onClearSelection,
    onDeleteSelected,
    searchPlaceholder,
    searchQuery,
    onSearchQueryChange,
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
    // Counsellor invites provision a person (#384): without names the invite
    // cannot create a usable counsellor account, so the send button stays off.
    const namesValid = !requireNames || (firstName.trim().length > 0 && lastName.trim().length > 0);
    const isValid = emailValid && tenantIdValid && agencyIdValid && templateValid && namesValid;
    const showEmailError = emailTouched && recipientEmail.length > 0 && !emailValid;

    // Bulk mode (#316): while rows are checked, sending acts on the selection
    // (resend per row) instead of creating a new invite. Resending always mails,
    // so readiness is gated on a chosen template — independent of the persisted
    // send mode, which only applies to the single-create flow.
    const bulkMode = selectionCount > 0 && onBulkSend != null;
    const bulkValid = selectedTemplate != null;
    const sendReady = bulkMode ? bulkValid : isValid;

    /*
     * #713: a greyed-out primary action that says nothing is itself the bug.
     * The rule here is "disable rather than hide, but always explain", so the
     * composer names the FIRST unmet precondition in the order an admin fills
     * the row. The most common one on a live tenant is the template: the tab
     * only preselects when exactly one template of its kind is active, so with
     * two active templates nothing is chosen and send rests off.
     */
    const sendBlockedReason = (() => {
        if (sendReady || submitting) return undefined;
        if (bulkMode) {
            return t('links.composer.blocked.template', 'Bitte zuerst eine E-Mail-Vorlage auswählen.');
        }
        if (!emailValid) {
            return t('links.composer.blocked.email', 'Bitte eine gültige E-Mail-Adresse eingeben.');
        }
        if (!namesValid) {
            return t('links.composer.blocked.names', 'Bitte Vorname und Name eingeben.');
        }
        if (!tenantIdValid) {
            return t('links.composer.blocked.tenantId', 'Bitte eine freie Träger-ID wählen (oder Auto).');
        }
        if (!agencyIdValid) {
            return t('links.composer.blocked.agencyId', 'Bitte eine freie Beratungsstellen-ID wählen (oder Auto).');
        }
        if (!templateValid) {
            return t('links.composer.blocked.template', 'Bitte zuerst eine E-Mail-Vorlage auswählen.');
        }
        return undefined;
    })();
    const sendHintId = `invite-composer-send-hint-${persistKey}`;

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
        <div className={classNames(styles.composer, className)}>
            <GlobalSearchBar
                leading={moreButton}
                searchPlaceholder={searchPlaceholder}
                // `onSearch` (Enter / magnifier) resolves to the same handler as
                // `onSearchChange`: the list filters as you type, so submitting
                // is a no-op rather than a second, different search.
                value={onSearchQueryChange ? searchQuery ?? '' : undefined}
                onSearch={onSearchQueryChange}
                onSearchChange={onSearchQueryChange}
            >
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
                    className={classNames(styles.nameField, styles.lastNameField)}
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
                {/* #746: the module's template split button — main segment opens the
                    manage/pick dialog (as before), the chevron menu now switches the
                    active template in place, check-marked like in the editor. */}
                <TemplateSplitButton
                    activeTemplateId={selectedTemplate?.id}
                    templates={activeTemplates}
                    onCreateFromTemplate={
                        onCreateFromTemplate && ((id) => onCreateFromTemplate(typeof id === 'number' ? id : Number(id)))
                    }
                    onMainClick={() => onManageTemplates('list')}
                    onSelectTemplate={(id) => onSelectTemplate?.(typeof id === 'number' ? id : Number(id))}
                />
                {/* Filled primary is reserved for the selected item / main CTA; every
                other resting state is tonal M3 secondary (owner call). The icon
                stays in both states — a send button without its glyph was the
                "icons are missing" note. */}
                <SplitButton
                    icon={bulkMode ? <SelectAllIcon fontSize="small" /> : <SendFilledIcon />}
                    label={bulkMode ? String(selectionCount) : singleSendLabel}
                    mainDisabled={!sendReady || submitting}
                    mainDescribedBy={sendBlockedReason ? sendHintId : undefined}
                    // The send-mode menu switches "Direkt Versenden" vs "Empfänger
                    // nur anlegen", which only ever applies to the single-create
                    // flow (see handleSend). In bulk mode it changed nothing and
                    // only put a second, inert chevron next to the collapse one.
                    menu={bulkMode ? undefined : sendMenu}
                    menuLabel={t('links.composer.sendMenuLabel', 'Sendeoptionen')}
                    title={bulkMode ? bulkSendLabel : undefined}
                    // Filled primary is the single-send CTA; the selection counter
                    // stays tonal secondary even when ready (Figma 1165:16407
                    // selection variant) — a state display with actions hanging off
                    // it, not the page's call to action. What BOTH share: a filled
                    // shape is a promise that pressing does something. The tonal
                    // disabled rule keeps `opacity: 1`, so a dead tonal counter was
                    // pixel-identical to a live one ("Number counter Button
                    // funktioniert hier nicht"). Not-ready therefore rests
                    // `outlined` — colour arrives with the ability to fire.
                    variant={(() => {
                        if (!sendReady) return 'outlined';
                        return bulkMode ? 'secondary' : 'primary';
                    })()}
                    collapseLabel={t('links.bulk.clearSelection', 'Auswahl aufheben')}
                    onClick={bulkMode ? onBulkSend : handleSend}
                    onCollapse={bulkMode ? onClearSelection : undefined}
                />
            </GlobalSearchBar>
            {sendBlockedReason && (
                <p className={styles.sendHint} id={sendHintId} role="status">
                    {sendBlockedReason}
                </p>
            )}
        </div>
    );
};

export default InviteComposer;
