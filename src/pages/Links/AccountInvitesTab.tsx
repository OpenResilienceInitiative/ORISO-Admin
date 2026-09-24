import { message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
    acceptBaseUrlForRole,
    AccountInviteDTO,
    AccountInviteTargetRole,
    createAccountInvite,
    InviteEmailTemplateDTO,
    InviteEmailTemplateKind,
    listAccountInvites,
    listInviteEmailTemplates,
    resendAccountInvite,
    revokeAccountInvite,
    sendAccountInvite,
    updateAccountInviteTopicPermission,
} from '../../api/accountInvites/accountInvites';
import { searchTenantData } from '../../api/tenant/searchTenantData';
import type { AllocationMode } from '../../api/idAllocation/idAllocation';
import getAgencyDataById, { AgencyAccessError } from '../../api/agency/getAgencyById';
import { findInviteTenant } from '../../api/tenant/findInviteTenant';
import { isActiveDeleteDate } from '../../utils/deleteDate';
import {
    agencyTopicPermission,
    searchInviteAgencies,
    type InviteAgencyHit,
} from '../../api/agency/searchInviteAgencies';
import { resolveInviteViewerScope } from '../../constants/linksAccess';
import { Modal } from '../../components/Modal';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import type { ParseInviteCsvResult } from './csv/parseInviteCsv';
import { EmailTemplatesDialog } from './EmailTemplatesDialog';
import { InviteComposer, InviteComposerValues, InviteSendMode, InviteSubmitOutcome } from './InviteComposer';
import { InviteCsvImportModal, type InviteCsvCreateOutcome, type InviteCsvCreateRow } from './InviteCsvImportModal';
import { InviteProgressBoard } from './inviteProgress/InviteProgressBoard';
import { SelfAssignDialog, type SelfAssignTopic } from './SelfAssignDialog';
import type { InviteRole, InviteViewerScope, TopicPermission } from './inviteModel';
import { explainInviteError, type InviteErrorContext } from './explainInviteError';
import type { IdUnitOption } from '../../components/IdAllocationField';
import styles from './styles.module.scss';

interface AccountInvitesTabProps {
    targetRole: AccountInviteTargetRole;
    templateKind: InviteEmailTemplateKind;
    includeAgencyField?: boolean;
}

/** Agency allocation mode of one CSV row: an existing agency, a pinned new number, or the next free one. */
const csvAgencyAllocationMode = (row: InviteCsvCreateRow): AllocationMode => {
    if (row.target === 'EXISTING') return 'EXISTING';
    return row.id != null ? 'MANUAL' : 'AUTO';
};

// Only a DRAFT or a sent invite can still be sent or revoked.
const isBulkSelectable = (invite: AccountInviteDTO) =>
    invite.inviteStatus === 'DRAFT' || invite.inviteStatus === 'EMAIL_SENT';

/** Roles the invite tabs manage at all (the list endpoint may carry others, e.g. advice seekers). */
const INVITE_TAB_ROLES: ReadonlySet<AccountInviteTargetRole> = new Set(['TENANT_ADMIN', 'AGENCY_ADMIN', 'COUNSELLOR']);

/**
 * Which tab lists an invite (#1026): the Träger tab keeps the invites that
 * FOUND a Träger; everything that joins an existing unit — counsellors, BST
 * admins, and Träger admins invited into an existing Träger — lives on the
 * counsellor tab, where the bar that creates them sits.
 */
const foundsTenant = (invite: AccountInviteDTO) =>
    invite.targetRole === 'TENANT_ADMIN' && invite.tenantIdAllocationMode !== 'EXISTING';
const belongsToTab = (invite: AccountInviteDTO, tenantTab: boolean) =>
    INVITE_TAB_ROLES.has(invite.targetRole) && foundsTenant(invite) === tenantTab;
/**
 * An agency admin may only invite counsellors (UserService#1215); the list the
 * backend scopes to their agencies shows exactly those, nothing they cannot act on.
 */
const visibleForViewer = (invite: AccountInviteDTO, viewerScope: InviteViewerScope) =>
    viewerScope !== 'agency' || invite.targetRole === 'COUNSELLOR';

/** Topics of an agency for the self-assignment dialog (AgencyService admin detail). */
const loadAgencyDetail = async (agencyId: number) => {
    const response = await getAgencyDataById(String(agencyId));
    // eslint-disable-next-line no-underscore-dangle -- HAL envelope, same as removeEmbedded
    return response?._embedded ?? response;
};

