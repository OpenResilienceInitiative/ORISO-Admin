import { Alert, Button, notification, Skeleton } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDepartmentDpp } from '../../../../../hooks/useDepartmentDpp.hook';
import { useDepartmentImprint } from '../../../../../hooks/useDepartmentImprint.hook';
import { usePublishDepartmentDpp } from '../../../../../hooks/usePublishDepartmentDpp.hook';
import { usePublishDepartmentImprint } from '../../../../../hooks/usePublishDepartmentImprint.hook';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminData } from '../../../../../hooks/useTenantAdminData.hook';
import { useLegalTextVersions } from '../../../../../hooks/useLegalTextVersions.hook';
import { useTranslateLegalContent } from '../../../../../hooks/useTranslateLegalContent.hook';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';
import { useUserData } from '../../../../../hooks/useUserData.hook';
import { useLegalDraft } from '../../hooks/useLegalDraft';
import { useAgencyLegalDraft } from '../../hooks/useAgencyLegalDraft';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import { AgencyData } from '../../../../../types/agency';
import { isLegalDocumentPayload } from '../../../../../types/dpp';
import { LegalTextKind } from '../../../../../types/legalVersion';
import type { AgencyLegalDraft } from '../../../../../api/agency/legalDrafts';
import { DepartmentDataProtectionCard } from '../DepartmentDataProtectionCard';
import { ALL_DEPARTMENTS, DepartmentSelect } from '../DepartmentSelect';
import { TenantLegalDraftNotice } from '../TenantLegalDraftNotice';
import { getEditableLanguages, parseLegalContentMap } from '../../utils/legalContentLanguages';
import type { ConsentUnavailableReason } from '../../utils/consentUnavailable';
import styles from './styles.module.scss';

type LegalField = 'privacy' | 'imprint';

interface AgencyLegalTextContainerProps {
    agencyData?: AgencyData;
    field: LegalField;
    /** Persists the agency-wide text (the "Alle Fachbereiche" entry). */
    onSaveAgencyWide: <T>(formData: T) => Promise<unknown>;
    saving?: boolean;
}

/** The agency-level content key differs from the department wording ("imprint" vs "impressum"). */
const AGENCY_CONTENT_KEY: Record<LegalField, string> = { privacy: 'privacy', imprint: 'impressum' };

/** The wire enum of the `kind` query parameter (ORISO-AgencyService#256). */
const VERSION_KIND: Record<LegalField, LegalTextKind> = { privacy: 'DPP', imprint: 'IMPRINT' };

/**
 * One legal-text editor per kind for the whole Beratungsstelle, with the Fachbereich chosen in the
 * editor's lower function bar (Figma `Admin.ORISO` 1261:52149) — replacing the previous
 * one-card-per-department deck.
 *
 * **"Alle Fachbereiche"** edits the agency-wide text, which starts from the Träger's text and is
 * what every department inherits until it publishes its own. Selecting a single Fachbereich opens a
 * **draft copy of whatever that department currently shows** — its own text if it has one, otherwise
 * the inherited one. The copy lives in the editor and is written on first save or publish, never on
 * mere selection, so browsing the departments creates nothing.
 *
 * Publishing under a Fachbereich makes that department leave the inherited text for good
 * (ADR-014 amendment 2026-07-28; the link-break happens server-side in ORISO-AgencyService#193).
 */
