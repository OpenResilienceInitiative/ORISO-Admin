import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateAccountInviteRequest, InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import {
    agencyIdAllocationClient,
    tenantIdAllocationClient,
    type IdAllocationClient,
} from '../../api/idAllocation/idAllocation';
import {
    useIdAllocation,
    type IdUnitOption,
    type IdUnitSearch,
    type UseIdAllocationResult,
} from '../../components/IdAllocationField';
import {
    BAR_DEFAULT_TOPIC_PERMISSION,
    type InviteRole,
    type InviteSendMode,
    type InviteViewerScope,
    type TopicPermission,
} from './inviteModel';
import { toCreateInviteRequest } from './inviteRequest';
import { counsellorNeedsUnitAdmin, fieldsForRole, invitableRoles, isValidEmail, type InviteTab } from './inviteRules';

/** Who fills the bar; tenant and agency admins are pinned to their own units. */
export interface InviteViewer {
    scope: InviteViewerScope;
    ownTenant?: IdUnitOption;
    /** Locks the agency for an admin of one agency; omit it so an admin of several picks among them. */
    ownAgency?: IdUnitOption;
}

/** Data sources of the ID fields; tests and stories inject stubs. */
export interface InviteClients {
    tenantIdAllocation?: IdAllocationClient;
    agencyIdAllocation?: IdAllocationClient;
    searchTenants?: IdUnitSearch;
    /** Receives the chosen Träger so results can be scoped to it. */
    searchAgencies?: (
        query: string,
        context: { tenantId?: number; page?: number; signal?: AbortSignal },
    ) => ReturnType<IdUnitSearch>;
    /** `null` = no such unit. */
    resolveTenant?: (id: number) => Promise<IdUnitOption | null>;
    resolveAgency?: (id: number) => Promise<IdUnitOption | null>;
    /** The agency default, for a picked unit whose search hit did not carry it. */
    loadAgencyTopicPermission?: (agencyId: number) => Promise<TopicPermission | undefined>;
}

/** What the bar needs back from a create: the numbers the server assigned. */
export interface InviteCreated {
    agencyId?: number | null;
    tenantId?: number | null;
}

/** `'emailTaken'` keeps the row and marks the address; a created invite (or `true`) starts over. */
export type InviteSubmitOutcome = boolean | 'emailTaken' | InviteCreated;

export interface InviteInitialValues {
    recipientEmail?: string;
    firstName?: string;
    lastName?: string;
    role?: InviteRole;
    topicPermission?: TopicPermission;
    alsoCounsellor?: boolean;
    tenant?: IdUnitOption;
    agency?: IdUnitOption;
}

export interface UseInviteDraftOptions {
    tab: InviteTab;
    /** Keys the persisted send mode, one per tab. */
    persistKey: string;
    viewer: InviteViewer;
    clients?: InviteClients;
    templates: InviteEmailTemplateDTO[];
    templateId?: number;
    submitting?: boolean;
    initialValues?: InviteInitialValues;
    onSubmit: (request: CreateAccountInviteRequest) => Promise<InviteSubmitOutcome> | InviteSubmitOutcome;
}

export type CollapsibleKey =
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
export const SELECT_KEYS: CollapsibleKey[] = ['role', 'alsoCounsellor', 'topics', 'template'];

export const sendModeStorageKey = (persistKey: string) => `oriso-admin.invite-composer.send-mode.${persistKey}`;

const readPersistedSendMode = (persistKey: string): InviteSendMode => {
    try {
        return window.localStorage.getItem(sendModeStorageKey(persistKey)) === 'createOnly' ? 'createOnly' : 'direct';
    } catch {
        return 'direct';
    }
};

const isNewUnit = (allocation: UseIdAllocationResult) => allocation.mode !== 'existing';