// A typed agency number counts only if that agency exists and is not deleted.
const findInviteAgency = async (agencyId: number): Promise<IdUnitOption | null> => {
    try {
        const agency = await loadAgencyDetail(agencyId);
        if (agency?.id == null || !isActiveDeleteDate(agency.deleteDate)) return null;
        return {
            id: Number(agency.id),
            name: agency.name ?? undefined,
            topicPermission: agencyTopicPermission(agency),
        };
    } catch (error) {
        if (error instanceof AgencyAccessError) return null;
        throw error;
    }
};

const loadAgencyTopicPermission = async (agencyId: number) => agencyTopicPermission(await loadAgencyDetail(agencyId));

const loadAgencyTopics = async (agencyId: number): Promise<SelfAssignTopic[]> => {
    const agency = await loadAgencyDetail(agencyId);
    return (agency?.topics ?? [])
        .map((topic: { id?: number | string; name?: string }) => ({ id: Number(topic?.id), name: topic?.name ?? '' }))
        .filter((topic: SelfAssignTopic) => Number.isFinite(topic.id));
};

export const AccountInvitesTab = ({ targetRole, templateKind, includeAgencyField = false }: AccountInvitesTabProps) => {
    const { t } = useTranslation();
    const [invites, setInvites] = useState<AccountInviteDTO[]>([]);
    const [templates, setTemplates] = useState<InviteEmailTemplateDTO[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();
    const [generatedLinks, setGeneratedLinks] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [templatesDialogView, setTemplatesDialogView] = useState<'list' | 'create' | null>(null);
    // "Neu aus „X"" (#746): source template the create view prefills from.
    const [createFromTemplateId, setCreateFromTemplateId] = useState<number | undefined>();
    // CSV import (#315): parse result + the send mode captured when the file was picked.
    const [csvImport, setCsvImport] = useState<{
        result: ParseInviteCsvResult;
        sendMode: InviteSendMode;
    } | null>(null);
    // #1026 slice 3: "Mich selbst eintragen" — undefined = closed; `{}` = open without a preset agency.
    const [selfAssign, setSelfAssign] = useState<{ agency?: IdUnitOption } | undefined>();
    // #1026 slice 6: invites whose topic permission is being saved.
    const [topicSavingIds, setTopicSavingIds] = useState<number[]>([]);
    // Bulk selection (#316): checked row ids, the open/closed state of the
    // "Ausgewählte löschen" confirmation, and a guard while a batch runs.
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
    const [bulkRunning, setBulkRunning] = useState(false);
    // Toolbar search (A4/#376). The tab already holds the COMPLETE invite list
    // (see loadInvites) and the board already filters it client-side by status
    // bucket, so the query joins that same client-side pipeline instead of
    // introducing a second, server-paged source the summary counts could not be
    // derived from.
    const [searchQuery, setSearchQuery] = useState('');

    // The JWT carries `tenantId` as a STRING — "0" for the platform admin is
    // truthy, so a bare `|| undefined` pinned the platform admin to "Träger 0".
    // Only a real Träger (> 0) is the viewer's own one.
    const jwtTenantId = Number(parseUserAuthInfo().tenantId);
    const currentTenantId = Number.isFinite(jwtTenantId) && jwtTenantId > 0 ? jwtTenantId : undefined;
    const { isSuperAdmin, hasRole } = useUserRoles();
    const isTenantInvite = targetRole === 'TENANT_ADMIN';
    // #1026: platform admin, Träger admin (own Träger) or Beratungsstellen-Admin
    // (own Träger and own agencies, counsellors only). The Träger tab is platform-only.
    const viewerScope: InviteViewerScope = isTenantInvite
        ? 'platform'
        : resolveInviteViewerScope({ isSuperAdmin, hasRole });
    const isAgencyViewer = viewerScope === 'agency';

    // #1026: an agency admin's own agencies. The agency search is scoped per role
    // by the backend (AgencyService#307), so an empty query returns exactly them.
    // One agency locks the field; several make it a pick among them.
    const [ownAgencies, setOwnAgencies] = useState<InviteAgencyHit[]>([]);
    useEffect(() => {
        if (!isAgencyViewer) return undefined;
        let cancelled = false;
        searchInviteAgencies('', currentTenantId)
            .then((hits) => {
                if (!cancelled) setOwnAgencies(hits);
            })
            .catch(() => {
                // The field stays a scoped pick; the backend still refuses foreign agencies.
            });
        return () => {
            cancelled = true;
        };
    }, [isAgencyViewer, currentTenantId]);
    const ownAgency = useMemo<IdUnitOption | undefined>(
        () => (ownAgencies.length === 1 ? { id: ownAgencies[0].id, name: ownAgencies[0].name } : undefined),
        [ownAgencies],
    );
    const ownTenantName = ownAgencies.find((agency) => agency.tenantName)?.tenantName;

    // Client-side taken-id knowledge (existing tenants + still-active
    // DRAFT/EMAIL_SENT TENANT_ADMIN invites). The composer's ID field itself now
    // validates against the authoritative allocation endpoints (#570); this set
    // only pre-flags collisions in the CSV import preview.
    const [existingTenantIds, setExistingTenantIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!isTenantInvite) return undefined;
        let cancelled = false;
        const loadAllTenantIds = async () => {
            const perPage = 200;
            const ids: number[] = [];
            let page = 1;
            let total = Number.POSITIVE_INFINITY;
            while (ids.length < total) {
                // Pagination is intentionally sequential so each response determines whether another page exists.
                // eslint-disable-next-line no-await-in-loop
                const response = await searchTenantData({ page, perPage });
                const pageIds = (response.data ?? [])
                    .map((tenant) => tenant.id)
                    .filter((id): id is number => id != null);
                ids.push(...pageIds);
                total = response.total ?? ids.length;
                if (response.data.length === 0) break;
                page += 1;
            }
            if (!cancelled) {
                setExistingTenantIds(new Set(ids));
            }
        };
        loadAllTenantIds().catch(() => {
            // Best-effort pre-flagging only — the CSV preview falls back to the backend's 409.
        });
        return () => {
            cancelled = true;
        };
    }, [isTenantInvite]);

    // Active-invite tenant ids used to need a second, dedicated full fetch;
    // since the board loads the COMPLETE list (see loadInvites), they are now a
    // plain derivation of it — the just-created invite is reflected on reload.
    const activeInviteTenantIds = useMemo(
        () =>
            new Set(
                invites
                    .filter((invite) => invite.inviteStatus === 'DRAFT' || invite.inviteStatus === 'EMAIL_SENT')
                    .map((invite) => invite.tenantId)
                    .filter((id): id is number => id != null),
            ),
        [invites],
    );

    const takenTenantIds = useMemo(
        () => new Set<number>([...existingTenantIds, ...activeInviteTenantIds]),
        [existingTenantIds, activeInviteTenantIds],
    );

    const activeTemplates = useMemo(() => templates.filter((template) => template.active), [templates]);

    /** Sequence number of the newest `loadInvites` run; see the guard inside it. */
    const loadRevision = useRef(0);

    /**
     * Loads the tab's COMPLETE invite list (all pages, 200 per request). The
     * board derives its summary counts and bucket filters client-side — a
     * single server page could not answer "how many are completed" — and the
     * list endpoint offers no bucket aggregation. Invite lists are admin-scale
     * (the tenant tab already fetched everything for id pre-flagging before).
     */
    const loadInvites = useCallback(async () => {
        loadRevision.current += 1;
        const revision = loadRevision.current;
        // Only the newest load may write. The initial load, the refresh after
        // every invite action and the CSV import's refresh all call this, so two
        // runs can be in flight at once — and because each run walks several
        // pages, the older one can finish last. Without this guard it would
        // overwrite fresher rows (and clear `loading` while the newer run is
        // still fetching), showing a just-revoked invite as still active.
        const isLatest = () => revision === loadRevision.current;
        setLoading(true);
        try {
            const all: AccountInviteDTO[] = [];
            let page = 0;
            let totalPages = 1;
            while (page < totalPages) {
                // Pagination is intentionally sequential because totalPages comes from the preceding response.
                // The counsellor tab lists every role that JOINS a unit (#1026), so it
                // loads unfiltered and keeps its share below.
                // eslint-disable-next-line no-await-in-loop
                const response = await listAccountInvites({
                    page,
                    size: 200,
                    targetRole: isTenantInvite ? 'TENANT_ADMIN' : undefined,
                });
                all.push(
                    ...(response.content ?? []).filter(
                        (invite) => belongsToTab(invite, isTenantInvite) && visibleForViewer(invite, viewerScope),
                    ),
                );
                totalPages = response.totalPages ?? 0;
                page += 1;
            }
            if (!isLatest()) return;
            setInvites(all);
        } catch {
            if (!isLatest()) return;
            message.error(t('links.error.loadFailed', 'Could not load links'));
        } finally {
            // A superseded run leaves `loading` to the run that overtook it.
            if (isLatest()) setLoading(false);
        }
    }, [isTenantInvite, viewerScope, t]);

    const loadTemplates = useCallback(() => {
        listInviteEmailTemplates(templateKind)
            .then(setTemplates)
            .catch(() => message.error(t('links.accountInvites.templatesLoadFailed', 'Could not load templates')));
    }, [templateKind, t]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // After a template is created/edited in the dialog, refresh the picker — and if it
    // is a newly created, active template of this tab's kind, preselect it right away.
    // The saved template is merged into local state immediately so the split button can
    // show its name even before the refetch lands (or if that refetch fails).
    const onTemplateChanged = useCallback(
        (template: InviteEmailTemplateDTO) => {
            if (template.kind === templateKind) {
                setTemplates((current) => [...current.filter((existing) => existing.id !== template.id), template]);
                if (template.active) {
                    setSelectedTemplateId(template.id);
                } else {
                    setSelectedTemplateId((current) => (current === template.id ? undefined : current));
                }
            }
            loadTemplates();
        },
        [loadTemplates, templateKind],
    );

    useEffect(() => {
        loadInvites();
    }, [loadInvites]);

    useEffect(() => {
        if (activeTemplates.length === 1) {
            setSelectedTemplateId(activeTemplates[0].id);
        }
    }, [activeTemplates]);

    const copyLink = useCallback(
        (url?: string) => {
            if (!url) {
                message.info(
                    t('links.accountInvites.linkOnlyAfterSend', 'Invite link is only visible after send/resend.'),
                );
                return;
            }
            navigator.clipboard
                .writeText(url)
                .then(() => message.success(t('links.copied', 'Link copied')))
                .catch(() => message.error(t('links.copyFailed', 'Copy failed')));
        },
        [t],
    );

    const rememberGeneratedLink = useCallback((invite: AccountInviteDTO) => {
        if (!invite.acceptUrl) return;
        setGeneratedLinks((current) => ({ ...current, [invite.id]: invite.acceptUrl as string }));
    }, []);

    const explain = useCallback(
        (error: unknown, action: InviteErrorContext['action'], role: AccountInviteTargetRole = targetRole) =>
            explainInviteError(error, { t, action, role, idKind: isTenantInvite ? 'tenant' : 'agency' }),
        [isTenantInvite, targetRole, t],
    );

    // #1026 slice 4: the platform admin picks an EXISTING Träger by name.
    const searchTenantsForPicker = useCallback(async (query: string) => {
        const response = await searchTenantData({ search: query, perPage: 10 });
        return (response.data ?? [])
            .filter((tenant) => tenant.id != null && Number(tenant.id) > 0)
            .map((tenant) => ({ id: Number(tenant.id), name: tenant.name ?? undefined }));
    }, []);

    const searchAgenciesForPicker = useCallback(
        async (query: string, { tenantId }: { tenantId?: number }) =>
            (await searchInviteAgencies(query, tenantId)).map(
                ({ id, name, topics, tenantId: agencyTenantId, tenantName, topicPermission }) => ({
                    id,
                    name,
                    topics,
                    tenantId: agencyTenantId,
                    tenantName,
                    topicPermission,
                }),
            ),
        [],
    );

    const onCreate = useCallback(
        async (values: InviteComposerValues): Promise<InviteSubmitOutcome> => {
            setSubmitting(true);
            // #1026 slice 3: the bar's "Rolle" is the invite's target role.
            const inviteRole: InviteRole = values.role ?? (isTenantInvite ? 'TENANT_ADMIN' : 'COUNSELLOR');
            try {
                // The backend routes the department: an existing agency adopts its only topic.
                const created = await createAccountInvite({
                    // Role-aware target (TEN-INV U6/U8): tenant admins land on the
                    // public Admin onboarding route, everyone else on the app layer.
                    acceptBaseUrl: acceptBaseUrlForRole(inviteRole),
                    agencyId: values.agencyId,
                    // Allocation contract (#569/#570): AUTO = backend assigns the
                    // smallest free id; MANUAL ids were pre-validated in the field
                    // and are re-checked authoritatively on create.
                    agencyIdAllocationMode: values.agencyIdAllocationMode,
                    tenantIdAllocationMode: values.tenantIdAllocationMode,
                    expiresInDays: 30,
                    firstName: values.firstName,
                    lastName: values.lastName,
                    recipientEmail: values.recipientEmail,
                    targetRole: inviteRole,
                    alsoCounsellor: values.alsoCounsellor,
                    topicPermission: values.topicPermission,
                    // "Empfänger nur anlegen": the API creates without sending when
                    // templateId is omitted (JSON.stringify drops the undefined key).
                    templateId: values.sendMode === 'direct' ? values.templateId : undefined,
                    tenantId: values.tenantId,
                });
                rememberGeneratedLink(created);
                if (created?.inviteStatus === 'WAITING_FOR_UNIT') {
                    // #1026 slice 5: stored, not sent — say when it WILL go out.
                    message.info(
                        t(
                            'links.accountInvites.createdWaiting',
                            'Einladung vorgemerkt: Sie geht automatisch raus, sobald die Beratungsstelle angelegt ist.',
                        ),
                    );
                } else {
                    message.success(
                        values.sendMode === 'direct'
                            ? t('links.accountInvites.created', 'Invite sent')
                            : t('links.accountInvites.createdNoEmail', 'Recipient created without sending an email'),
                    );
                }
                await loadInvites();
                return created ?? true;
            } catch (error) {
                const explained = await explain(error, 'create', inviteRole);
                // The composer marks a taken address inline and keeps the row.
                if (explained.emailTaken) return 'emailTaken';
                message.error(explained.message);
                // A failed mail may or may not have kept the invite: reload rather than guess.
                if (explained.smtp) await loadInvites();
                return false;
            } finally {
                setSubmitting(false);
            }
        },
        [explain, isTenantInvite, loadInvites, rememberGeneratedLink, t],
    );

    // One row of the CSV batch. Uses the send mode captured at file-pick time:
    // direct = with templateId (falling back to the single active template, like
    // resend), create-only = without. Rejections propagate — the modal marks the
    // row (409 = id collision) instead of aborting the batch.
    const createCsvInvite = useCallback(
        async (row: InviteCsvCreateRow): Promise<InviteCsvCreateOutcome | undefined> => {
            if (!csvImport) return undefined;
            // #1026: the tenant id space on the Träger tab ("bestehend" = an existing
            // Träger), the admin's own Träger everywhere else (EXISTING when known).
            const ownTenant =
                currentTenantId != null
                    ? { tenantId: currentTenantId, tenantIdAllocationMode: 'EXISTING' as const }
                    : {};
            let unitFields: Pick<
                Parameters<typeof createAccountInvite>[0],
                'tenantId' | 'tenantIdAllocationMode' | 'agencyId' | 'agencyIdAllocationMode'
            >;
            if (isTenantInvite) {
                unitFields =
                    row.target === 'EXISTING'
                        ? { tenantId: row.id, tenantIdAllocationMode: 'EXISTING' }
                        : { tenantId: row.id };
            } else if (row.role === 'TENANT_ADMIN') {
                unitFields = ownTenant;
            } else {
                // The file's id column addresses the agency space here: "bestehend" =
                // an existing agency (checked, not reserved); a number for "neu" is
                // pinned MANUAL, an empty cell asks for the next free one.
                unitFields = { ...ownTenant, agencyId: row.id, agencyIdAllocationMode: csvAgencyAllocationMode(row) };
            }
            const created = await createAccountInvite({
                acceptBaseUrl: acceptBaseUrlForRole(row.role),
                expiresInDays: 30,
                firstName: row.firstName,
                lastName: row.lastName,
                recipientEmail: row.recipientEmail,
                targetRole: row.role,
                alsoCounsellor: row.alsoCounsellor,
                topicPermission: row.topicPermission,
                // A row may name its own template; empty means the bar's.
                templateId:
                    csvImport.sendMode === 'direct'
                        ? row.templateId ?? selectedTemplateId ?? activeTemplates[0]?.id
                        : undefined,
                ...unitFields,
            });
            return {
                inviteId: created?.id,
                waiting: created?.inviteStatus === 'WAITING_FOR_UNIT',
                noUnitAdmin: created?.queueProblem === 'NO_UNIT_ADMIN',
            };
        },
        [activeTemplates, csvImport, currentTenantId, isTenantInvite, selectedTemplateId],
    );

    // #1026 slice 6: the table changes a counsellor's topic permission in place.
    const onTopicPermissionChange = useCallback(
        async (invite: AccountInviteDTO, topicPermission: TopicPermission) => {
            setTopicSavingIds((ids) => [...ids, invite.id]);
            try {
                const updated = await updateAccountInviteTopicPermission(invite.id, topicPermission);
                setInvites((current) =>
                    current.map((row) => (row.id === invite.id ? { ...row, ...updated, topicPermission } : row)),
                );
                message.success(t('links.accountInvites.topicPermissionSaved', 'Themen-Berechtigung gespeichert'));
            } catch (error) {
                message.error((await explain(error, 'topicPermission', invite.targetRole)).message);
            } finally {
                setTopicSavingIds((ids) => ids.filter((id) => id !== invite.id));
            }
        },
        [explain, t],
    );

    const onResend = useCallback(
        async (invite: AccountInviteDTO) => {
            const templateId = selectedTemplateId ?? activeTemplates[0]?.id;
            if (!templateId) {
                message.error(t('links.accountInvites.templateRequired', 'Select a template first.'));
                return;
            }
            try {
                const resent = await resendAccountInvite(invite.id, {
                    acceptBaseUrl: acceptBaseUrlForRole(invite.targetRole),
                    templateId,
                });
                rememberGeneratedLink(resent);
                message.success(t('links.accountInvites.resent', 'Invite resent'));
                await loadInvites();
            } catch (error) {
                const explained = await explain(error, 'resend', invite.targetRole);
                message.error(explained.message);
                if (explained.smtp) await loadInvites();
            }
        },
        [activeTemplates, explain, loadInvites, rememberGeneratedLink, selectedTemplateId, t],
    );

    const onRevoke = useCallback(
        async (invite: AccountInviteDTO) => {
            try {
                await revokeAccountInvite(invite.id);
                message.success(t('links.accountInvites.revoked', 'Invite revoked'));
                await loadInvites();
            } catch {
                message.error(t('links.accountInvites.revokeFailed', 'Could not revoke invite'));
            }
        },
        [loadInvites, t],
    );

    // Selection follows the visible page: reloading (pagination, refresh after an
    // action) drops ids that are no longer listed or no longer selectable, so the
    // bulk actions can never act on stale rows.
    useEffect(() => {
        setSelectedIds((current) =>
            current.filter((id) => invites.some((invite) => invite.id === id && isBulkSelectable(invite))),
        );
    }, [invites]);

    const selectedInvites = useMemo(
        () => invites.filter((invite) => selectedIds.includes(invite.id) && isBulkSelectable(invite)),
        [invites, selectedIds],
    );

    // "Ausgewählte löschen" (#316): there is no hard-delete endpoint — revoke IS
    // the delete in this domain, which the confirmation dialog spells out. One
    // sequential revoke per row keeps failures attributable; they are collected
    // into a single summary instead of one toast per row.
    const onBulkRevokeConfirmed = useCallback(async () => {
        setBulkDeleteConfirmOpen(false);
        const targets = selectedInvites;
        if (targets.length === 0) return;
        setBulkRunning(true);
        const failedEmails: string[] = [];
        for (let i = 0; i < targets.length; i += 1) {
            try {
                // eslint-disable-next-line no-await-in-loop -- sequential on purpose: per-row attribution, no backend burst
                await revokeAccountInvite(targets[i].id);
            } catch {
                failedEmails.push(targets[i].recipientEmail);
            }
        }
        setBulkRunning(false);
        if (failedEmails.length === 0) {
            message.success(
                t('links.bulk.revokeSummaryAll', '{{count}} Einladungen widerrufen', { count: targets.length }),
            );
        } else {
            message.warning(
                t('links.bulk.revokeSummaryPartial', '{{revoked}} widerrufen, {{failed}} fehlgeschlagen: {{emails}}', {
                    revoked: targets.length - failedEmails.length,
                    failed: failedEmails.length,
                    emails: failedEmails.join(', '),
                }),
            );
        }
        setSelectedIds([]);
        await loadInvites();
    }, [loadInvites, selectedInvites, t]);

    // Bulk send (#316): the composer's send button acts on the selection — one
    // request per selected DRAFT/EMAIL_SENT row with the current template.
    // The VERB depends on the row's status, and getting it wrong destroys data:
    // `/resend` supersedes the invite it is handed, so sending a never-mailed
    // DRAFT through it left a dead "Ersetzt" row behind and minted a new invite
    // id. A DRAFT's first delivery is `/send`; only an EMAIL_SENT row is resent.
    // Failed rows stay selected (their checkbox marks them for a retry); a full
    // success clears the selection.
    const onBulkSend = useCallback(async () => {
        // No hidden fallback to activeTemplates[0] here: the composer is the ONE
        // gate for bulk send and requires an explicitly chosen template (#713),
        // so a silent second rule would send with a template nobody picked.
        const templateId = selectedTemplateId;
        if (!templateId) {
            message.error(t('links.accountInvites.templateRequired', 'Select a template first.'));
            return;
        }
        const targets = selectedInvites;
        if (targets.length === 0) return;
        setBulkRunning(true);
        const failed: AccountInviteDTO[] = [];
        // The first explained cause is shown once, above the count summary.
        let firstCause: string | null = null;
        for (let i = 0; i < targets.length; i += 1) {
            try {
                const deliver = targets[i].inviteStatus === 'DRAFT' ? sendAccountInvite : resendAccountInvite;
                // eslint-disable-next-line no-await-in-loop -- sequential on purpose: per-row attribution, no mail burst
                const delivered = await deliver(targets[i].id, {
                    acceptBaseUrl: acceptBaseUrlForRole(targets[i].targetRole),
                    templateId,
                });
                rememberGeneratedLink(delivered);
            } catch (error) {
                failed.push(targets[i]);
                // eslint-disable-next-line no-await-in-loop -- reads the failed response body
                const explained = await explain(
                    error,
                    targets[i].inviteStatus === 'DRAFT' ? 'send' : 'resend',
                    targets[i].targetRole,
                );
                if (explained.status != null) firstCause ??= explained.message;
                if (explained.stopsBatch) {
                    failed.push(...targets.slice(i + 1));
                    break;
                }
            }
        }
        setBulkRunning(false);
        if (firstCause) message.error(firstCause);
        if (failed.length === 0) {
            message.success(
                t('links.bulk.sendSummaryAll', '{{count}} Einladungen gesendet', { count: targets.length }),
            );
            setSelectedIds([]);
        } else {
            message.warning(
                t('links.bulk.sendSummaryPartial', '{{sent}} gesendet, {{failed}} fehlgeschlagen: {{emails}}', {
                    sent: targets.length - failed.length,
                    failed: failed.length,
                    emails: failed.map((invite) => invite.recipientEmail).join(', '),
                }),
            );
            setSelectedIds(failed.map((invite) => invite.id));
        }
        await loadInvites();
    }, [explain, loadInvites, rememberGeneratedLink, selectedInvites, selectedTemplateId, t]);

    // Empty-state CTA: the composer IS the invite entry point and sits right
    // above the board — bring it into view and focus its first field.
    const composerRef = useRef<HTMLDivElement>(null);
    const focusComposer = useCallback(() => {
        composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        composerRef.current?.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus({
            preventScroll: true,
        });
    }, []);

    return (
        <div ref={composerRef}>
            <InviteComposer
                // The Träger tab is platform-admin only and founds new Träger.
                defaultRole={targetRole === 'TENANT_ADMIN' ? 'TENANT_ADMIN' : 'COUNSELLOR'}
                allowedRoles={isTenantInvite ? ['TENANT_ADMIN'] : undefined}
                searchAgencies={includeAgencyField ? searchAgenciesForPicker : undefined}
                loadAgencyTopicPermission={loadAgencyTopicPermission}
                searchTenants={!isTenantInvite && isSuperAdmin ? searchTenantsForPicker : undefined}
                resolveTenant={findInviteTenant}
                resolveAgency={findInviteAgency}
                onSelfAssign={isTenantInvite ? undefined : (agency) => setSelfAssign({ agency })}
                includeAgencyField={includeAgencyField}
                ownTenant={currentTenantId != null ? { id: currentTenantId, name: ownTenantName } : undefined}
                ownAgency={ownAgency}
                viewerScope={viewerScope}
                initialTenantId={isTenantInvite ? undefined : currentTenantId}
                persistKey={targetRole}
                requireNames={targetRole === 'COUNSELLOR'}
                requireTenantId={isTenantInvite}
                searchPlaceholder={t('links.inviteProgress.searchPlaceholder', 'Einladungen durchsuchen')}
                searchQuery={searchQuery}
                selectionCount={selectedInvites.length}
                submitting={submitting || bulkRunning}
                templateId={selectedTemplateId}
                templates={templates}
                onBulkSend={onBulkSend}
                onClearSelection={() => setSelectedIds([])}
                onCsvParsed={(result, sendMode) => setCsvImport({ result, sendMode })}
                csvImportBlockedReason={
                    isAgencyViewer
                        ? t(
                              'links.csvImport.blockedAgencyAdmin',
                              'Nur Plattform- und Träger-Admins: Eine Datei kann Rollen und neue Beratungsstellen enthalten.',
                          )
                        : undefined
                }
                onDeleteSelected={() => setBulkDeleteConfirmOpen(true)}
                onManageTemplates={(intent) => setTemplatesDialogView(intent === 'create' ? 'create' : 'list')}
                // A4: the tab owns the query; the board filters the list it holds.
                onSearchQueryChange={setSearchQuery}
                // #746: the pill's chevron menu switches the template in place —
                // the same lifted selection the dialog picker writes.
                onSelectTemplate={setSelectedTemplateId}
                // "Neu aus „X"": open the dialog's create view prefilled from X.
                onCreateFromTemplate={(templateId) => {
                    setCreateFromTemplateId(templateId);
                    setTemplatesDialogView('create');
                }}
                onSubmit={onCreate}
            />
            {selectedInvites.length > 0 && (
                <div className={styles.selectionCount} role="status">
                    {t('links.bulk.selectedCount', '{{count}} ausgewählt', { count: selectedInvites.length })}
                </div>
            )}
            <InviteProgressBoard
                invites={invites}
                loading={loading}
                searchQuery={searchQuery}
                targetRole={targetRole}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                isRowSelectable={isBulkSelectable}
                selectionDisabled={bulkRunning}
                onResend={onResend}
                onCopyLink={(invite) => copyLink(generatedLinks[invite.id] ?? invite.acceptUrl)}
                onRevoke={onRevoke}
                onInviteCta={focusComposer}
                onTopicPermissionChange={isTenantInvite ? undefined : onTopicPermissionChange}
                topicPermissionSavingIds={topicSavingIds}
            />
            {selfAssign && (
                <SelfAssignDialog
                    initialAgency={selfAssign.agency}
                    searchAgencies={(query) => searchAgenciesForPicker(query, { tenantId: currentTenantId })}
                    loadAgencyTopics={loadAgencyTopics}
                    onClose={() => setSelfAssign(undefined)}
                    onAssigned={() => loadInvites()}
                />
            )}
            {bulkDeleteConfirmOpen && (
                <Modal
                    titleKey="links.bulk.deleteConfirmTitle"
                    icon={<DeleteOutlineOutlinedIcon />}
                    contentKey="links.bulk.deleteConfirmBody"
                    contentKeyOptions={{ count: selectedInvites.length }}
                    okLabelKey="links.bulk.deleteConfirmOk"
                    cancelLabelKey="links.bulk.deleteConfirmCancel"
                    onConfirm={onBulkRevokeConfirmed}
                    onClose={() => setBulkDeleteConfirmOpen(false)}
                />
            )}
            {csvImport && (
                <InviteCsvImportModal
                    createInvite={createCsvInvite}
                    invites={invites}
                    idKind={isTenantInvite ? 'tenant' : 'agency'}
                    tabRole={targetRole === 'TENANT_ADMIN' ? 'TENANT_ADMIN' : 'COUNSELLOR'}
                    templates={activeTemplates}
                    viewerScope={viewerScope}
                    tabRoles={isTenantInvite ? ['TENANT_ADMIN'] : undefined}
                    ownTenantKnown={currentTenantId != null}
                    parseResult={csvImport.result}
                    takenTenantIds={isTenantInvite ? takenTenantIds : undefined}
                    onClose={() => setCsvImport(null)}
                    onCreated={() => loadInvites()}
                />
            )}
            {templatesDialogView && (
                <EmailTemplatesDialog
                    initialView={templatesDialogView}
                    initialTemplateId={templatesDialogView === 'create' ? createFromTemplateId : undefined}
                    selectedTemplateId={selectedTemplateId}
                    templateKind={templateKind}
                    onClose={() => {
                        setTemplatesDialogView(null);
                        setCreateFromTemplateId(undefined);
                    }}
                    onChanged={onTemplateChanged}
                    // Picking in the overview selects for the composer and closes
                    // the dialog; create/edit stay inside the dialog itself.
                    onSelect={(template) => {
                        setSelectedTemplateId(template.id);
                        setTemplatesDialogView(null);
                    }}
                />
            )}
        </div>
    );
};

export const TenantInvitesTab = () => <AccountInvitesTab targetRole="TENANT_ADMIN" templateKind="TENANT_INVITE" />;

export const CounsellorInvitesTab = () => (
    <AccountInvitesTab targetRole="COUNSELLOR" templateKind="COUNSELLOR_INVITE" includeAgencyField />
);