export const AgencyLegalTextContainer = ({
    agencyData,
    field,
    onSaveAgencyWide,
    saving,
}: AgencyLegalTextContainerProps) => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    // #609: this editor used to have no permission check at all. It is the same
    // right the Träger-level cards ask for, one rung down the ladder.
    const canEditLegalText = can(PermissionAction.Update, Resource.LegalText);
    const [selected, setSelected] = useState<number | typeof ALL_DEPARTMENTS>(ALL_DEPARTMENTS);
    const [draftSource, setDraftSource] = useState<'local' | 'server'>();
    const [draftActionPending, setDraftActionPending] = useState(false);
    const draftActionPendingRef = useRef(false);
    const [agencyEditorGeneration, setAgencyEditorGeneration] = useState(0);

    const agencyId = Number(agencyData?.id);
    const isDepartment = selected !== ALL_DEPARTMENTS;
    const topicId = isDepartment ? (selected as number) : undefined;

    // Which Fachbereich has left the inherited text, per kind: the switcher marks it so an admin
    // editing the agency-wide text sees who will NOT receive the change (#583). Keyed by topicId
    // because `departments[]` and `topics[]` are separate lists on the agency read; a department
    // the admin never opened is covered, since the state comes with the agency, not with a click.
    const ownTextByTopic = useMemo(() => {
        const state = new Map<number, boolean>();
        (agencyData?.departments || []).forEach((department) => {
            const hasOwn = field === 'privacy' ? department.hasPublishedDpp : department.hasPublishedImprint;
            if (hasOwn !== undefined) {
                state.set(Number(department.topicId), hasOwn);
            }
        });
        return state;
    }, [agencyData?.departments, field]);

    const departments = useMemo(
        () =>
            (agencyData?.topics || [])
                .filter((topic) => topic.id != null)
                .map((topic) => ({
                    id: topic.id as number,
                    name: topic.name,
                    hasOwnText: ownTextByTopic.get(topic.id as number),
                })),
        [agencyData?.topics, ownTextByTopic],
    );

    // Tenant text is the root of the inheritance chain: Träger → Agentur → Fachbereich.
    const { data: tenantData } = useSingleTenantData({
        id: agencyData?.tenantId || '',
        enabled: Boolean(agencyData?.tenantId),
    });
    const { data: tenantAdminData } = useTenantAdminData();
    const { translate } = useTranslateLegalContent();

    // Both department queries stay mounted; the inactive one is disabled by its own `enabled` guard
    // (a non-finite topicId), so switching kinds never fires the wrong request.
    const dppQuery = useDepartmentDpp(agencyId, field === 'privacy' ? (topicId as number) : NaN);
    const imprintQuery = useDepartmentImprint(agencyId, field === 'imprint' ? (topicId as number) : NaN);
    const departmentQuery = field === 'privacy' ? dppQuery : imprintQuery;

    // The publication history follows the switcher (#812): a Fachbereich shows its own
    // versions, "Alle Fachbereiche" the agency-wide ones. Scoping the request itself —
    // rather than filtering a shared list — is what makes it impossible for one
    // department's wording to appear under another. Contract documents are untouched by
    // this: they stay tenant-scoped in `DataProcessingAgreementContainer`.
    const { data: versions = [], isError: versionsUnavailable } = useLegalTextVersions(
        isDepartment
            ? { level: 'department', agencyId, topicId: topicId as number, kind: VERSION_KIND[field] }
            : { level: 'agency', agencyId, kind: VERSION_KIND[field] },
    );

    const publishDpp = usePublishDepartmentDpp(agencyId, topicId as number);
    const publishImprint = usePublishDepartmentImprint(agencyId, topicId as number);
    const departmentPublish = field === 'privacy' ? publishDpp : publishImprint;

    const agencyContentKey = AGENCY_CONTENT_KEY[field];
    const agencyWideContent = useMemo<Record<string, string>>(
        () => ({
            ...((tenantData?.content?.[agencyContentKey] as Record<string, string>) || {}),
            ...((agencyData?.content?.[agencyContentKey] as Record<string, string>) || {}),
        }),
        [tenantData, agencyData, agencyContentKey],
    );

    const { data: userData, isLoading: isUserLoading } = useUserData();
    const agencyDraftScope =
        userData?.id != null && agencyData?.id != null
            ? `${agencyData.tenantId}:${userData.id}:agency:${agencyData.id}`
            : undefined;
    const {
        draft: agencyDraft,
        savedAt: localDraftSavedAt,
        discardDraft: discardAgencyDraft,
    } = useLegalDraft(field, agencyDraftScope);
    const agencyDraftEnabled =
        canEditLegalText && !isDepartment && agencyData !== undefined && Number.isFinite(agencyId);
    const serverDraft = useAgencyLegalDraft(agencyId, VERSION_KIND[field], agencyDraftEnabled);
    const draftContextIdentity = `${agencyId}:${field}:${userData?.id ?? ''}`;
    // One object per agency × document × user session: an A→B→A switch restores the same string but
    // is a new session, while switching Fachbereich stays in the same one (same agency draft).
    const draftSessionRef = useRef({ key: draftContextIdentity });
    if (draftSessionRef.current.key !== draftContextIdentity) {
        draftSessionRef.current = { key: draftContextIdentity };
    }
    const editorContextKey = `${draftContextIdentity}:${String(selected)}`;
    const editorIdentityRef = useRef({ key: editorContextKey });
    if (editorIdentityRef.current.key !== editorContextKey) {
        editorIdentityRef.current = { key: editorContextKey };
    }
    const editorIdentity = editorIdentityRef.current;
    const setActionPending = (pending: boolean) => {
        draftActionPendingRef.current = pending;
        setDraftActionPending(pending);
    };
    useEffect(() => {
        draftActionPendingRef.current = false;
        setDraftActionPending(false);
    }, [editorIdentity]);
    const [serverBaseState, setServerBaseState] = useState<{
        identity: string;
        draft: AgencyLegalDraft | null | undefined;
        revision: string | undefined;
    }>(() => ({ identity: draftContextIdentity, draft: undefined, revision: undefined }));
    let serverBase = serverBaseState;
    if (serverBase.identity !== draftContextIdentity) {
        serverBase = { identity: draftContextIdentity, draft: undefined, revision: undefined };
        setServerBaseState(serverBase);
        setDraftSource(undefined);
    }
    // Pin both the complete snapshot and its opaque revision. A background refetch may
    // discover another writer, but it must not move the edit base and bypass a 409.
    if (agencyDraftEnabled && serverBase.draft === undefined && !serverDraft.isLoading && !serverDraft.isError) {
        serverBase = {
            identity: draftContextIdentity,
            draft: serverDraft.draft ?? null,
            revision: serverDraft.draft?.revision,
        };
        setServerBaseState(serverBase);
    }

    /**
     * A request that succeeded is not yet evidence that a policy document came back. `fetchData`
     * resolves a `204` with the raw `Response` and a JSON `null` body with `null`, and neither
     * sets `isError` — so `isSuccess` on its own would let the editor open on the INHERITED text
     * and a publish then write that text as the department's own. Same silent-overwrite class as
     * a failed read, so it is answered the same way: the payload has to be a document first.
     */
    const departmentDocument =
        isDepartment && departmentQuery.isSuccess && isLegalDocumentPayload(departmentQuery.data)
            ? departmentQuery.data
            : undefined;
    const departmentWasRead = departmentDocument !== undefined;

    const departmentContent = useMemo(
        () => parseLegalContentMap(departmentDocument?.content),
        [departmentDocument?.content],
    );

    // The draft copy: a department with no own text yet starts from what it currently shows, which
    // is the inherited agency-wide text. "Alle Fachbereiche" always edits that same agency-wide text.
    //
    // This inference is only safe once a document was actually READ. A failed request — or a
    // success that carried no document — also yields an empty map, and treating that as "has no
    // own text" would seed the editor with the inherited text; publishing would then overwrite the
    // department's real, existing text with the inherited one. That is the silent-overwrite class
    // this whole epic exists to remove, so both block the editor instead (see the branch below).
    const hasOwnText = departmentWasRead && Object.keys(departmentContent).length > 0;
    const hasLocalDraft = !isDepartment && !!agencyDraft;
    const hasServerDraft = !isDepartment && !!serverBase.draft;
    const draftCollision = hasLocalDraft && hasServerDraft;
    const sourceChosen = !draftCollision || draftSource !== undefined;
    let selectedDraft: { content: Record<string, string>; consentText?: Record<string, string> } | null | undefined =
        serverBase.draft;
    if (draftSource !== 'server' && hasLocalDraft && (!hasServerDraft || draftSource === 'local')) {
        selectedDraft = { content: agencyDraft.content, consentText: agencyDraft.consent };
    }
    // Once a draft exists it is a complete snapshot. Do not merge published keys back into it:
    // an absent language or an explicit empty consent map may be a deliberate removal.
    const agencyWideSeed = sourceChosen && selectedDraft ? selectedDraft.content : agencyWideContent;
    let contentByLanguage = agencyWideSeed;
    if (isDepartment) {
        contentByLanguage = hasOwnText ? departmentContent : agencyWideContent;
    }

    /**
     * The consent sentence (ADR-021 decision 4) is a FIELD of the data-protection policy, never of
     * the imprint (decision 7). On the agency editor it is offered only for a concrete Fachbereich
     * (#862) — "Alle Fachbereiche" edits the agency-wide body without the consent dialog.
     *
     * `undefined` is load-bearing — it is how the card decides not to offer the consent editor,
     * which is what must happen while the switcher is on the agency-wide entry, on the imprint,
     * and while the department's policy has not been read successfully.
     *
     * What it must NOT mean is "this department has no sentence yet" (#929). A successful read
     * that omits `consentText` is the empty first-authoring state — the very state in which the
     * template chooser has to be reachable, because it is the only way to seed the first sentence.
     * Reading it as "the backend cannot store consent" hid the editor exactly where it was needed.
     * The question is therefore asked of the REQUEST (did it succeed?), not of the payload.
     */
    const departmentConsent = useMemo(
        () =>
            departmentWasRead && field === 'privacy'
                ? parseLegalContentMap(departmentDocument?.consentText)
                : undefined,
        [departmentWasRead, field, departmentDocument?.consentText],
    );
    // Inherited agency-wide sentence (Träger overlay + agency override). Used only to seed a
    // not-yet-forked Fachbereich — #862 keeps "Alle Fachbereiche" consent-free.
    const agencyWideConsent = useMemo(() => {
        const inherited = tenantData?.content?.privacyConsent;
        const own = agencyData?.content?.privacyConsent;
        if (inherited === undefined && own === undefined) {
            return undefined;
        }
        return { ...(inherited ?? {}), ...(own ?? {}) };
    }, [tenantData?.content?.privacyConsent, agencyData?.content?.privacyConsent]);
    const agencyDraftConsent =
        sourceChosen && selectedDraft ? selectedDraft.consentText ?? agencyWideConsent ?? {} : agencyWideConsent ?? {};
    /**
     * A Fachbereich that has NOT forked yet edits a draft copy of what it currently shows. The body
     * above is already seeded that way (`contentByLanguage`), and the sentence must follow the same
     * source: publishing forks the Fachbereich away from the inherited text for good (ADR-014
     * amendment), and a fork that carried the body but not its consent sentence would ship a policy
     * whose consent screen was left behind on the level above — the exact de-synchronisation
     * ADR-021 decision 4 exists to prevent.
     *
     * Once the Fachbereich HAS its own policy its stored sentence stands as it is, blank included:
     * blank means the level above still governs at runtime (decision 1), and re-seeding it here
     * would silently re-author a legal sentence nobody wrote.
     */
    /* Whether the SENTENCE is this Fachbereich's own.
       A stored sentence answers for itself, whatever the body says: the sentence is a field of the
       policy and a blank body only means the level above still governs the document TEXT
       (decision 1). Asking the body instead threw away every sentence saved against an empty
       policy — which is exactly how the first one is authored — so a saved sentence read back as
       the inherited one (#929).
       The body still settles the one case the stored map cannot: an EMPTY map is "deliberately
       blank" at a level that has already forked, and "nothing authored here yet" at one that has
       not. An omitted `consentText` and an explicit `{}` are the same value on the wire, so there
       is nothing else left to ask. */
    const hasOwnConsent = departmentConsent !== undefined && (Object.keys(departmentConsent).length > 0 || hasOwnText);
    const forkSeedsConsent = isDepartment && !hasOwnConsent && departmentConsent !== undefined;
    const consentByLanguage = useMemo(() => {
        if (field !== 'privacy' || !isDepartment) {
            return undefined;
        }
        return forkSeedsConsent ? agencyWideConsent ?? departmentConsent : departmentConsent;
    }, [field, isDepartment, forkSeedsConsent, departmentConsent, agencyWideConsent]);
    // A not-yet-forked Fachbereich shows the agency-level inheritance notice on languages it has
    // not overridden; a forked one reads its own stored sentence with no such distinction.
    const ownConsentByLanguage = forkSeedsConsent ? departmentConsent : undefined;
    const consentInheritedFrom =
        forkSeedsConsent && agencyWideConsent !== undefined ? t('legal.consent.level.agency') : undefined;
    /**
     * Why the consent editor is not on offer (#914) — the card cannot work this out from
     * `consentByLanguage === undefined` alone, because that one value carries three
     * different situations and only two of them are worth explaining:
     *
     * - no Fachbereich exists at all: the switcher does not render, the selection is stuck
     *   on the agency-wide entry, and the consent editor is unreachable for good — the case
     *   the operator disclaimer is written for;
     * - "Alle Fachbereiche" with Fachbereiche present: consent-free by decision (#862), and
     *   one click away from being editable;
     * - a Fachbereich IS selected but the backend carries no `consentText` field: an older
     *   deployment, not an admin's doing. Nothing to explain and nothing to promise, so the
     *   slot stays empty exactly as before.
     */
    const consentUnavailableReason = useMemo<ConsentUnavailableReason | undefined>(() => {
        // "No Fachbereich" is a legal claim about a specific Beratungsstelle, so it waits
        // for that record: an agency still loading also has an empty topic list.
        if (!agencyData || field !== 'privacy' || consentByLanguage !== undefined) {
            return undefined;
        }
        if (departments.length === 0) {
            return 'noDepartments';
        }
        return isDepartment ? undefined : 'allDepartments';
    }, [agencyData, field, consentByLanguage, departments.length, isDepartment]);

    const languages = useMemo(
        () => getEditableLanguages(tenantAdminData?.settings?.activeLanguages, contentByLanguage),
        [tenantAdminData?.settings?.activeLanguages, contentByLanguage],
    );

    const saveCurrentAgencyDraft = async (content: Record<string, string>, operationIdentity: { key: string }) => {
        const draftContextAtStart = draftContextIdentity;
        const draftSessionAtStart = draftSessionRef.current;
        const saved = await serverDraft.save({
            content: { ...content },
            ...(field === 'privacy' ? { consentText: { ...agencyDraftConsent } } : {}),
            ...(serverBase.revision ? { revision: serverBase.revision } : {}),
        });
        // Pin the saved revision even if the admin switched to a Fachbereich meanwhile, so the next
        // agency-wide save builds on it instead of running into a 409 against a stale base.
        if (draftSessionRef.current === draftSessionAtStart) {
            setServerBaseState((current) =>
                current.identity === draftContextAtStart
                    ? { identity: draftContextAtStart, draft: saved, revision: saved.revision }
                    : current,
            );
        }
        // No remount for a session that began after the request: it may already hold new typing,
        // which then saves on top of this revision instead of being replaced.
        if (editorIdentityRef.current !== operationIdentity) return saved;
        const localDiscarded = discardAgencyDraft();
        setDraftSource(localDiscarded ? 'server' : undefined);
        setAgencyEditorGeneration((current) => current + 1);
        notification.success({ message: t('legal.serverDraft.saved'), duration: 4 });
        return saved;
    };

    const onSave = async (content: Record<string, string>, publish: boolean, consent?: Record<string, string>) => {
        if (isDepartment) {
            // Only the policy carries a consent sentence (decision 7), and the publish call omits
            // the property entirely when the card had none to give — a backend that does not know
            // `consentText` never receives it.
            /* Say what happened. A fire-and-forget mutate left a Fachbereich save with no
               success and no failure message at all — a rejected save was indistinguishable
               from a stored one, which is why a sentence that never reached the server was
               only noticed on the next reload (#929). The agency-wide branch below has
               reported both outcomes all along. */
            const feedback = {
                onSuccess: () =>
                    notification.success({
                        message: t(publish ? 'legal.department.published' : 'legal.department.draftSaved'),
                        duration: 4,
                    }),
                onError: () => notification.error({ message: t('legal.department.saveError'), duration: 6 }),
            };
            if (field === 'privacy') {
                publishDpp.mutate({ content, publish, ...(consent ? { consentText: consent } : {}) }, feedback);
            } else {
                publishImprint.mutate({ content, publish }, feedback);
            }
            return;
        }
        if (draftActionPendingRef.current || serverDraft.isError || serverDraft.hasConflict || !sourceChosen) {
            return;
        }
        const operationIdentity = editorIdentity;
        setActionPending(true);
        let saved: AgencyLegalDraft;
        try {
            saved = await saveCurrentAgencyDraft(content, operationIdentity);
        } catch {
            if (editorIdentityRef.current === operationIdentity) {
                // Publishing saves first; when that fails nothing goes live, and the admin has to
                // learn that — a vanishing "draft not saved" toast read as "nothing happened".
                notification.error({
                    message: t(publish ? 'legal.serverDraft.publishSaveError' : 'legal.serverDraft.saveError'),
                    duration: publish ? 0 : 8,
                });
                setActionPending(false);
            }
            return;
        }
        if (!publish || editorIdentityRef.current !== operationIdentity) {
            if (editorIdentityRef.current === operationIdentity) setActionPending(false);
            return;
        }
        try {
            await onSaveAgencyWide({
                // #862: "Alle Fachbereiche" stays consent-free, so the Träger sentence keeps
                // inheriting; stamping one here would override it for good.
                content: { [agencyContentKey]: { ...saved.content } },
            });
        } catch {
            notification.error({ message: t('legal.serverDraft.publishError'), duration: 8 });
            if (editorIdentityRef.current === operationIdentity) setActionPending(false);
            return;
        }
        try {
            await serverDraft.discard(saved.revision);
            if (editorIdentityRef.current === operationIdentity) {
                setServerBaseState({ identity: draftContextIdentity, draft: null, revision: undefined });
                setDraftSource(undefined);
                setAgencyEditorGeneration((current) => current + 1);
            }
        } catch {
            // Publication is already live. A missing or concurrently replaced draft is retained
            // in the UI and the hook exposes a 409 for explicit conflict resolution.
            notification.warning({ message: t('legal.serverDraft.cleanupError'), duration: 8 });
        } finally {
            if (editorIdentityRef.current === operationIdentity) setActionPending(false);
        }
    };

    const selectedDepartment = departments.find(({ id }) => id === topicId);

    // The editor cannot open before the department's own text is known — seeding it with the
    // inherited text would let a publish overwrite the real one. Blanking the whole card would
    // take the switcher with it and strand the admin on a Fachbereich they cannot leave, so only
    // the editor waits.
    if (isDepartment && departmentQuery.isLoading) {
        return (
            <div className={styles.fallbackCard}>
                <Skeleton active title={false} paragraph={{ rows: 4 }} />
                <div className={styles.fallbackSwitcher}>
                    <DepartmentSelect departments={departments} value={selected} onChange={setSelected} />
                </div>
            </div>
        );
    }

    // A department whose text could not be read must not be editable: the editor would show the
    // inherited text and publishing would replace the department's own with it. A request that
    // resolved without a document (204, JSON `null`) tells us exactly as little as a failed one,
    // so it lands here too instead of quietly opening the editor on the inherited text.
    if (isDepartment && (departmentQuery.isError || (!departmentQuery.isLoading && !departmentWasRead))) {
        return (
            <div className={styles.fallbackCard}>
                <Alert
                    type="error"
                    showIcon
                    message={t('agency.legal.department.loadError.title')}
                    description={t('agency.legal.department.loadError.text', {
                        name: selectedDepartment?.name ?? '',
                    })}
                    action={
                        <Button size="small" onClick={() => departmentQuery.refetch()}>
                            {t('agency.legal.department.loadError.retry')}
                        </Button>
                    }
                />
                <div className={styles.fallbackSwitcher}>
                    <DepartmentSelect departments={departments} value={selected} onChange={setSelected} />
                </div>
            </div>
        );
    }

    const agencyDraftBlocked =
        !canEditLegalText || (!isDepartment && (serverDraft.isError || serverDraft.hasConflict || !sourceChosen));
    const card = (
        <DepartmentDataProtectionCard
            // Remount when the source changes, so the editor resets to it instead of keeping the
            // previous department's text in an uncontrolled TipTap instance.
            // The consent sentence is part of what the card holds, so it belongs in the identity
            // too: keyed on the body alone, a refetch that changed only the sentence left the
            // card's staged edits in place and kept showing them as if they had been stored.
            // It is the sentence the card SHOWS that counts: an unforked Fachbereich shows the
            // level above's, which its own record does not carry.
            key={`${agencyId}-${field}-${String(selected)}-${
                isDepartment
                    ? JSON.stringify([departmentQuery.data?.content ?? '', consentByLanguage ?? {}])
                    : agencyEditorGeneration
            }`}
            documentType={field}
            documentScope={isDepartment ? 'department' : 'agency'}
            departmentName={selectedDepartment?.name}
            initialContentByLanguage={contentByLanguage}
            consentByLanguage={consentByLanguage}
            consentUnavailableReason={consentUnavailableReason}
            consentInheritedFrom={consentInheritedFrom}
            ownConsentByLanguage={ownConsentByLanguage}
            hasOwnConsent={isDepartment && hasOwnConsent}
            languages={languages}
            publicationStatus={isDepartment ? departmentQuery.data?.publicationStatus : undefined}
            versions={versions}
            versionsUnavailable={versionsUnavailable}
            readOnly={agencyDraftBlocked}
            readOnlyReason={canEditLegalText ? undefined : t('tenants.legal.readOnly.managedByTraeger')}
            onSave={onSave}
            saving={saving || departmentPublish.isPending || draftActionPending}
            onTranslate={translate}
            departmentSlot={
                <DepartmentSelect
                    departments={departments}
                    value={selected}
                    onChange={setSelected}
                    // Switching mid-save left a publish unfinished without a word, or locked the
                    // next editor in a draft collision; the switch waits for the action instead.
                    disabled={draftActionPending || departmentPublish.isPending}
                />
            }
        />
    );
    if (isDepartment || !canEditLegalText) return card;
    if (!agencyDraftEnabled || serverDraft.isLoading || isUserLoading) {
        return (
            <div className={styles.fallbackCard}>
                <Skeleton active title={false} paragraph={{ rows: 4 }} />
            </div>
        );
    }
    return (
        <>
            <TenantLegalDraftNotice
                savedAt={serverBase.draft?.savedAt}
                // After choosing the server copy the editor holds it; naming the browser copy's time
                // would give the text the wrong provenance.
                localSavedAt={draftSource === 'server' ? undefined : localDraftSavedAt}
                collision={draftCollision && !sourceChosen}
                loadServer={() => {
                    if (draftActionPendingRef.current) return;
                    setDraftSource('server');
                    setAgencyEditorGeneration((current) => current + 1);
                }}
                keepLocal={() => {
                    if (draftActionPendingRef.current) return;
                    setDraftSource('local');
                    setAgencyEditorGeneration((current) => current + 1);
                }}
                unavailable={serverDraft.isError}
                retry={() => serverDraft.retry()}
                conflict={serverDraft.hasConflict}
                conflictRefreshFailed={serverDraft.conflictRefreshFailed}
                conflictRefreshing={serverDraft.conflictRefreshing}
                retryConflict={() => serverDraft.retryConflict()}
                reloadConflict={() => {
                    if (draftActionPendingRef.current) return;
                    const remote = serverDraft.conflict;
                    setServerBaseState({
                        identity: draftContextIdentity,
                        draft: remote ?? null,
                        revision: remote?.revision,
                    });
                    setDraftSource('server');
                    setAgencyEditorGeneration((current) => current + 1);
                    serverDraft.clearConflict();
                }}
                keepEditing={() => {
                    if (draftActionPendingRef.current) return;
                    // A refresh that found no draft means it is gone: keep editing from "no draft" rather than
                    // a revision the server no longer has (which would 409 again, or skip a needed DELETE).
                    const remote = serverDraft.conflict;
                    setServerBaseState((current) =>
                        remote === null
                            ? { ...current, draft: null, revision: undefined }
                            : { ...current, revision: remote?.revision ?? current.revision },
                    );
                    serverDraft.clearConflict();
                }}
                onDiscard={async () => {
                    if (draftActionPendingRef.current) return;
                    const operationIdentity = editorIdentity;
                    setActionPending(true);
                    try {
                        if (serverBase.draft && serverBase.revision) await serverDraft.discard(serverBase.revision);
                        if (editorIdentityRef.current !== operationIdentity) return;
                        const localDiscarded = discardAgencyDraft();
                        if (editorIdentityRef.current === operationIdentity) {
                            setServerBaseState({
                                identity: draftContextIdentity,
                                draft: null,
                                revision: undefined,
                            });
                            setDraftSource(localDiscarded ? undefined : 'local');
                            setAgencyEditorGeneration((current) => current + 1);
                        }
                    } catch {
                        if (editorIdentityRef.current === operationIdentity) {
                            notification.error({ message: t('legal.serverDraft.discardError'), duration: 8 });
                        }
                    } finally {
                        if (editorIdentityRef.current === operationIdentity) setActionPending(false);
                    }
                }}
                pending={draftActionPending}
            />
            {card}
        </>
    );
};

export default AgencyLegalTextContainer;
