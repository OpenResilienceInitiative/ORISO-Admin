import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { DeleteOutlined, DownloadOutlined, MoreOutlined, UploadOutlined } from '@ant-design/icons';
import { message, Upload, type MenuProps } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import ForwardToInboxOutlinedIcon from '@mui/icons-material/ForwardToInboxOutlined';
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
import { M3Button } from '../../components/M3Button';
import { GlobalSearchBar, GlobalSearchMenu } from '../../components/GlobalSearch';
import { SplitButton } from '../../components/GlobalSearch/SplitButton';
import { TemplateSplitButton } from '../../components/PlaceholderTemplate';
import { parseInviteCsv, type ParseInviteCsvResult } from './csv/parseInviteCsv';
import { downloadInviteCsvTemplate } from './csv/inviteCsvTemplate';
import { ReactComponent as MailIcon } from '../../resources/img/svg/oriso/mail_24px.svg';
import { ReactComponent as MailFilledIcon } from '../../resources/img/svg/oriso/mail_filled_24px.svg';
import { ReactComponent as FileSaveIcon } from '../../resources/img/svg/oriso/file_save_24px.svg';
import {
    ALSO_COUNSELLOR_LABEL_KEYS,
    DEFAULT_TOPIC_PERMISSION,
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
export type InviteSubmitOutcome = boolean | 'emailTaken' | InviteCreated;

/** What the bar needs from a created invite: the numbers the server assigned. */
export interface InviteCreated {
    agencyId?: number | null;
    tenantId?: number | null;
}

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
    role?: InviteRole;
    /** Agency admins only: "Berät auch" (backend default true). */
    alsoCounsellor?: boolean;
    /** Counsellors only. */
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
    /** Shows the CSV entries disabled with this reason instead of hiding them. */
    csvImportBlockedReason?: string;
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
    /** Locks the field for an agency admin of one agency; omit it so an admin of several picks among them. */
    ownAgency?: IdUnitOption;
    /** Role preselected in the "Rolle" field (the tab's target role in the app). */
    defaultRole?: InviteRole;
    /** Narrows the offered roles further; the Träger tab only founds new Träger. */
    allowedRoles?: InviteRole[];
    /** "Mich selbst eintragen" in the send menu, with the existing agency chosen in the bar. */
    onSelfAssign?: (agency?: IdUnitOption) => void;
    /** Without it, the Träger menu offers only "Neu" and typed numbers. */
    searchTenants?: IdUnitSearch;
    /** Agency search; receives the currently chosen Träger so results can be scoped to it. */
    searchAgencies?: (query: string, context: { tenantId?: number }) => Promise<IdUnitOption[]> | IdUnitOption[];
    /** Number lookups for the ID fields; `null` = no such unit. */
    resolveTenant?: (id: number) => Promise<IdUnitOption | null>;
    resolveAgency?: (id: number) => Promise<IdUnitOption | null>;
    /** The agency's default topic permission, for a picked unit whose search hit did not carry it. */
    loadAgencyTopicPermission?: (agencyId: number) => Promise<TopicPermission | undefined>;
    /** Defaults to `requireTenantId`; otherwise the field points at an existing Träger. */
    tenantAllowCreate?: boolean;
    /** Prefill; valid prefilled fields start collapsed. */
    initialValues?: Partial<
        Pick<
            InviteComposerValues,
            'recipientEmail' | 'firstName' | 'lastName' | 'role' | 'topicPermission' | 'alsoCounsellor'
        >
    > & { tenant?: IdUnitOption; agency?: IdUnitOption };
    className?: string;
}

type CollapsibleKey =
    | 'email'
    | 'firstName'
    | 'lastName'
    | 'role'
    | 'tenant'
    | 'agency'
    | 'alsoCounsellor'
    | 'topics'
    | 'template';

