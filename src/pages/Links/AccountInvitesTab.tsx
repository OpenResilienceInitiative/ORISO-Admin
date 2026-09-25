import { message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
    acceptBaseUrlForRole,
    type CreateAccountInviteRequest,
    AccountInviteDTO,
    AccountInviteTargetRole,
    createAccountInvite,
    InviteEmailTemplateDTO,
    InviteEmailTemplateKind,
    listInviteEmailTemplates,
    resendAccountInvite,
    revokeAccountInvite,
    updateAccountInviteTopicPermission,
} from '../../api/accountInvites/accountInvites';
import { addConsultantRole, changeAccountInviteRole } from '../../api/accountInvites/inviteRoles';
import { searchTenantData } from '../../api/tenant/searchTenantData';
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
import { InviteComposer, type InviteSendMode, type InviteSubmitOutcome } from './InviteComposer';
import { InviteCsvImportModal, type InviteCsvCreateOutcome, type InviteCsvCreateRow } from './InviteCsvImportModal';
import { InviteProgressBoard } from './inviteProgress/InviteProgressBoard';
import { SelfAssignDialog, type SelfAssignTopic } from './SelfAssignDialog';
import type { InviteRole, InviteViewerScope, TopicPermission } from './inviteModel';
import { explainInviteError, type InviteErrorContext } from './explainInviteError';
import { toCreateInviteRequest } from './inviteRequest';
import { isBulkSelectable, type InviteTab } from './inviteRules';
import { useInviteBulk } from './useInviteBulk';
import { useInviteList } from './useInviteList';
import type { IdUnitOption } from '../../components/IdAllocationField';
import styles from './styles.module.scss';

