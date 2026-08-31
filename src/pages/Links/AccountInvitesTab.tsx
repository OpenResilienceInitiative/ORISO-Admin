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
} from '../../api/accountInvites/accountInvites';
import { FETCH_ERRORS, X_REASON } from '../../api/fetchData';
import { searchTenantData } from '../../api/tenant/searchTenantData';
import getAgencyDataById, { AgencyAccessError } from '../../api/agency/getAgencyById';
import { Modal } from '../../components/Modal';
import { extractApiErrorMessageOrNull } from '../../utils/extractApiErrorMessage';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import type { ParseInviteCsvResult } from './csv/parseInviteCsv';
import { EmailTemplatesDialog } from './EmailTemplatesDialog';
import { InviteComposer, InviteComposerValues, InviteSendMode, InviteSubmitOutcome } from './InviteComposer';
import { InviteCsvImportModal, type InviteCsvCreateRow } from './InviteCsvImportModal';
import { InviteProgressBoard } from './inviteProgress/InviteProgressBoard';
import styles from './styles.module.scss';

interface AccountInvitesTabProps {
    targetRole: AccountInviteTargetRole;
    templateKind: InviteEmailTemplateKind;
    includeAgencyField?: boolean;
}

/**
 * Bulk actions (#316) only make sense while an invite can still change:
 * DRAFT can be sent, EMAIL_SENT can be resent, and both can be revoked.
 * Terminal states (ACCEPTED/EXPIRED/REVOKED/SUPERSEDED) are not selectable.
 */
