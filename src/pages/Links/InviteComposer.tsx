import { useCallback, useEffect, useMemo, useState, type FocusEvent, type ReactNode } from 'react';
import { DeleteOutlined, DownloadOutlined, MoreOutlined, UploadOutlined } from '@ant-design/icons';
import { message, Upload, type MenuProps } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
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
import { CollapsibleField } from '../../components/CollapsibleField';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';
import { FloatingLabelSelect } from '../../components/FloatingLabelSelect';
import {
    IdAllocationField,
    useIdAllocation,
    type IdUnitOption,
    type IdUnitSearch,
    type UseIdAllocationResult,
} from '../../components/IdAllocationField';
import { M3Tooltip } from '../../components/M3Tooltip';
import { GlobalSearchBar, GlobalSearchMenu } from '../../components/GlobalSearch';
import { SplitButton } from '../../components/GlobalSearch/SplitButton';
import { TemplateSplitButton } from '../../components/PlaceholderTemplate';
import { parseInviteCsv, type ParseInviteCsvResult } from './csv/parseInviteCsv';
import { downloadInviteCsvTemplate } from './csv/inviteCsvTemplate';
import { ReactComponent as MailIcon } from '../../resources/img/svg/oriso/mail_24px.svg';
import { ReactComponent as MailFilledIcon } from '../../resources/img/svg/oriso/mail_filled_24px.svg';
import { ReactComponent as FileSaveIcon } from '../../resources/img/svg/oriso/file_save_24px.svg';
import {
    BAR_DEFAULT_TOPIC_PERMISSION,
    ROLE_LABEL_KEYS,
    rolesForViewer,
    TOPIC_PERMISSION_LABEL_KEYS,
    TOPIC_PERMISSIONS,
    type InviteRole,
    type InviteViewerScope,
    type TopicPermission,
} from './inviteModel';
import styles from './inviteComposer.module.scss';

/**
 * `direct` = create the invite AND send the templated e-mail;
 * `createOnly` = create the recipient without sending (the API supports this
 * by simply omitting `templateId`).
 */
export type InviteSendMode = 'direct' | 'createOnly';

/**
 * What a create attempt did. `true`/`false` keep the original success/failure
 * contract; `'emailTaken'` is the P3 case that the composer renders inline on
 * the e-mail field rather than as a global toast.
 */
export type InviteSubmitOutcome = boolean | 'emailTaken';

export type { InviteRole, InviteViewerScope, TopicPermission } from './inviteModel';

/** Whether an ID field points at a unit that already exists or one the invite creates. */
export type InviteUnitTarget = 'new' | 'existing';
export { INVITE_ROLES, rolesForViewer } from './inviteModel';

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
    /** Validated but not sent yet: the backend does not take a role. */
    role?: InviteRole;
    /** Counsellors only; not sent until the backend takes `topicPermission`. */
    topicPermission?: TopicPermission;
    tenantTarget?: InviteUnitTarget;
    agencyTarget?: InviteUnitTarget;
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
    /**
     * Resolve `true` on success — the composer then clears its fields.
     * Resolve `'emailTaken'` when the backend refused the address because it
     * already belongs to a registered user (409 + `X-Reason:
     * EMAIL_NOT_AVAILABLE`, P3): the composer then keeps every value and marks
     * the e-mail field inline instead of clearing the row.
     */
    onSubmit: (values: InviteComposerValues) => Promise<InviteSubmitOutcome> | InviteSubmitOutcome;
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
    /** Drives the locks and the offered roles. Default `platform`. */
    viewerScope?: InviteViewerScope;
    /** The viewer's own Träger — shown locked for tenant and agency admins. */
    ownTenant?: IdUnitOption;
    /** The viewer's own Beratungsstelle — shown locked for agency admins. */
    ownAgency?: IdUnitOption;
    /** Role preselected in the "Rolle" field (the tab's target role in the app). */
    defaultRole?: InviteRole;
    /** Stories only: the app shows "Rolle" and "Themen selbst" disabled until the backend takes them. */
    placeholdersEnabled?: boolean;
    /** Without it, the Träger menu offers only "Neu" and typed numbers. */
    searchTenants?: IdUnitSearch;
    /** Agency search; receives the currently chosen Träger so results can be scoped to it. */
    searchAgencies?: (query: string, context: { tenantId?: number }) => Promise<IdUnitOption[]> | IdUnitOption[];
    /** Number lookups for the ID fields; `null` = no such unit. */
    resolveTenant?: (id: number) => Promise<IdUnitOption | null>;
    resolveAgency?: (id: number) => Promise<IdUnitOption | null>;
    /** Defaults to `requireTenantId`; otherwise the field points at an existing Träger. */
    tenantAllowCreate?: boolean;
    /** Prefill; valid prefilled fields start collapsed. */
    initialValues?: Partial<
        Pick<InviteComposerValues, 'recipientEmail' | 'firstName' | 'lastName' | 'role' | 'topicPermission'>
    > & { tenant?: IdUnitOption; agency?: IdUnitOption };
    className?: string;
}