interface AccountInvitesTabProps {
    targetRole: AccountInviteTargetRole;
    templateKind: InviteEmailTemplateKind;
    includeAgencyField?: boolean;
}

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
            tenantId: agency.tenantId != null ? Number(agency.tenantId) : undefined,
            tenantName: agency.tenantName ?? undefined,
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
    const [templates, setTemplates] = useState<InviteEmailTemplateDTO[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();
    const [generatedLinks, setGeneratedLinks] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [templatesDialogView, setTemplatesDialogView] = useState<'list' | 'create' | null>(null);
    // "Neu aus „X"" (#746): source template the create view prefills from.
    const [createFromTemplateId, setCreateFromTemplateId] = useState<number | undefined>();
    // CSV import (#315): parse result + the send mode captured when the file was picked.
    const [csvImport, setCsvImport] = useState<{
        result: ParseInviteCsvResult;
        sendMode: InviteSendMode;
    } | null>(null);
    // undefined = closed; `{}` = open without a preset agency.
    const [selfAssign, setSelfAssign] = useState<{ agency?: IdUnitOption } | undefined>();
    const [topicSavingIds, setTopicSavingIds] = useState<number[]>([]);
    const [roleSavingIds, setRoleSavingIds] = useState<number[]>([]);
    // The list does not carry an account's added roles; remember the ones added here.
    const [grantedRoles, setGrantedRoles] = useState<Record<number, InviteRole[]>>({});
    // Toolbar search (A4/#376). The tab already holds the COMPLETE invite list
    // (see loadInvites) and the board already filters it client-side by status
    // bucket, so the query joins that same client-side pipeline instead of
    // introducing a second, server-paged source the summary counts could not be
    // derived from.
    const [searchQuery, setSearchQuery] = useState('');

    // tenantId is a STRING in the JWT: "0" (platform admin) is truthy, so only > 0 is a real own Träger.
    const jwtTenantId = Number(parseUserAuthInfo().tenantId);
    const currentTenantId = Number.isFinite(jwtTenantId) && jwtTenantId > 0 ? jwtTenantId : undefined;
    const { isSuperAdmin, hasRole } = useUserRoles();
    const isTenantInvite = targetRole === 'TENANT_ADMIN';
    // The Träger tab is platform-only.
    const viewerScope: InviteViewerScope = isTenantInvite
        ? 'platform'
        : resolveInviteViewerScope({ isSuperAdmin, hasRole });
    const isAgencyViewer = viewerScope === 'agency';
    const tab: InviteTab = isTenantInvite ? 'tenant' : 'counsellor';
    const { invites, setInvites, loading, reload: loadInvites } = useInviteList(tab, viewerScope);

    // The backend scopes the agency search per role, so an empty query returns
    // exactly the agency admin's own agencies.
    const [ownAgencies, setOwnAgencies] = useState<InviteAgencyHit[]>([]);
    const [ownAgencyTotal, setOwnAgencyTotal] = useState(0);
    useEffect(() => {
        if (!isAgencyViewer) return undefined;
        let cancelled = false;
        searchInviteAgencies('', currentTenantId)
            .then(({ hits, total }) => {
                if (cancelled) return;
                setOwnAgencies(hits);
                setOwnAgencyTotal(total);
            })
            .catch(() => {
                // The field stays a scoped pick; the backend still refuses foreign agencies.
            });
        return () => {
            cancelled = true;
        };
    }, [isAgencyViewer, currentTenantId]);
    const ownAgency = useMemo<IdUnitOption | undefined>(
        () =>
            ownAgencies.length === 1 && ownAgencyTotal <= 1
                ? { id: ownAgencies[0].id, name: ownAgencies[0].name }
                : undefined,
        [ownAgencies, ownAgencyTotal],
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
    const bulk = useInviteBulk({ invites, reload: loadInvites, explain, rememberGeneratedLink });

    // The platform admin picks an existing Träger by name.
    const searchTenantsForPicker = useCallback(async (query: string, page = 1) => {
        const perPage = 10;
        const response = await searchTenantData({ search: query, perPage, page });
        const total = Number(response.total ?? 0);
        return {
            units: (response.data ?? [])
                .filter((tenant) => tenant.id != null && Number(tenant.id) > 0)
                .map((tenant) => ({ id: Number(tenant.id), name: tenant.name ?? undefined })),
            hasMore: page * perPage < total,
            total,
        };
    }, []);

    const searchAgenciesForPicker = useCallback(
        async (query: string, { tenantId, page = 1 }: { tenantId?: number; page?: number }) => {
            const result = await searchInviteAgencies(query, tenantId, page);
            return {
                units: result.hits.map(
                    ({ id, name, topics, tenantId: agencyTenantId, tenantName, topicPermission }) => ({
                        id,
                        name,
                        topics,
                        tenantId: agencyTenantId,
                        tenantName,
                        topicPermission,
                    }),
                ),
                hasMore: result.hasMore,
                page: result.page,
                // With a Träger chosen, the platform admin's server total counts every Träger.
                total: viewerScope !== 'platform' || tenantId == null ? result.total : undefined,
            };
        },
        [viewerScope],
    );

    const onCreate = useCallback(
        async (request: CreateAccountInviteRequest): Promise<InviteSubmitOutcome> => {
            setSubmitting(true);
            try {
                const created = await createAccountInvite(request);
                rememberGeneratedLink(created);
                if (created?.inviteStatus === 'WAITING_FOR_UNIT') {
                    // Stored, not sent: say when it will go out.
                    message.info(
                        t(
                            'links.accountInvites.createdWaiting',
                            'Einladung vorgemerkt: Sie geht automatisch raus, sobald die Beratungsstelle angelegt ist.',
                        ),
                    );
                } else {
                    message.success(
                        request.templateId != null
                            ? t('links.accountInvites.created', 'Invite sent')
                            : t('links.accountInvites.createdNoEmail', 'Recipient created without sending an email'),
                    );
                }
                await loadInvites();
                return created ?? true;
            } catch (error) {
                const explained = await explain(error, 'create', request.targetRole);
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
            const created = await createAccountInvite(
                toCreateInviteRequest(
                    { kind: 'csv', ...row },
                    {
                        tab,
                        viewer: viewerScope,
                        sendMode: csvImport.sendMode,
                        ownTenantId: currentTenantId,
                        fallbackTemplateId: selectedTemplateId ?? activeTemplates[0]?.id,
                    },
                ),
            );
            return {
                inviteId: created?.id,
                waiting: created?.inviteStatus === 'WAITING_FOR_UNIT',
                noUnitAdmin: created?.queueProblem === 'NO_UNIT_ADMIN',
            };
        },
        [activeTemplates, csvImport, currentTenantId, isTenantInvite, selectedTemplateId, viewerScope],
    );

    // Optimistic: the chip shows the new level at once; a failed save puts the old one back.
    const onTopicPermissionChange = useCallback(
        async (invite: AccountInviteDTO, topicPermission: TopicPermission) => {
            const previous = invite.topicPermission;
            const setRowPermission = (value: AccountInviteDTO['topicPermission'], patch?: AccountInviteDTO) =>
                setInvites((current) =>
                    current.map((row) => (row.id === invite.id ? { ...row, ...patch, topicPermission: value } : row)),
                );
            setRowPermission(topicPermission);
            setTopicSavingIds((ids) => [...ids, invite.id]);
            try {
                const updated = await updateAccountInviteTopicPermission(invite.id, topicPermission);
                setRowPermission(topicPermission, updated);
                message.success(t('links.accountInvites.topicPermissionSaved', 'Themen-Berechtigung gespeichert'), 2);
            } catch (error) {
                setRowPermission(previous);
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

    const withRoleSaving = useCallback(async (inviteId: number, run: () => Promise<void>) => {
        setRoleSavingIds((ids) => [...ids, inviteId]);
        try {
            await run();
        } finally {
            setRoleSavingIds((ids) => ids.filter((id) => id !== inviteId));
        }
    }, []);

    const onRoleChange = useCallback(
        (invite: AccountInviteDTO, role: InviteRole) =>
            withRoleSaving(invite.id, async () => {
                if (role === 'TENANT_ADMIN') return;
                try {
                    const updated = await changeAccountInviteRole(invite.id, { targetRole: role });
                    // A role change can move other rows of the same new unit through the queue.
                    await loadInvites();
                    if (invite.inviteStatus !== 'EMAIL_SENT') {
                        message.success(t('links.accountInvites.roleChanged', 'Rolle geändert.'));
                        return;
                    }
                    // The link stays valid, but the mail already sent named the old role: offer, never force, a resend.
                    const key = `role-changed-${invite.id}`;
                    message.success({
                        key,
                        duration: 8,
                        content: (
                            <span className={styles.snackbar}>
                                {t(
                                    'links.accountInvites.roleChangedMailOutdated',
                                    'Rolle geändert. Die Einladungs-Mail nennt noch die alte Rolle.',
                                )}
                                <button
                                    type="button"
                                    className={styles.snackbarAction}
                                    onClick={() => {
                                        message.destroy(key);
                                        onResend(updated ?? invite);
                                    }}
                                >
                                    {t('links.accountInvites.resendAfterRoleChange', 'Erneut senden')}
                                </button>
                            </span>
                        ),
                    });
                } catch (error) {
                    message.error((await explain(error, 'roleChange', role)).message);
                }
            }),
        [explain, loadInvites, onResend, t, withRoleSaving],
    );

    const onRoleAdd = useCallback(
        (invite: AccountInviteDTO, role: InviteRole) =>
            withRoleSaving(invite.id, async () => {
                if (role !== 'AGENCY_ADMIN' || !invite.provisionedUserId) return;
                const markGranted = () =>
                    setGrantedRoles((current) => ({
                        ...current,
                        [invite.id]: [...(current[invite.id] ?? []), role],
                    }));
                try {
                    await addConsultantRole(invite.provisionedUserId, {
                        role,
                        agencyId: invite.agencyId ?? undefined,
                    });
                    markGranted();
                    message.success(t('links.accountInvites.roleAdded', '„auch BST-Admin“ hinzugefügt.'));
                } catch (error) {
                    const explained = await explain(error, 'roleAdd', role);
                    if (explained.reason === 'ROLE_ALREADY_GRANTED') markGranted();
                    message.error(explained.message);
                }
            }),
        [explain, t, withRoleSaving],
    );

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
                tab={tab}
                persistKey={targetRole}
                viewer={{
                    scope: viewerScope,
                    ownTenant: currentTenantId != null ? { id: currentTenantId, name: ownTenantName } : undefined,
                    ownAgency,
                }}
                clients={{
                    searchTenants: !isTenantInvite && isSuperAdmin ? searchTenantsForPicker : undefined,
                    searchAgencies: includeAgencyField ? searchAgenciesForPicker : undefined,
                    resolveTenant: findInviteTenant,
                    resolveAgency: findInviteAgency,
                    loadAgencyTopicPermission,
                }}
                templates={{
                    list: templates,
                    selectedId: selectedTemplateId,
                    onSelect: setSelectedTemplateId,
                    onManage: (intent) => setTemplatesDialogView(intent === 'create' ? 'create' : 'list'),
                    onCreateFrom: (templateId) => {
                        setCreateFromTemplateId(templateId);
                        setTemplatesDialogView('create');
                    },
                }}
                search={{
                    query: searchQuery,
                    onChange: setSearchQuery,
                    placeholder: t('links.inviteProgress.searchPlaceholder', 'Einladungen durchsuchen'),
                }}
                csv={{
                    onParsed: (result, sendMode) => setCsvImport({ result, sendMode }),
                    blockedReason: isAgencyViewer
                        ? t(
                              'links.csvImport.blockedAgencyAdmin',
                              'Nur Plattform- und Träger-Admins: Eine Datei kann Rollen und neue Beratungsstellen enthalten.',
                          )
                        : undefined,
                }}
                bulk={{
                    count: bulk.selectedInvites.length,
                    onSend: () => bulk.send(selectedTemplateId),
                    onClear: () => bulk.setSelectedIds([]),
                    onDeleteSelected: () => bulk.setConfirmRevokeOpen(true),
                }}
                submitting={submitting || bulk.running}
                onSelfAssign={isTenantInvite ? undefined : (agency) => setSelfAssign({ agency })}
                onSubmit={onCreate}
            />
            {bulk.selectedInvites.length > 0 && (
                <div className={styles.selectionCount} role="status">
                    {t('links.bulk.selectedCount', '{{count}} ausgewählt', { count: bulk.selectedInvites.length })}
                </div>
            )}
            <InviteProgressBoard
                invites={invites}
                loading={loading}
                searchQuery={searchQuery}
                targetRole={targetRole}
                selectedIds={bulk.selectedIds}
                onSelectionChange={bulk.setSelectedIds}
                isRowSelectable={isBulkSelectable}
                selectionDisabled={bulk.running}
                onResend={onResend}
                onCopyLink={(invite) => copyLink(generatedLinks[invite.id] ?? invite.acceptUrl)}
                onRevoke={onRevoke}
                onInviteCta={focusComposer}
                onTopicPermissionChange={isTenantInvite ? undefined : onTopicPermissionChange}
                topicPermissionSavingIds={topicSavingIds}
                viewerScope={viewerScope}
                onRoleChange={isTenantInvite ? undefined : onRoleChange}
                onRoleAdd={isTenantInvite ? undefined : onRoleAdd}
                roleSavingIds={roleSavingIds}
                grantedRoles={grantedRoles}
            />
            {selfAssign && (
                <SelfAssignDialog
                    initialAgency={selfAssign.agency}
                    searchAgencies={(query, page) =>
                        searchAgenciesForPicker(query, { tenantId: currentTenantId, page })
                    }
                    loadAgencyTopics={loadAgencyTopics}
                    onClose={() => setSelfAssign(undefined)}
                    onAssigned={() => loadInvites()}
                />
            )}
            {bulk.confirmRevokeOpen && (
                <Modal
                    titleKey="links.bulk.deleteConfirmTitle"
                    icon={<DeleteOutlineOutlinedIcon />}
                    contentKey="links.bulk.deleteConfirmBody"
                    contentKeyOptions={{ count: bulk.selectedInvites.length }}
                    okLabelKey="links.bulk.deleteConfirmOk"
                    cancelLabelKey="links.bulk.deleteConfirmCancel"
                    onConfirm={bulk.revokeConfirmed}
                    onClose={() => bulk.setConfirmRevokeOpen(false)}
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