const isBulkSelectable = (invite: AccountInviteDTO) =>
    invite.inviteStatus === 'DRAFT' || invite.inviteStatus === 'EMAIL_SENT';

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
    const [csvImport, setCsvImport] = useState<{ result: ParseInviteCsvResult; sendMode: InviteSendMode } | null>(null);
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

    const currentTenantId = parseUserAuthInfo().tenantId || undefined;

    // Client-side taken-id knowledge (existing tenants + still-active
    // DRAFT/EMAIL_SENT TENANT_ADMIN invites). The composer's ID field itself now
    // validates against the authoritative allocation endpoints (#570); this set
    // only pre-flags collisions in the CSV import preview.
    const isTenantInvite = targetRole === 'TENANT_ADMIN';
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
                // eslint-disable-next-line no-await-in-loop
                const response = await listAccountInvites({ page, size: 200, targetRole });
                all.push(...(response.content ?? []));
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
    }, [targetRole, t]);

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

    // Role-aware fallback for a 403 without a usable backend message
    // (UserService#1006): the same component serves the Träger-admin AND the
    // counsellor tab, so the explanation must name the role that could not be
    // invited instead of always talking about Träger-Admins.
    const forbiddenFallbackFor = useCallback(
        (role: AccountInviteTargetRole) =>
            role === 'COUNSELLOR'
                ? t(
                      'links.accountInvites.forbiddenCounsellor',
                      'Ihre Rolle ist nicht berechtigt, Berater*innen einzuladen.',
                  )
                : t(
                      'links.accountInvites.forbiddenTenantAdmin',
                      'Nur Plattform-Administratoren können Träger-Admins einladen.',
                  ),
        [t],
    );

    const onCreate = useCallback(
        async (values: InviteComposerValues): Promise<InviteSubmitOutcome> => {
            setSubmitting(true);
            try {
                // Department routing (#384): a counsellor must arrive with the
                // routing a consultant needs before enquiries become visible —
                // tenant, agency AND department/topic. When the pinned
                // Beratungsstellen-ID resolves to an existing agency, the invite
                // adopts that agency's single canonical topic as the department,
                // after verifying the agency really belongs to the invite's
                // tenant. A fresh reservation (AUTO, or a manual id the U2 check
                // confirmed free) resolves to nothing — the agency does not
                // exist yet, so there is no topic to route to and provisioning
                // assigns routing when the agency is created on accept.
                let departmentId: number | undefined;
                if (targetRole === 'COUNSELLOR' && values.agencyId != null) {
                    let agencyResponse = null;
                    try {
                        agencyResponse = await getAgencyDataById(String(values.agencyId));
                    } catch (error) {
                        if (!(error instanceof AgencyAccessError)) {
                            // Network/5xx: getAgencyDataById already toasted the
                            // cause; the outer catch adds the create-failed state.
                            throw error;
                        }
                        // 404/403 = no existing (visible) agency behind the id —
                        // the reservation case. Proceed without a department.
                    }
                    if (agencyResponse != null) {
                        // eslint-disable-next-line no-underscore-dangle -- HAL envelope, same as removeEmbedded
                        const agency = agencyResponse?._embedded ?? agencyResponse;
                        if (values.tenantId != null && Number(agency?.tenantId) !== values.tenantId) {
                            message.error(
                                t(
                                    'links.accountInvites.agencyTenantMismatch',
                                    'Die Beratungsstelle gehört nicht zum Träger dieser Einladung.',
                                ),
                            );
                            return false;
                        }
                        const topics = agency?.topics ?? [];
                        if (topics.length > 1) {
                            // Multi-topic agencies need an explicit department
                            // choice the composer does not offer yet — refuse
                            // instead of guessing a topic (#384 follow-up).
                            message.error(
                                t(
                                    'links.accountInvites.agencyTopicAmbiguous',
                                    'Die Beratungsstelle hat mehrere Themen — die Einladung kann noch keinem Thema zugeordnet werden.',
                                ),
                            );
                            return false;
                        }
                        departmentId = Number(topics[0]?.id);
                        if (topics.length === 0 || !Number.isFinite(departmentId)) {
                            message.error(
                                t(
                                    'links.accountInvites.agencyTopicMissing',
                                    'Die Beratungsstelle hat kein Thema — die Einladung kann nicht zugeordnet werden.',
                                ),
                            );
                            return false;
                        }
                    }
                }
                const created = await createAccountInvite({
                    // Role-aware target (TEN-INV U6/U8): tenant admins land on the
                    // public Admin onboarding route, everyone else on the app layer.
                    acceptBaseUrl: acceptBaseUrlForRole(targetRole),
                    agencyId: values.agencyId,
                    // Allocation contract (#569/#570): AUTO = backend assigns the
                    // smallest free id; MANUAL ids were pre-validated in the field
                    // and are re-checked authoritatively on create.
                    agencyIdAllocationMode: values.agencyIdAllocationMode,
                    tenantIdAllocationMode: values.tenantIdAllocationMode,
                    departmentId,
                    expiresInDays: 30,
                    firstName: values.firstName,
                    lastName: values.lastName,
                    recipientEmail: values.recipientEmail,
                    targetRole,
                    // "Empfänger nur anlegen": the API creates without sending when
                    // templateId is omitted (JSON.stringify drops the undefined key).
                    templateId: values.sendMode === 'direct' ? values.templateId : undefined,
                    tenantId: values.tenantId,
                });
                rememberGeneratedLink(created);
                message.success(
                    values.sendMode === 'direct'
                        ? t('links.accountInvites.created', 'Invite sent')
                        : t('links.accountInvites.createdNoEmail', 'Recipient created without sending an email'),
                );
                await loadInvites();
                return true;
            } catch (error) {
                // The backend answers 409 for more than one reason (see
                // createAccountInvite's CONFLICT_WITH_RESPONSE handling), so the typed
                // X-Reason decides which specific message the admin gets.
                if (error instanceof Response && error.status === 409) {
                    // P3: the recipient address already belongs to a registered user.
                    // This one belongs ON the e-mail field, not in a global toast —
                    // the admin has to correct that exact input, and the rest of the
                    // row must survive. The composer renders it inline.
                    if (error.headers.get(FETCH_ERRORS.X_REASON) === X_REASON.EMAIL_NOT_AVAILABLE) {
                        return 'emailTaken';
                    }
                    if (isTenantInvite) {
                        message.error(t('links.accountInvites.tenantIdTaken', 'This tenant ID is already taken.'));
                        return false;
                    }
                }
                // 403 = the admin's ROLE cannot create administrative accounts
                // (UserService#1006). Prefer the backend's own explanation; fall back
                // to a translated role hint. Never the generic create-failed text —
                // that left the admin retrying an action their role can never perform.
                if (error instanceof Response && error.status === 403) {
                    message.error((await extractApiErrorMessageOrNull(error)) ?? forbiddenFallbackFor(targetRole));
                    return false;
                }
                message.error(t('links.error.createFailed', 'Could not create link'));
                return false;
            } finally {
                setSubmitting(false);
            }
        },
        [forbiddenFallbackFor, isTenantInvite, loadInvites, rememberGeneratedLink, targetRole, t],
    );

    // One row of the CSV batch. Uses the send mode captured at file-pick time:
    // direct = with templateId (falling back to the single active template, like
    // resend), create-only = without. Rejections propagate — the modal marks the
    // row (409 = id collision) instead of aborting the batch.
    const createCsvInvite = useCallback(
        async (row: InviteCsvCreateRow) => {
            if (!csvImport) return;
            await createAccountInvite({
                acceptBaseUrl: acceptBaseUrlForRole(targetRole),
                expiresInDays: 30,
                firstName: row.firstName,
                lastName: row.lastName,
                recipientEmail: row.recipientEmail,
                targetRole,
                templateId: csvImport.sendMode === 'direct' ? selectedTemplateId ?? activeTemplates[0]?.id : undefined,
                // The file's id column addresses the id space of this tab. On the Träger
                // tab it IS the tenant id (batch-assigned in the preview). Every other tab
                // invites into the admin's own tenant, and its id column addresses the
                // agency space, which exists only as a reservation (TEN-INV-U2): an
                // explicit id is pinned MANUAL and answered with 409 when taken, an empty
                // cell asks AgencyService for the smallest free one. No tenant allocation
                // mode here — UserService rejects it on non-Träger invites with a 400.
                ...(isTenantInvite
                    ? { tenantId: row.id }
                    : {
                          tenantId: currentTenantId,
                          agencyId: row.id,
                          agencyIdAllocationMode: row.id != null ? 'MANUAL' : 'AUTO',
                      }),
            });
        },
        [activeTemplates, csvImport, currentTenantId, isTenantInvite, selectedTemplateId, targetRole],
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
                // Same role surfacing as onCreate (UserService#1006).
                if (error instanceof Response && error.status === 403) {
                    message.error(
                        (await extractApiErrorMessageOrNull(error)) ?? forbiddenFallbackFor(invite.targetRole),
                    );
                    return;
                }
                message.error(t('links.accountInvites.resendFailed', 'Could not resend invite'));
            }
        },
        [activeTemplates, forbiddenFallbackFor, loadInvites, rememberGeneratedLink, selectedTemplateId, t],
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
        // A 403 fails EVERY row for the same role reason (UserService#1006) — remember
        // the first one so the admin gets the cause once, on top of the count summary.
        let firstForbidden: Response | null = null;
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
                if (firstForbidden == null && error instanceof Response && error.status === 403) {
                    firstForbidden = error;
                }
                failed.push(targets[i]);
            }
        }
        setBulkRunning(false);
        if (firstForbidden) {
            message.error((await extractApiErrorMessageOrNull(firstForbidden)) ?? forbiddenFallbackFor(targetRole));
        }
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
    }, [forbiddenFallbackFor, loadInvites, rememberGeneratedLink, selectedInvites, selectedTemplateId, targetRole, t]);

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
                includeAgencyField={includeAgencyField}
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
            />
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
                    forbiddenFallback={forbiddenFallbackFor(targetRole)}
                    idKind={isTenantInvite ? 'tenant' : 'agency'}
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