// Select fields have no typing phase, so they collapse as soon as a value is chosen.
const SELECT_KEYS: CollapsibleKey[] = ['role', 'alsoCounsellor', 'topics', 'template'];

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
    csvImportBlockedReason,
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
    allowedRoles,
    onSelfAssign,
    searchTenants,
    searchAgencies,
    resolveTenant,
    resolveAgency,
    loadAgencyTopicPermission,
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
    const [storedSendMode, setSendMode] = useState<InviteSendMode>(() => readPersistedSendMode(persistKey));
    // Unlike the send mode, "Senden & nächste" lasts for this session only and is never persisted.
    const [sendAndNext, setSendAndNext] = useState(false);
    const sendMode: InviteSendMode = sendAndNext ? 'direct' : storedSendMode;
    // Focus must wait until the cleared bar has rendered.
    const [focusEmailPending, setFocusEmailPending] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const tenantLocked = viewerScope !== 'platform';
    const agencyMayBeNew = viewerScope !== 'agency';
    const agencyLocked = viewerScope === 'agency' && ownAgency != null;
    const lockedTenant = tenantLocked ? ownTenant : undefined;
    const lockedAgency = agencyLocked ? ownAgency : undefined;
    // Outside the Träger tab the field names an EXISTING Träger, prefilled with the admin's own.
    const fixedTenant =
        lockedTenant ?? initialValues?.tenant ?? (initialTenantId != null ? { id: initialTenantId } : undefined);
    const initialTenantUnit = tenantAllowCreate && !tenantLocked ? initialValues?.tenant : fixedTenant;
    const initialAgencyUnit = lockedAgency ?? initialValues?.agency;

    const roleOptions = rolesForViewer(viewerScope).filter(
        (option) => allowedRoles == null || allowedRoles.includes(option),
    );
    const pickRole = (wanted: InviteRole | undefined) =>
        wanted != null && roleOptions.includes(wanted) ? wanted : roleOptions[0];
    const [role, setRole] = useState<InviteRole>(() => pickRole(initialValues?.role ?? defaultRole));
    // Which select-type field's menu is open (opened directly from its pill).
    const [openSelect, setOpenSelect] = useState<CollapsibleKey | null>(null);
    const [topicPermission, setTopicPermission] = useState<TopicPermission>(
        initialValues?.topicPermission ?? DEFAULT_TOPIC_PERMISSION,
    );
    const [alsoCounsellor, setAlsoCounsellor] = useState<boolean>(initialValues?.alsoCounsellor ?? true);
    // The guided BST-Admin switch covers one founding invite only, so the next
    // person is not silently a second BST-Admin.
    const [roleBeforeGuidedSwitch, setRoleBeforeGuidedSwitch] = useState<InviteRole | null>(null);

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

    useEffect(() => {
        if (!focusEmailPending) return;
        setFocusEmailPending(false);
        rootRef.current?.querySelector<HTMLInputElement>('input[name="recipientEmail"]')?.focus();
    }, [focusEmailPending]);
    // The chosen agency's default prefills the chip; the admin may still change it.
    const pickedAgency = agencyAllocation.mode === 'existing' ? agencyAllocation.unit : undefined;
    useEffect(() => {
        if (!pickedAgency) return undefined;
        if (pickedAgency.topicPermission) {
            setTopicPermission(pickedAgency.topicPermission);
            return undefined;
        }
        if (!loadAgencyTopicPermission) return undefined;
        let cancelled = false;
        loadAgencyTopicPermission(pickedAgency.id)
            .then((agencyDefault) => {
                if (!cancelled && agencyDefault) setTopicPermission(agencyDefault);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [pickedAgency?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const tenantId = tenantAllocation.value;
    const showAgencyField = includeAgencyField && role !== 'TENANT_ADMIN';
    const showTopicsToggle = showAgencyField && role === 'COUNSELLOR';
    const showAlsoCounsellor = showAgencyField && role === 'AGENCY_ADMIN';

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
    // A number reserved by an open admin invite is joined: the invite waits for that unit.
    const agencyJoinsPendingUnit =
        showAgencyField && agencyAllocation.mode === 'manual' && agencyAllocation.validation === 'reserved';
    const agencyIsNew = showAgencyField && agencyMayBeNew && isNewUnit(agencyAllocation);
    // The backend cannot infer the Träger for a Träger admin or a new Beratungsstelle.
    const tenantRequired = requireTenantId || role === 'TENANT_ADMIN' || agencyIsNew;
    const tenantMayBeNew = tenantAllowCreate && !tenantLocked;
    const tenantIdValid =
        !tenantRequired || (tenantMayBeNew ? tenantAllocation.canSubmit : tenantAllocation.mode === 'existing');
    const agencyPicked = agencyMayBeNew
        ? agencyAllocation.canSubmit || agencyJoinsPendingUnit
        : agencyAllocation.mode === 'existing';
    const agencyIdValid = !showAgencyField || agencyPicked;
    // Only a BST-Admin founds a Beratungsstelle; a counsellor may only wait for one with an open admin invite.
    const counsellorNeedsUnitAdmin =
        role === 'COUNSELLOR' &&
        agencyIsNew &&
        !agencyJoinsPendingUnit &&
        (agencyAllocation.mode === 'auto' || agencyAllocation.validation === 'available');
    const templateValid = sendMode === 'createOnly' || selectedTemplate != null;
    // Counsellor invites provision a person (#384): without names the invite
    // cannot create a usable counsellor account, so the send button stays off.
    const namesValid = !requireNames || (firstName.trim().length > 0 && lastName.trim().length > 0);
    const isValid =
        emailValid &&
        !emailTaken &&
        tenantIdValid &&
        agencyIdValid &&
        !counsellorNeedsUnitAdmin &&
        templateValid &&
        namesValid;
    const showEmailError = emailTouched && recipientEmail.length > 0 && !emailValid;

    const fieldValid: Record<CollapsibleKey, boolean> = {
        email: emailValid && !emailTaken,
        firstName: firstName.trim().length > 0,
        lastName: lastName.trim().length > 0,
        tenant: tenantAllowCreate ? tenantAllocation.canSubmit : tenantAllocation.mode === 'existing',
        agency: agencyPicked,
        role: true,
        alsoCounsellor: true,
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
        // Only a prefilled bar starts as pills; a fresh page starts expanded.
        if (initialValues) SELECT_KEYS.forEach((key) => initial.add(key));
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

    // An existing agency picked while the Träger is empty fills it in; a Träger
    // the admin already chose is never overwritten.
    const pickedAgencyUnit = agencyAllocation.mode === 'existing' ? agencyAllocation.unit : undefined;
    useEffect(() => {
        if (tenantLocked || pickedAgencyUnit?.tenantId == null) return;
        const tenantChosen =
            tenantAllocation.mode === 'existing' ||
            (tenantAllocation.mode === 'manual' && tenantAllocation.value !== undefined);
        if (tenantChosen) return;
        tenantAllocation.selectExisting({ id: pickedAgencyUnit.tenantId, name: pickedAgencyUnit.tenantName });
        setCollapsedKeys((keys) => new Set(keys).add('tenant'));
    }, [pickedAgencyUnit?.id, pickedAgencyUnit?.tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

    // "Einladen" = into a unit that exists; "Anlegen & einladen" = the invite
    // also creates the Träger / Beratungsstelle (Auto or a free number).
    const createsUnit = agencyIsNew || (tenantAllowCreate && !tenantLocked && isNewUnit(tenantAllocation));
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
            return requireTenantId
                ? t(
                      'links.composer.blocked.tenant',
                      'Bitte einen Träger wählen: bestehend, freie Nummer oder „Neu anlegen“.',
                  )
                : t('links.composer.blocked.tenantExisting', 'Bitte einen bestehenden Träger wählen.');
        }
        if (!agencyIdValid && !agencyMayBeNew) {
            return t('links.composer.blocked.ownAgency', 'Bitte eine Ihrer Beratungsstellen wählen.');
        }
        if (!agencyIdValid) {
            return t(
                'links.composer.blocked.agency',
                'Bitte eine Beratungsstelle wählen: bestehend, freie Nummer oder „Neu anlegen“.',
            );
        }
        if (counsellorNeedsUnitAdmin) {
            return t(
                'links.composer.blocked.counsellorNeedsUnitAdmin',
                'Eine neue Beratungsstelle legt nur eine BST-Admin an. Laden Sie zuerst die BST-Admin ein (Rolle „BST-Admin“, „Berät auch“), dann die Berater:innen mit derselben Nummer.',
            );
        }
        if (!templateValid) {
            return t('links.composer.blocked.template', 'Bitte zuerst eine E-Mail-Vorlage auswählen.');
        }
        return undefined;
    })();
    const sendHintId = `invite-composer-send-hint-${persistKey}`;
    // Offered only while THE reason shown is the founding rule, never in bulk mode.
    const offerAgencyAdminSwitch =
        !bulkMode &&
        counsellorNeedsUnitAdmin &&
        roleOptions.includes('AGENCY_ADMIN') &&
        emailValid &&
        !emailTaken &&
        namesValid &&
        tenantIdValid &&
        agencyIdValid;

    const changeSendMode = (mode: InviteSendMode) => {
        setSendAndNext(false);
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
            // #1026 slice 4: a picked (or locked) Träger is sent as EXISTING; the
            // Träger tab keeps AUTO/MANUAL for a NEW Träger.
            tenantIdAllocationMode:
                (tenantAllowCreate && !tenantLocked) || tenantAllocation.mode === 'existing'
                    ? allocationModeOf(tenantAllocation)
                    : undefined,
            agencyId: showAgencyField ? agencyAllocation.value : undefined,
            agencyIdAllocationMode: showAgencyField ? allocationModeOf(agencyAllocation) : undefined,
            templateId: sendMode === 'direct' ? templateId : undefined,
            sendMode,
            role,
            alsoCounsellor: showAlsoCounsellor ? alsoCounsellor : undefined,
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

        if (outcome && sendAndNext) {
            setRecipientEmail('');
            setEmailTouched(false);
            setEmailTakenAddress(null);
            setFirstName('');
            setLastName('');
            setRole(pickRole(defaultRole));
            setRoleBeforeGuidedSwitch(null);
            setAlsoCounsellor(initialValues?.alsoCounsellor ?? true);
            setCollapsedKeys(new Set<CollapsibleKey>(['tenant', 'agency', 'topics', 'template']));
            // A number this invite just reserved is re-checked: the next counsellor waits for that unit.
            // "Neu" becomes the number the server assigned, or the next person would need an admin of their own.
            const created = typeof outcome === 'object' ? outcome : undefined;
            if (tenantAllocation.mode === 'manual') tenantAllocation.setManualValue(tenantAllocation.value);
            if (agencyAllocation.mode === 'auto' && created?.agencyId != null) {
                agencyAllocation.setManualValue(created.agencyId);
            } else if (agencyAllocation.mode === 'manual') {
                agencyAllocation.setManualValue(agencyAllocation.value);
            }
            setFocusEmailPending(true);
            return;
        }

        if (outcome) {
            // The send press keeps focus in the field being edited (see the send
            // slot below). Starting over, that field must let go — otherwise its
            // type-ahead reopens over the fresh bar.
            const active = document.activeElement;
            if (active instanceof HTMLElement && rootRef.current?.contains(active)) active.blur();
            setRecipientEmail('');
            setEmailTouched(false);
            setEmailTakenAddress(null);
            setFirstName('');
            setLastName('');
            setCollapsedKeys(new Set(SELECT_KEYS));
            if (roleBeforeGuidedSwitch) {
                setRole(roleBeforeGuidedSwitch);
                setRoleBeforeGuidedSwitch(null);
            }
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
        const csvBlocked = csvImportBlockedReason != null;
        const csvLabel = (hint: string) => (
            <span className={styles.csvImportEntry}>
                <UploadOutlined aria-hidden />
                <span className={styles.csvImportLabel}>
                    {t('links.csvImport.menuEntry', 'CSV-Datei importieren')}
                    <span className={styles.csvImportHint}>{hint}</span>
                </span>
            </span>
        );
        moreMenuItems.push({
            key: 'csv-import',
            disabled: csvBlocked,
            label: csvBlocked ? (
                csvLabel(csvImportBlockedReason)
            ) : (
                <Upload accept=".csv,text/csv" beforeUpload={handleCsvFile} showUploadList={false}>
                    {/* The import expects a fixed column order, and this menu is the only place to learn it. */}
                    {csvLabel(
                        t('links.csvImport.columns', 'Spalten: {{columns}}', {
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
                        }),
                    )}
                </Upload>
            ),
        });
        moreMenuItems.push({
            key: 'csv-template',
            disabled: csvBlocked,
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
    const sendAndNextLabel = t('links.composer.sendAndNext', 'Senden & nächste');
    const sendAndNextButtonLabel = createsUnit
        ? t('links.composer.sendCreateAndInviteAndNext', 'Anlegen, einladen & nächste')
        : t('links.composer.sendInviteAndNext', 'Einladen & nächste');
    // eslint-disable-next-line no-nested-ternary -- three mutually exclusive send modes
    const singleSendLabel = sendAndNext
        ? sendAndNextButtonLabel
        : sendMode === 'direct'
        ? directSendLabel
        : t('links.composer.sendCreateOnly', 'Empfänger nur anlegen');
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
            {
                key: 'sendAndNext',
                icon: <ForwardToInboxOutlinedIcon aria-hidden className={styles.menuIcon} />,
                label: sendAndNextLabel,
            },
            // #1026 slice 3: the admin's own account instead of an e-mail invite.
            ...(onSelfAssign
                ? [
                      { type: 'divider' as const },
                      {
                          key: 'selfAssign',
                          icon: <PersonAddAltOutlinedIcon aria-hidden className={styles.menuIcon} />,
                          label: t('links.selfAssign.menuEntry', 'Mich selbst eintragen …'),
                      },
                  ]
                : []),
        ],
        selectable: true,
        selectedKeys: [sendAndNext ? 'sendAndNext' : sendMode],
        onClick: ({ key }) => {
            if (key === 'selfAssign') {
                onSelfAssign?.(agencyAllocation.mode === 'existing' ? agencyAllocation.unit : undefined);
                return;
            }
            if (key === 'sendAndNext') {
                // Session only: the persisted send mode stays what it was.
                setSendAndNext(true);
                return;
            }
            changeSendMode(key as InviteSendMode);
        },
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
        return (
            <span key={key} className={styles.placeholderSlot}>
                {field}
            </span>
        );
    }

    return (
        <div ref={rootRef} className={classNames(styles.composer, className)} onFocus={handleRowFocus}>
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
                {/* Only the roles the viewer may hand out; a single one renders locked. */}
                {renderSelectField<InviteRole>({
                    key: 'role',
                    label: t('links.composer.role', 'Rolle'),
                    value: role,
                    valueLabel: roleLabel(role),
                    options: roleOptions.map((option) => ({ value: option, label: roleLabel(option) })),
                    disabled: roleOptions.length < 2,
                    className: styles.roleField,
                    onChange: (next) => {
                        // A deliberate pick replaces the guided switch: keep it after sending.
                        setRoleBeforeGuidedSwitch(null);
                        setRole(next);
                    },
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
                            acceptTypedIds={agencyMayBeNew}
                            allocation={agencyAllocation}
                            allowCreate={agencyMayBeNew}
                            label={agencyLabel}
                            locked={agencyLocked}
                            reservedJoinsPendingUnit
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
                        disabled: false,
                        className: styles.topicsField,
                        onChange: setTopicPermission,
                    })}
                {showAlsoCounsellor &&
                    renderSelectField<'yes' | 'no'>({
                        key: 'alsoCounsellor',
                        label: t('links.composer.alsoCounsellor.label', 'Berät auch'),
                        value: alsoCounsellor ? 'yes' : 'no',
                        valueLabel: t(...ALSO_COUNSELLOR_LABEL_KEYS[alsoCounsellor ? 'yes' : 'no'].title),
                        options: (['yes', 'no'] as const).map((option) => ({
                            value: option,
                            label: t(...ALSO_COUNSELLOR_LABEL_KEYS[option].title),
                            description: t(...ALSO_COUNSELLOR_LABEL_KEYS[option].description),
                        })),
                        disabled: false,
                        className: styles.topicsField,
                        onChange: (next) => setAlsoCounsellor(next === 'yes'),
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
                {/* Pressing send must not move focus: a blur would collapse the field
                    still being edited, the row would give back its scroll, and the
                    button would slide away between mousedown and mouseup — the click
                    then landed on the row (found on Pre-Dev). Keyboard focus is unaffected. */}
                <span className={styles.sendSlot} onMouseDownCapture={(event) => event.preventDefault()}>
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
                </span>
            </GlobalSearchBar>
            {sendBlockedReason && (
                <div className={styles.sendHintRow}>
                    <p className={styles.sendHint} id={sendHintId} role="status">
                        {sendBlockedReason}
                    </p>
                    {/* The one-click fix for the one reason that has one (#1026 slice 5). */}
                    {offerAgencyAdminSwitch && (
                        <M3Button
                            className={styles.sendHintAction}
                            variant="text"
                            onClick={() => {
                                setRoleBeforeGuidedSwitch(role);
                                setRole('AGENCY_ADMIN');
                                setAlsoCounsellor(true);
                            }}
                        >
                            {t('links.composer.switchToAgencyAdmin', 'Stattdessen als BST-Admin einladen')}
                        </M3Button>
                    )}
                </div>
            )}
        </div>
    );
};

export default InviteComposer;