/** The invite bar's state: fields, validity, collapse, the send label and what sending does. */
export const useInviteDraft = ({
    tab,
    persistKey,
    viewer,
    clients = {},
    templates,
    templateId,
    submitting = false,
    initialValues,
    onSubmit,
}: UseInviteDraftOptions) => {
    const { t } = useTranslation();
    const tenantTab = tab === 'tenant';
    const requireNames = !tenantTab;
    const defaultRole: InviteRole = tenantTab ? 'TENANT_ADMIN' : 'COUNSELLOR';

    const [recipientEmail, setRecipientEmail] = useState(initialValues?.recipientEmail ?? '');
    const [emailTouched, setEmailTouched] = useState(false);
    // The refused address, not a flag: editing clears the error, retyping it brings it back.
    const [emailTakenAddress, setEmailTakenAddress] = useState<string | null>(null);
    const [firstName, setFirstName] = useState(initialValues?.firstName ?? '');
    const [lastName, setLastName] = useState(initialValues?.lastName ?? '');
    const [storedSendMode, setStoredSendMode] = useState<InviteSendMode>(() => readPersistedSendMode(persistKey));
    // Unlike the send mode, "Senden & nächste" lasts for this session only and is never persisted.
    const [sendAndNext, setSendAndNext] = useState(false);
    const sendMode: InviteSendMode = sendAndNext ? 'direct' : storedSendMode;
    // Focus must wait until the cleared bar has rendered.
    const [focusEmailPending, setFocusEmailPending] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const tenantLocked = viewer.scope !== 'platform';
    const agencyMayBeNew = viewer.scope !== 'agency';
    const agencyLocked = viewer.scope === 'agency' && viewer.ownAgency != null;
    const lockedTenant = tenantLocked ? viewer.ownTenant : undefined;
    const lockedAgency = agencyLocked ? viewer.ownAgency : undefined;
    const tenantMayBeNew = tenantTab && !tenantLocked;
    // Outside the Träger tab the field names an existing Träger, prefilled with the admin's own.
    const fixedTenant = lockedTenant ?? initialValues?.tenant ?? viewer.ownTenant;

    const roleOptions = invitableRoles(viewer.scope, tab);
    const pickRole = (wanted: InviteRole | undefined) =>
        wanted != null && roleOptions.includes(wanted) ? wanted : roleOptions[0];
    const [role, setRoleState] = useState<InviteRole>(() => pickRole(initialValues?.role ?? defaultRole));
    const [openSelect, setOpenSelect] = useState<CollapsibleKey | null>(null);
    const [topicPermission, setTopicPermission] = useState<TopicPermission>(
        initialValues?.topicPermission ?? BAR_DEFAULT_TOPIC_PERMISSION,
    );
    const [alsoCounsellor, setAlsoCounsellor] = useState<boolean>(initialValues?.alsoCounsellor ?? true);
    // The guided BST-Admin switch covers one founding invite only, so the next person is not silently a second one.
    const [roleBeforeGuidedSwitch, setRoleBeforeGuidedSwitch] = useState<InviteRole | null>(null);

    const tenantAllocation = useIdAllocation({
        client: clients.tenantIdAllocation ?? tenantIdAllocationClient,
        initialUnit: tenantMayBeNew ? initialValues?.tenant : fixedTenant,
    });
    const agencyAllocation = useIdAllocation({
        client: clients.agencyIdAllocation ?? agencyIdAllocationClient,
        initialUnit: lockedAgency ?? initialValues?.agency,
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
    const { loadAgencyTopicPermission } = clients;
    const hadPickedAgency = useRef(false);
    useEffect(() => {
        if (!pickedAgency) {
            // Leaving a chosen agency ("Neu") must not keep that agency's default.
            if (hadPickedAgency.current) setTopicPermission(BAR_DEFAULT_TOPIC_PERMISSION);
            hadPickedAgency.current = false;
            return undefined;
        }
        hadPickedAgency.current = true;
        if (pickedAgency.topicPermission) {
            setTopicPermission(pickedAgency.topicPermission);
            return undefined;
        }
        if (!loadAgencyTopicPermission) return undefined;
        let current = true;
        loadAgencyTopicPermission(pickedAgency.id)
            .then((agencyDefault) => {
                if (current && agencyDefault) setTopicPermission(agencyDefault);
            })
            .catch(() => undefined);
        return () => {
            current = false;
        };
    }, [pickedAgency?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const fields = fieldsForRole(role, tab);
    const tenantId = tenantAllocation.value;
    const { searchAgencies } = clients;
    const searchAgenciesInTenant = useCallback(
        (query: string, page?: number, signal?: AbortSignal) =>
            searchAgencies ? searchAgencies(query, { tenantId, page, signal }) : [],
        [searchAgencies, tenantId],
    );

    const activeTemplates = useMemo(() => templates.filter((template) => template.active), [templates]);
    const selectedTemplate = activeTemplates.find((template) => template.id === templateId);

    const emailValid = isValidEmail(recipientEmail);
    const emailTaken = emailTakenAddress !== null && recipientEmail.trim().toLowerCase() === emailTakenAddress;
    // A number reserved by an open admin invite is joined: the invite waits for that unit.
    const agencyJoinsPendingUnit =
        fields.agency && agencyAllocation.mode === 'manual' && agencyAllocation.validation === 'reserved';
    const agencyIsNew = fields.agency && agencyMayBeNew && isNewUnit(agencyAllocation);
    // The backend cannot infer the Träger for a Träger admin or a new Beratungsstelle.
    const tenantRequired = tenantTab || role === 'TENANT_ADMIN' || agencyIsNew;
    const tenantIdValid =
        !tenantRequired || (tenantMayBeNew ? tenantAllocation.canSubmit : tenantAllocation.mode === 'existing');
    const agencyPicked = agencyMayBeNew
        ? agencyAllocation.canSubmit || agencyJoinsPendingUnit
        : agencyAllocation.mode === 'existing';
    const agencyIdValid = !fields.agency || agencyPicked;
    const needsUnitAdmin = agencyIsNew && counsellorNeedsUnitAdmin(role, agencyAllocation);
    const templateValid = sendMode === 'createOnly' || selectedTemplate != null;
    // A counsellor account cannot be provisioned without names.
    const namesValid = !requireNames || (firstName.trim().length > 0 && lastName.trim().length > 0);
    const isValid =
        emailValid && !emailTaken && tenantIdValid && agencyIdValid && !needsUnitAdmin && templateValid && namesValid;
    const showEmailError = emailTouched && recipientEmail.length > 0 && !emailValid;

    const fieldValid: Record<CollapsibleKey, boolean> = {
        email: emailValid && !emailTaken,
        firstName: firstName.trim().length > 0,
        lastName: lastName.trim().length > 0,
        tenant: tenantTab ? tenantAllocation.canSubmit : tenantAllocation.mode === 'existing',
        agency: agencyPicked,
        role: true,
        alsoCounsellor: true,
        topics: true,
        template: selectedTemplate != null,
    };
    const [collapsedKeys, setCollapsedKeys] = useState<Set<CollapsibleKey>>(() => {
        const initial = new Set<CollapsibleKey>();
        if (initialValues?.recipientEmail && isValidEmail(initialValues.recipientEmail)) initial.add('email');
        if (initialValues?.firstName?.trim()) initial.add('firstName');
        if (initialValues?.lastName?.trim()) initial.add('lastName');
        if (initialValues?.tenant && !tenantLocked) initial.add('tenant');
        if (initialValues?.agency && !agencyLocked) initial.add('agency');
        // Only a prefilled bar starts as pills; a fresh page starts expanded.
        if (initialValues) SELECT_KEYS.forEach((key) => initial.add(key));
        return initial;
    });
    const isCollapsed = (key: CollapsibleKey) => collapsedKeys.has(key) && fieldValid[key];
    const collapse = (key: CollapsibleKey) => setCollapsedKeys((keys) => new Set(keys).add(key));
    const collapseIfValid = (key: CollapsibleKey) => {
        if (fieldValid[key]) collapse(key);
    };
    const expand = (key: CollapsibleKey) =>
        setCollapsedKeys((keys) => {
            const next = new Set(keys);
            next.delete(key);
            return next;
        });

    // An existing agency picked while the Träger is empty fills it in; a Träger already chosen is never overwritten.
    useEffect(() => {
        if (tenantLocked || pickedAgency?.tenantId == null) return;
        const tenantChosen =
            tenantAllocation.mode === 'existing' ||
            (tenantAllocation.mode === 'manual' && tenantAllocation.value !== undefined);
        if (tenantChosen) return;
        tenantAllocation.selectExisting({ id: pickedAgency.tenantId, name: pickedAgency.tenantName });
        collapse('tenant');
    }, [pickedAgency?.id, pickedAgency?.tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Select dropdowns render in a portal, so picking an option never counts as focus moving on.
    const handleRowFocus = (event: FocusEvent<HTMLDivElement>) => {
        const focusedKey = (event.target as HTMLElement).closest<HTMLElement>('[data-field-key]')?.dataset.fieldKey;
        SELECT_KEYS.forEach((key) => {
            if (key !== focusedKey && !collapsedKeys.has(key)) collapse(key);
        });
    };

    const createsUnit = agencyIsNew || (tenantMayBeNew && isNewUnit(tenantAllocation));

    // The first unmet precondition, in the order an admin fills the row.
    const blockReason = (() => {
        if (isValid || submitting) return undefined;
        if (!emailValid) return t('links.composer.blocked.email', 'Bitte eine gültige E-Mail-Adresse eingeben.');
        if (emailTaken) {
            return t(
                'links.composer.blocked.emailTaken',
                'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
            );
        }
        if (!namesValid) return t('links.composer.blocked.names', 'Bitte Vorname und Name eingeben.');
        if (!tenantIdValid) {
            return tenantTab
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
        if (needsUnitAdmin) {
            return t(
                'links.composer.blocked.counsellorNeedsUnitAdmin',
                'Eine neue Beratungsstelle legt nur eine BST-Admin an. Laden Sie zuerst die BST-Admin ein (Rolle „BST-Admin“, „Berät auch“), dann die Berater:innen mit derselben Nummer.',
            );
        }
        if (!templateValid) return t('links.composer.blocked.template', 'Bitte zuerst eine E-Mail-Vorlage auswählen.');
        return undefined;
    })();
    // The one-click fix, offered only while the founding rule is the reason shown.
    const offerAgencyAdminSwitch =
        needsUnitAdmin &&
        roleOptions.includes('AGENCY_ADMIN') &&
        emailValid &&
        !emailTaken &&
        namesValid &&
        tenantIdValid &&
        agencyIdValid;

    const sendLabel = (() => {
        if (sendAndNext) {
            return createsUnit
                ? t('links.composer.sendCreateAndInviteAndNext', 'Anlegen, einladen & nächste')
                : t('links.composer.sendInviteAndNext', 'Einladen & nächste');
        }
        if (sendMode === 'createOnly') return t('links.composer.sendCreateOnly', 'Empfänger nur anlegen');
        return createsUnit
            ? t('links.composer.sendCreateAndInvite', 'Anlegen & einladen')
            : t('links.composer.sendInvite', 'Einladen');
    })();

    const chooseSendMode = (key: InviteSendMode | 'sendAndNext') => {
        if (key === 'sendAndNext') {
            setSendAndNext(true);
            return;
        }
        setSendAndNext(false);
        setStoredSendMode(key);
        try {
            window.localStorage.setItem(sendModeStorageKey(persistKey), key);
        } catch {
            // Storage unavailable (private mode): the choice still holds for this session.
        }
    };

    const setRole = (next: InviteRole) => {
        // A deliberate pick replaces the guided switch.
        setRoleBeforeGuidedSwitch(null);
        setRoleState(next);
    };
    const switchToAgencyAdmin = () => {
        setRoleBeforeGuidedSwitch(role);
        setRoleState('AGENCY_ADMIN');
        setAlsoCounsellor(true);
    };

    const clearPerson = () => {
        setRecipientEmail('');
        setEmailTouched(false);
        setEmailTakenAddress(null);
        setFirstName('');
        setLastName('');
    };

    const resetAfterSend = (created?: InviteCreated) => {
        clearPerson();
        if (sendAndNext) {
            // The next person joins the same unit with the same template and topic level.
            setRoleState(pickRole(defaultRole));
            setRoleBeforeGuidedSwitch(null);
            setAlsoCounsellor(initialValues?.alsoCounsellor ?? true);
            setCollapsedKeys(new Set<CollapsibleKey>(['tenant', 'agency', 'topics', 'template']));
            // A just-reserved number is re-checked so the next counsellor waits for it; "Neu" takes the assigned one.
            if (tenantAllocation.mode === 'manual') tenantAllocation.setManualValue(tenantAllocation.value);
            if (agencyAllocation.mode === 'auto' && created?.agencyId != null) {
                agencyAllocation.setManualValue(created.agencyId);
            } else if (agencyAllocation.mode === 'manual') {
                agencyAllocation.setManualValue(agencyAllocation.value);
            }
            setFocusEmailPending(true);
            return;
        }
        // The send press kept focus in the edited field; let go, or its type-ahead reopens over the fresh bar.
        const active = document.activeElement;
        if (active instanceof HTMLElement && rootRef.current?.contains(active)) active.blur();
        setCollapsedKeys(new Set(SELECT_KEYS));
        if (roleBeforeGuidedSwitch) {
            setRoleState(roleBeforeGuidedSwitch);
            setRoleBeforeGuidedSwitch(null);
        }
        if (fixedTenant && !tenantMayBeNew) tenantAllocation.selectExisting(fixedTenant);
        else tenantAllocation.resetToAuto();
        if (lockedAgency) agencyAllocation.selectExisting(lockedAgency);
        else agencyAllocation.resetToAuto();
    };

    const send = async () => {
        if (!isValid || submitting) return;
        const outcome = await onSubmit(
            toCreateInviteRequest(
                {
                    kind: 'draft',
                    role,
                    recipientEmail: recipientEmail.trim(),
                    firstName: firstName.trim() || undefined,
                    lastName: lastName.trim() || undefined,
                    tenant: { mode: tenantAllocation.mode, id: tenantAllocation.value },
                    agency: { mode: agencyAllocation.mode, id: agencyAllocation.value },
                    alsoCounsellor,
                    topicPermission,
                    templateId,
                },
                { tab, viewer: viewer.scope, sendMode },
            ),
        );
        if (outcome === 'emailTaken') {
            // Keep everything the admin typed; only the address needs correcting.
            setEmailTakenAddress(recipientEmail.trim().toLowerCase());
            setEmailTouched(true);
            return;
        }
        if (outcome) resetAfterSend(typeof outcome === 'object' ? outcome : undefined);
    };

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

    return {
        /** The bar's root and its focus handler, which folds open select pills once focus moves on. */
        row: { ref: rootRef, onFocus: handleRowFocus },
        fields,
        email: {
            value: recipientEmail,
            set: setRecipientEmail,
            taken: emailTaken,
            showError: showEmailError,
            touch: () => setEmailTouched(true),
        },
        firstName: { value: firstName, set: setFirstName },
        lastName: { value: lastName, set: setLastName },
        role: { value: role, set: setRole, options: roleOptions },
        tenant: {
            allocation: tenantAllocation,
            locked: tenantLocked,
            allowCreate: tenantMayBeNew,
            label: unitLabel(tenantAllocation),
        },
        agency: {
            allocation: agencyAllocation,
            locked: agencyLocked,
            mayBeNew: agencyMayBeNew,
            label: unitLabel(agencyAllocation),
            search: searchAgencies ? searchAgenciesInTenant : undefined,
            picked: pickedAgency,
        },
        topics: { value: topicPermission, set: setTopicPermission },
        alsoCounsellor: { value: alsoCounsellor, set: setAlsoCounsellor },
        /** Which fields show as pills, and which select menu is open. */
        pills: { isCollapsed, collapse, collapseIfValid, expand, openSelect, setOpenSelect },
        submit: {
            mode: sendMode,
            andNext: sendAndNext,
            chooseMode: chooseSendMode,
            isValid,
            label: sendLabel,
            send,
            /** Why send is off; `undefined` while it can fire. */
            blockReason,
            offerAgencyAdminSwitch,
            switchToAgencyAdmin,
        },
    };
};

export type InviteDraftState = ReturnType<typeof useInviteDraft>;