type CollapsibleKey = 'email' | 'firstName' | 'lastName' | 'role' | 'tenant' | 'agency' | 'topics' | 'template';

// Select fields have no typing phase, so they collapse as soon as a value is chosen.
const SELECT_KEYS: CollapsibleKey[] = ['role', 'topics', 'template'];

/** Select option with a one-line explanation under its title (`description` rides along in the option data). */
const renderOptionWithHint = (option: { label?: ReactNode; data: DefaultOptionType }): ReactNode => {
    const description = typeof option.data.description === 'string' ? option.data.description : undefined;
    return description ? (
        <span className={styles.optionWithHint}>
            <span className={styles.optionTitle}>{option.label}</span>
            <span className={styles.optionHint}>{description}</span>
        </span>
    ) : (
        option.label
    );
};

const isNewUnit = (allocation: UseIdAllocationResult) => allocation.mode !== 'existing';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The tenant id space does not accept `EXISTING` yet; the agency space does.
const allocationModeOf = (allocation: UseIdAllocationResult): AllocationMode => {
    if (allocation.mode === 'existing') return 'EXISTING';
    return allocation.mode === 'auto' ? 'AUTO' : 'MANUAL';
};

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
    viewerScope = 'platform',
    ownTenant,
    ownAgency,
    defaultRole,
    placeholdersEnabled = false,
    searchTenants,
    searchAgencies,
    resolveTenant,
    resolveAgency,
    tenantAllowCreate = requireTenantId,
    initialValues,
    className,
}: InviteComposerProps) => {
    const { t } = useTranslation();
    const [recipientEmail, setRecipientEmail] = useState(initialValues?.recipientEmail ?? '');
    const [emailTouched, setEmailTouched] = useState(false);
    // P3: the address the backend last refused as already registered, normalized.
    // Kept as a value (not a flag) so simply editing the field clears the error
    // and re-typing the same address brings it straight back.
    const [emailTakenAddress, setEmailTakenAddress] = useState<string | null>(null);
    const [firstName, setFirstName] = useState(initialValues?.firstName ?? '');
    const [lastName, setLastName] = useState(initialValues?.lastName ?? '');
    const [sendMode, setSendMode] = useState<InviteSendMode>(() => readPersistedSendMode(persistKey));

    const tenantLocked = viewerScope !== 'platform';
    const agencyLocked = viewerScope === 'agency';
    const lockedTenant = tenantLocked ? ownTenant : undefined;
    const lockedAgency = agencyLocked ? ownAgency : undefined;
    // Outside the Träger tab the field names an EXISTING Träger, prefilled with the admin's own.
    const fixedTenant =
        lockedTenant ?? initialValues?.tenant ?? (initialTenantId != null ? { id: initialTenantId } : undefined);
    const initialTenantUnit = tenantAllowCreate && !tenantLocked ? initialValues?.tenant : fixedTenant;
    const initialAgencyUnit = lockedAgency ?? initialValues?.agency;

    const roleOptions = rolesForViewer(viewerScope);
    const [role, setRole] = useState<InviteRole>(() => {
        const wanted = initialValues?.role ?? defaultRole ?? roleOptions[0];
        return roleOptions.includes(wanted) ? wanted : roleOptions[0];
    });
    // Which select-type field's menu is open (opened directly from its pill).
    const [openSelect, setOpenSelect] = useState<CollapsibleKey | null>(null);
    const [topicPermission, setTopicPermission] = useState<TopicPermission>(
        initialValues?.topicPermission ?? BAR_DEFAULT_TOPIC_PERMISSION,
    );

    // Träger tab (#570): the Träger-ID is allocated, not guessed — visible Auto
    // default, deliberate manual mode with authoritative availability states.
    // The counsellor tab's Beratungsstellen-ID follows the same contract in the
    // agency id space. Both hooks always run (rules of hooks); an unused one
    // stays idle and never issues a request.
    const tenantAllocation = useIdAllocation({
        client: tenantIdAllocation ?? tenantIdAllocationClient,
        initialUnit: initialTenantUnit,
    });
    const agencyAllocation = useIdAllocation({
        client: agencyIdAllocation ?? agencyIdAllocationClient,
        initialUnit: initialAgencyUnit,
    });

    // A lock that arrives (or changes) after the first render still wins.
    const { selectExisting: selectExistingTenant } = tenantAllocation;
    const { selectExisting: selectExistingAgency } = agencyAllocation;
    useEffect(() => {
        if (lockedTenant) selectExistingTenant(lockedTenant);
    }, [lockedTenant?.id, lockedTenant?.name]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (lockedAgency) selectExistingAgency(lockedAgency);
    }, [lockedAgency?.id, lockedAgency?.name]); // eslint-disable-line react-hooks/exhaustive-deps

    const tenantId = tenantAllocation.value;
    const showAgencyField = includeAgencyField && role !== 'TENANT_ADMIN';
    const showTopicsToggle = showAgencyField && role === 'COUNSELLOR';

    const searchAgenciesInTenant = useCallback(
        (query: string) => (searchAgencies ? searchAgencies(query, { tenantId }) : []),
        [searchAgencies, tenantId],
    );

    const activeTemplates = useMemo(() => templates.filter((template) => template.active), [templates]);
    const selectedTemplate = activeTemplates.find((template) => template.id === templateId);

    const emailValid = EMAIL_PATTERN.test(recipientEmail.trim());
    // P3: the create call itself is the authority (it is the only admin-authorised
    // place that may answer this), so the block lasts exactly as long as the
    // refused address stays in the field.
    const emailTaken = emailTakenAddress !== null && recipientEmail.trim().toLowerCase() === emailTakenAddress;
    // Owner request (#893, live finding): the refusal was too subtle to notice.
    // The field-level text now says WHAT happened and WHAT TO DO — and it stays
    // under the input for as long as the refused address is in the field.
    // Deliberately generic: the backend's EMAIL_NOT_AVAILABLE covers an address
    // with an existing INVITE as well as one belonging to a registered ACCOUNT
    // (no invite row), and this state is fed only by that 409 — the client
    // cannot tell the two apart, so the text must not promise a resend.
    const emailTakenMessage = t(
        'links.composer.emailTaken',
        'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
    );
    const tenantIdValid = !requireTenantId || tenantAllocation.canSubmit;
    const agencyIdValid = !showAgencyField || agencyAllocation.canSubmit;
    const templateValid = sendMode === 'createOnly' || selectedTemplate != null;
    // Counsellor invites provision a person (#384): without names the invite
    // cannot create a usable counsellor account, so the send button stays off.
    const namesValid = !requireNames || (firstName.trim().length > 0 && lastName.trim().length > 0);
    const isValid = emailValid && !emailTaken && tenantIdValid && agencyIdValid && templateValid && namesValid;
    const showEmailError = emailTouched && recipientEmail.length > 0 && !emailValid;

    const fieldValid: Record<CollapsibleKey, boolean> = {
        email: emailValid && !emailTaken,
        firstName: firstName.trim().length > 0,
        lastName: lastName.trim().length > 0,
        tenant: tenantAllowCreate ? tenantAllocation.canSubmit : tenantAllocation.mode === 'existing',
        agency: agencyAllocation.canSubmit,
        role: true,
        topics: true,
        template: selectedTemplate != null,
    };
    const [collapsedKeys, setCollapsedKeys] = useState<Set<CollapsibleKey>>(() => {
        const initial = new Set<CollapsibleKey>();
        if (initialValues?.recipientEmail && EMAIL_PATTERN.test(initialValues.recipientEmail.trim()))
            initial.add('email');
        if (initialValues?.firstName?.trim()) initial.add('firstName');
        if (initialValues?.lastName?.trim()) initial.add('lastName');
        if (initialValues?.tenant && !tenantLocked) initial.add('tenant');
        if (initialValues?.agency && !agencyLocked) initial.add('agency');
        // A preselected role / topic option / template is a chosen value: pill from the start.
        SELECT_KEYS.forEach((key) => initial.add(key));
        return initial;
    });
    const isCollapsed = (key: CollapsibleKey) => collapsedKeys.has(key) && fieldValid[key];
    const collapseIfValid = (key: CollapsibleKey, valid: boolean) => {
        if (!valid) return;
        setCollapsedKeys((keys) => new Set(keys).add(key));
    };
    const expand = (key: CollapsibleKey) =>
        setCollapsedKeys((keys) => {
            const next = new Set(keys);
            next.delete(key);
            return next;
        });

    // "Einladen" = into a unit that exists; "Anlegen & einladen" = the invite
    // also creates the Träger / Beratungsstelle (Auto or a free number).
    const createsUnit =
        (showAgencyField && isNewUnit(agencyAllocation)) ||
        (tenantAllowCreate && !tenantLocked && isNewUnit(tenantAllocation));
    const unitLabel = (allocation: UseIdAllocationResult) => {
        if (allocation.mode === 'existing' && allocation.unit) {
            return allocation.unit.name
                ? `${allocation.unit.name} (${allocation.unit.id})`
                : String(allocation.unit.id);
        }
        return allocation.mode === 'auto'
            ? t('idAllocationField.new', 'Neu')
            : t('links.composer.newWithNumber', 'Neu, Nr. {{id}}', { id: allocation.value });
    };
    const roleLabel = (value: InviteRole) => t(...ROLE_LABEL_KEYS[value]);
    const topicTitle = (value: TopicPermission) => t(...TOPIC_PERMISSION_LABEL_KEYS[value].title);
    const topicDescription = (value: TopicPermission) => t(...TOPIC_PERMISSION_LABEL_KEYS[value].description);
    const collapse = (key: CollapsibleKey) => setCollapsedKeys((keys) => new Set(keys).add(key));

    // Select dropdowns render in a portal outside the row, so picking an option
    // never counts as focus moving on to another field.
    const handleRowFocus = (event: FocusEvent<HTMLDivElement>) => {
        const focusedKey = (event.target as HTMLElement).closest<HTMLElement>('[data-field-key]')?.dataset.fieldKey;
        SELECT_KEYS.forEach((key) => {
            if (key !== focusedKey && !collapsedKeys.has(key)) collapse(key);
        });
    };
    const placeholderTooltip = placeholdersEnabled ? '' : t('links.composer.comingWith1026', 'Kommt mit #1026');

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
        if (emailTaken) {
            return t(
                'links.composer.blocked.emailTaken',
                'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
            );
        }
        if (!namesValid) {
            return t('links.composer.blocked.names', 'Bitte Vorname und Name eingeben.');
        }
        if (!tenantIdValid) {
            return t(
                'links.composer.blocked.tenant',
                'Bitte einen Träger wählen: bestehend, freie Nummer oder „Neu anlegen“.',
            );
        }
        if (!agencyIdValid) {
            return t(
                'links.composer.blocked.agency',
                'Bitte eine Beratungsstelle wählen: bestehend, freie Nummer oder „Neu anlegen“.',
            );
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

    const agencyTarget: InviteUnitTarget = isNewUnit(agencyAllocation) ? 'new' : 'existing';

    const handleSend = async () => {
        if (!isValid || submitting) {
            return;
        }

        const outcome = await onSubmit({
            recipientEmail: recipientEmail.trim(),
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            // AUTO pins no id in the browser — the backend assigns the smallest free one.
            tenantId,
            tenantIdAllocationMode: tenantAllowCreate && !tenantLocked ? allocationModeOf(tenantAllocation) : undefined,
            agencyId: showAgencyField ? agencyAllocation.value : undefined,
            agencyIdAllocationMode: showAgencyField ? allocationModeOf(agencyAllocation) : undefined,
            templateId: sendMode === 'direct' ? templateId : undefined,
            sendMode,
            role,
            topicPermission: showTopicsToggle ? topicPermission : undefined,
            tenantTarget: isNewUnit(tenantAllocation) && tenantAllowCreate ? 'new' : 'existing',
            agencyTarget: showAgencyField ? agencyTarget : undefined,
        });

        if (outcome === 'emailTaken') {
            // Keep everything the admin typed; only the address needs correcting.
            setEmailTakenAddress(recipientEmail.trim().toLowerCase());
            setEmailTouched(true);
            return;
        }

        if (outcome) {
            setRecipientEmail('');
            setEmailTouched(false);
            setEmailTakenAddress(null);
            setFirstName('');
            setLastName('');
            setCollapsedKeys(new Set(SELECT_KEYS));
            // The next invite starts with no deliberate number choice again —
            // except where the field is pinned (lock / existing-only Träger).
            if (fixedTenant && !(tenantAllowCreate && !tenantLocked)) tenantAllocation.selectExisting(fixedTenant);
            else tenantAllocation.resetToAuto();
            if (lockedAgency) agencyAllocation.selectExisting(lockedAgency);
            else agencyAllocation.resetToAuto();
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
    const csvTargetLabel = t('links.csvImport.col.target', 'Ziel');

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
                                        csvTargetLabel,
                                        t('links.composer.role', 'Rolle'),
                                        t('links.composer.template', 'Vorlage'),
                                        t('links.composer.topics', 'Themen & Fachbereiche'),
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
                        target: csvTargetLabel,
                        role: t('links.composer.role', 'Rolle'),
                        template: t('links.composer.template', 'Vorlage'),
                        topicPermission: t('links.composer.topics', 'Themen & Fachbereiche'),
                    },
                    t('links.csvImport.templateFileName', 'oriso-einladungen-vorlage.csv'),
                    // The example file speaks German column values on purpose: the
                    // parser accepts them in any UI language.
                    {
                        role: ROLE_LABEL_KEYS[defaultRole ?? (requireTenantId ? 'TENANT_ADMIN' : 'COUNSELLOR')][1],
                        idKind: requireTenantId ? 'tenant' : 'agency',
                    },
                );
            }
        },
    };

    // "Empfänger nur anlegen" sends no mail, so it keeps its own label.
    const directSendLabel = createsUnit
        ? t('links.composer.sendCreateAndInvite', 'Anlegen & einladen')
        : t('links.composer.sendInvite', 'Einladen');
    const singleSendLabel =
        sendMode === 'direct' ? directSendLabel : t('links.composer.sendCreateOnly', 'Empfänger nur anlegen');
    const bulkSendLabel = t('links.bulk.sendSelected', '{{count}} ausgewählte senden', { count: selectionCount });

    /**
     * Glyph on the main send segment (#574). It has to say what pressing the
     * button DOES, which is the one thing the two send modes differ in: `direct`
     * puts an e-mail on the wire — mail glyph, filled once the action is live —
     * while `createOnly` only files the recipient away, so it takes the same file
     * glyph its own menu entry carries. The paper plane said "send" for both.
     */
    const renderSendGlyph = () => {
        if (sendMode === 'createOnly') {
            return <FileSaveIcon data-glyph="file-save" data-testid="composer-send-icon" />;
        }
        if (sendReady) {
            return <MailFilledIcon data-glyph="mail-filled" data-testid="composer-send-icon" />;
        }
        return <MailIcon data-glyph="mail" data-testid="composer-send-icon" />;
    };

    const sendMenu: MenuProps = {
        items: [
            {
                key: 'direct',
                // Same glyph rule as the button (#574): mail, filled while this
                // is the mode that will actually fire.
                icon:
                    sendMode === 'direct' ? (
                        <MailFilledIcon aria-hidden className={styles.menuIcon} data-glyph="mail-filled" />
                    ) : (
                        <MailIcon aria-hidden className={styles.menuIcon} data-glyph="mail" />
                    ),
                label: t('links.composer.sendDirect', 'Direkt Versenden'),
            },
            {
                key: 'createOnly',
                icon: <FileSaveIcon aria-hidden className={styles.menuIcon} data-glyph="file-save" />,
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

    const emailLabel = t('links.accountInvites.email', 'E-Mail');
    const firstNameLabel = t('links.accountInvites.firstName', 'Vorname');
    const lastNameLabel = t('links.composer.lastName', 'Name');
    const tenantLabel = t('links.composer.tenant', 'Träger');
    const agencyLabel = t('links.composer.agency', 'Beratungsstelle');
    const topicsLabel = t('links.composer.topics', 'Themen & Fachbereiche');

    // Expanding a select's pill opens its menu right away: that is all a select expands for.
    function renderSelectField<V extends string>({
        key,
        label,
        value,
        valueLabel,
        options,
        disabled,
        className: fieldClassName,
        onChange,
    }: {
        key: CollapsibleKey;
        label: string;
        value: V;
        valueLabel: string;
        options: Array<{ value: V; label: string; description?: string }>;
        disabled: boolean;
        className?: string;
        onChange: (next: V) => void;
    }) {
        const field = (
            <CollapsibleField
                collapsed={isCollapsed(key)}
                disabled={disabled}
                fieldKey={key}
                label={label}
                pillText={valueLabel}
                valueSummary={valueLabel}
                onExpand={() => {
                    expand(key);
                    setOpenSelect(key);
                }}
            >
                <FloatingLabelSelect<V>
                    className={fieldClassName}
                    disabled={disabled}
                    label={label}
                    open={openSelect === key}
                    optionRender={renderOptionWithHint}
                    options={options}
                    popupMatchSelectWidth={false}
                    value={value}
                    onChange={(next) => {
                        onChange(next);
                        setOpenSelect(null);
                        collapse(key);
                    }}
                    onOpenChange={(nextOpen) => setOpenSelect(nextOpen ? key : null)}
                />
            </CollapsibleField>
        );
        return disabled ? (
            <M3Tooltip key={key} portal placement="bottom" text={placeholderTooltip}>
                <span className={styles.placeholderSlot} tabIndex={placeholdersEnabled ? undefined : 0}>
                    {field}
                </span>
            </M3Tooltip>
        ) : (
            <span key={key} className={styles.placeholderSlot}>
                {field}
            </span>
        );
    }

    return (
        <div className={classNames(styles.composer, className)} onFocus={handleRowFocus}>
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
                <CollapsibleField
                    collapsed={isCollapsed('email')}
                    label={emailLabel}
                    valueSummary={recipientEmail.trim()}
                    onExpand={() => expand('email')}
                >
                    <FloatingLabelInput
                        autoComplete="email"
                        className={styles.emailField}
                        error={showEmailError || emailTaken}
                        // `text` + email keyboard instead of `type="email"`: only text
                        // inputs support putting the caret at the end after expanding.
                        inputMode="email"
                        label={emailLabel}
                        name="recipientEmail"
                        supportingText={
                            // eslint-disable-next-line no-nested-ternary -- three mutually exclusive field states
                            emailTaken
                                ? emailTakenMessage
                                : showEmailError
                                ? t('links.composer.emailInvalid', 'Bitte gültige E-Mail-Adresse eingeben.')
                                : undefined
                        }
                        type="text"
                        value={recipientEmail}
                        onBlur={() => {
                            setEmailTouched(true);
                            collapseIfValid('email', fieldValid.email);
                        }}
                        onChange={(event) => setRecipientEmail(event.target.value)}
                    />
                </CollapsibleField>
                <CollapsibleField
                    collapsed={isCollapsed('firstName')}
                    label={firstNameLabel}
                    valueSummary={firstName.trim()}
                    onExpand={() => expand('firstName')}
                >
                    <FloatingLabelInput
                        className={styles.nameField}
                        label={firstNameLabel}
                        name="firstName"
                        value={firstName}
                        onBlur={() => collapseIfValid('firstName', fieldValid.firstName)}
                        onChange={(event) => setFirstName(event.target.value)}
                    />
                </CollapsibleField>
                <CollapsibleField
                    collapsed={isCollapsed('lastName')}
                    label={lastNameLabel}
                    valueSummary={lastName.trim()}
                    onExpand={() => expand('lastName')}
                >
                    <FloatingLabelInput
                        className={classNames(styles.nameField, styles.lastNameField)}
                        label={lastNameLabel}
                        name="lastName"
                        value={lastName}
                        onBlur={() => collapseIfValid('lastName', fieldValid.lastName)}
                        onChange={(event) => setLastName(event.target.value)}
                    />
                </CollapsibleField>
                {/* Disabled in the app until the backend takes a role; live in the stories. */}
                {renderSelectField<InviteRole>({
                    key: 'role',
                    label: t('links.composer.role', 'Rolle'),
                    value: role,
                    valueLabel: roleLabel(role),
                    options: roleOptions.map((option) => ({ value: option, label: roleLabel(option) })),
                    disabled: !placeholdersEnabled || roleOptions.length < 2,
                    className: styles.roleField,
                    onChange: setRole,
                })}
                <CollapsibleField
                    collapsed={!tenantLocked && isCollapsed('tenant')}
                    label={tenantLabel}
                    valueSummary={unitLabel(tenantAllocation)}
                    onExpand={() => expand('tenant')}
                >
                    <IdAllocationField
                        allocation={tenantAllocation}
                        allowCreate={tenantAllowCreate && !tenantLocked}
                        label={tenantLabel}
                        locked={tenantLocked}
                        resolveUnit={resolveTenant}
                        searchUnits={searchTenants}
                        onBlur={() => collapseIfValid('tenant', fieldValid.tenant)}
                    />
                </CollapsibleField>
                {showAgencyField && (
                    <CollapsibleField
                        collapsed={!agencyLocked && isCollapsed('agency')}
                        label={agencyLabel}
                        valueSummary={unitLabel(agencyAllocation)}
                        onExpand={() => expand('agency')}
                    >
                        <IdAllocationField
                            allocation={agencyAllocation}
                            label={agencyLabel}
                            locked={agencyLocked}
                            resolveUnit={resolveAgency}
                            searchUnits={searchAgencies ? searchAgenciesInTenant : undefined}
                            onBlur={() => collapseIfValid('agency', fieldValid.agency)}
                        />
                    </CollapsibleField>
                )}
                {showTopicsToggle &&
                    renderSelectField<TopicPermission>({
                        key: 'topics',
                        label: topicsLabel,
                        value: topicPermission,
                        valueLabel: topicTitle(topicPermission),
                        options: TOPIC_PERMISSIONS.map((option) => ({
                            value: option,
                            label: topicTitle(option),
                            description: topicDescription(option),
                        })),
                        disabled: !placeholdersEnabled,
                        className: styles.topicsField,
                        onChange: setTopicPermission,
                    })}
                {/* #746: the module's template split button — main segment opens the
                    manage/pick dialog (as before), the chevron menu now switches the
                    active template in place, check-marked like in the editor. */}
                <CollapsibleField
                    collapsed={isCollapsed('template')}
                    fieldKey="template"
                    label={t('links.composer.template', 'Vorlage')}
                    pillText={selectedTemplate?.name}
                    valueSummary={selectedTemplate?.name}
                    onExpand={() => expand('template')}
                >
                    <TemplateSplitButton
                        activeTemplateId={selectedTemplate?.id}
                        templates={activeTemplates}
                        onCreateFromTemplate={
                            onCreateFromTemplate &&
                            ((id) => onCreateFromTemplate(typeof id === 'number' ? id : Number(id)))
                        }
                        onMainClick={() => onManageTemplates('list')}
                        onSelectTemplate={(id) => {
                            onSelectTemplate?.(typeof id === 'number' ? id : Number(id));
                            collapse('template');
                        }}
                        // Match the row's 56px SplitButtons; the chooser defaults to the legal editors' 40px pill.
                        size="medium"
                    />
                </CollapsibleField>
                {/* Filled primary is reserved for the selected item / main CTA; every
                other resting state is tonal M3 secondary (owner call). The icon
                stays in both states — a send button without its glyph was the
                "icons are missing" note. */}
                <SplitButton
                    icon={bulkMode ? <SelectAllIcon fontSize="small" /> : renderSendGlyph()}
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
