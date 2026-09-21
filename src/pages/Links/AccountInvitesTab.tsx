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
import { FETCH_ERRORS, X_REASON } from '../../api/fetchData';
import { searchTenantData } from '../../api/tenant/searchTenantData';
import type { AllocationMode } from '../../api/idAllocation/idAllocation';
import getAgencyDataById from '../../api/agency/getAgencyById';
import { searchInviteAgencies } from '../../api/agency/searchInviteAgencies';
import { Modal } from '../../components/Modal';
import {
    extractApiErrorMessageOrNull,
    extractSmtpSendFailure,
    type SmtpSendFailureDetail,
} from '../../utils/extractApiErrorMessage';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import type { ParseInviteCsvResult } from './csv/parseInviteCsv';
import { EmailTemplatesDialog } from './EmailTemplatesDialog';
import { InviteComposer, InviteComposerValues, InviteSendMode, InviteSubmitOutcome } from './InviteComposer';
import { InviteCsvImportModal, type InviteCsvCreateOutcome, type InviteCsvCreateRow } from './InviteCsvImportModal';
import { InviteProgressBoard } from './inviteProgress/InviteProgressBoard';
import { SelfAssignDialog, type SelfAssignTopic } from './SelfAssignDialog';
import { inviteConflictReasonKey, type InviteRole, type TopicPermission } from './inviteModel';
import type { IdUnitOption } from '../../components/IdAllocationField';
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
/** Agency allocation mode of one CSV row: an existing agency, a pinned new number, or the next free one. */
const csvAgencyAllocationMode = (row: InviteCsvCreateRow): AllocationMode => {
    if (row.target === 'EXISTING') return 'EXISTING';
    return row.id != null ? 'MANUAL' : 'AUTO';
};

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

/** One id per CSV file, so the backend can match rows of the same file in any order (#1026 slice 5). */
const newImportBatchId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `csv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Topics of an agency for the self-assignment dialog (AgencyService admin detail). */
const loadAgencyTopics = async (agencyId: number): Promise<SelfAssignTopic[]> => {
    const response = await getAgencyDataById(String(agencyId));
    // eslint-disable-next-line no-underscore-dangle -- HAL envelope, same as removeEmbedded
    const agency = response?._embedded ?? response;
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
        /** #1026 slice 5: one id for every row of this file. */
        batchId: string;
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

    const currentTenantId = parseUserAuthInfo().tenantId || undefined;
    const { isSuperAdmin } = useUserRoles();

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
                // The counsellor tab lists every role that JOINS a unit (#1026), so it
                // loads unfiltered and keeps its share below.
                // eslint-disable-next-line no-await-in-loop
                const response = await listAccountInvites({
                    page,
                    size: 200,
                    targetRole: isTenantInvite ? 'TENANT_ADMIN' : undefined,
                });
                all.push(...(response.content ?? []).filter((invite) => belongsToTab(invite, isTenantInvite)));
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
    }, [isTenantInvite, t]);

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

    /**
     * ONE specific toast per mail-delivery cause (UserService#1160).
     *
     * A 502 `{"reason":"SMTP_SEND_FAILED","detail":...}` means the invite itself
     * was fine and the MAIL could not be handed to SMTP. Before this the call
     * fell into `CATCH_ALL` and the admin got two generic toasts, so a
     * misconfigured platform looked like a flaky invite form and admins retried
     * an action that can never succeed until a platform admin fixes SMTP.
     * An unknown/absent category falls back to the neutral delivery message —
     * never guess a cause the backend did not name.
     */
    const smtpFailureMessageFor = useCallback(
        (detail: SmtpSendFailureDetail | null) => {
            switch (detail) {
                case 'SMTP_CREDENTIALS_MISSING':
                    return t(
                        'links.accountInvites.smtpCredentialsMissing',
                        'E-Mail-Versand nicht konfiguriert: SMTP-Zugangsdaten fehlen. Bitte Plattform-Admin kontaktieren.',
                    );
                case 'SMTP_DISABLED_OR_INCOMPLETE':
                    return t(
                        'links.accountInvites.smtpDisabledOrIncomplete',
                        'E-Mail-Versand ist deaktiviert oder unvollständig konfiguriert. Bitte Plattform-Admin kontaktieren.',
                    );
                case 'SMTP_SETTINGS_UNAVAILABLE':
                    return t(
                        'links.accountInvites.smtpSettingsUnavailable',
                        'E-Mail-Einstellungen konnten nicht geladen werden. Bitte später erneut versuchen oder Plattform-Admin kontaktieren.',
                    );
                case 'SMTP_TRANSPORT_FAILED':
                    return t(
                        'links.accountInvites.smtpTransportFailed',
                        'E-Mail-Server hat den Versand abgelehnt. Bitte Plattform-Admin kontaktieren.',
                    );
                default:
                    return t(
                        'links.accountInvites.smtpSendFailed',
                        'E-Mail konnte nicht versendet werden. Bitte Plattform-Admin kontaktieren.',
                    );
            }
        },
        [t],
    );

    /**
     * Shows the delivery toast and reports whether the error WAS a delivery
     * failure, so each caller can skip its own generic toast instead of
     * stacking a second, less informative one on top.
     */
    const reportSmtpFailure = useCallback(
        async (error: unknown): Promise<boolean> => {
            const failure = await extractSmtpSendFailure(error);
            if (!failure) {
                return false;
            }
            message.error(smtpFailureMessageFor(failure.detail));
            return true;
        },
        [smtpFailureMessageFor],
    );

    /** German explanation of a 409 whose `X-Reason` this package knows (#1026 slices 3 and 5). */
    const conflictMessage = useCallback(
        (error: unknown): string | null => {
            if (!(error instanceof Response) || error.status !== 409) return null;
            const known = inviteConflictReasonKey(error.headers.get(FETCH_ERRORS.X_REASON));
            return known ? t(...known) : null;
        },
        [t],
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
            (await searchInviteAgencies(query, tenantId)).map(({ id, name, topics }) => ({ id, name, topics })),
        [],
    );

    const onCreate = useCallback(
        async (values: InviteComposerValues): Promise<InviteSubmitOutcome> => {
            setSubmitting(true);
            // #1026 slice 3: the bar's "Rolle" is the invite's target role.
            const inviteRole: InviteRole = values.role ?? (isTenantInvite ? 'TENANT_ADMIN' : 'COUNSELLOR');
            try {
                // Department routing (#384) is the backend's job since #1026: an
                // EXISTING agency adopts its only topic server-side (UserService#1212),
                // several topics are picked in onboarding per the topic permission
                // (#1213), and a NEW agency (a reserved number) has no topic yet —
                // the invite waits for it (#1216). The old client-side lookup had
                // nothing left to decide.
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
                    const explained = conflictMessage(error);
                    if (explained) {
                        message.error(explained);
                        return false;
                    }
                    if (isTenantInvite) {
                        message.error(t('links.accountInvites.tenantIdTaken', 'This tenant ID is already taken.'));
                        return false;
                    }
                }
                // 502 = the invite could not be MAILED (UserService#1160). The
                // backend rolls the invite back when it knows nothing was sent and
                // keeps it when delivery is uncertain, so reload rather than assume
                // either — and never show the generic create-failed text on top.
                if (await reportSmtpFailure(error)) {
                    await loadInvites();
                    return false;
                }
                // 403 = the admin's ROLE cannot create administrative accounts
                // (UserService#1006). Prefer the backend's own explanation; fall back
                // to a translated role hint. Never the generic create-failed text —
                // that left the admin retrying an action their role can never perform.
                if (error instanceof Response && error.status === 403) {
                    message.error((await extractApiErrorMessageOrNull(error)) ?? forbiddenFallbackFor(inviteRole));
                    return false;
                }
                message.error(t('links.error.createFailed', 'Could not create link'));
                return false;
            } finally {
                setSubmitting(false);
            }
        },
        [
            conflictMessage,
            forbiddenFallbackFor,
            isTenantInvite,
            loadInvites,
            rememberGeneratedLink,
            reportSmtpFailure,
            t,
        ],
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
                importBatchId: csvImport.batchId,
                alsoCounsellor: row.alsoCounsellor,
                topicPermission: row.topicPermission,
                // #1026: a row may name its own template ("Vorlage"); empty = the bar's.
                templateId:
                    csvImport.sendMode === 'direct'
                        ? row.templateId ?? selectedTemplateId ?? activeTemplates[0]?.id
                        : undefined,
                ...unitFields,
            });
            return {
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
                const backend = error instanceof Response ? await extractApiErrorMessageOrNull(error) : null;
                message.error(
                    backend ??
                        t(
                            'links.accountInvites.topicPermissionFailed',
                            'Die Themen-Berechtigung konnte nicht geändert werden.',
                        ),
                );
            } finally {
                setTopicSavingIds((ids) => ids.filter((id) => id !== invite.id));
            }
        },
        [t],
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
                // Mail delivery failed (UserService#1160): the invite is untouched —
                // the backend writes EMAIL_SENT only after SMTP confirms — so the row
                // stays as it was and the admin can retry once SMTP is fixed.
                if (await reportSmtpFailure(error)) {
                    await loadInvites();
                    return;
                }
                // Same role surfacing as onCreate (UserService#1006).
                if (error instanceof Response && error.status === 403) {
                    message.error(
                        (await extractApiErrorMessageOrNull(error)) ?? forbiddenFallbackFor(invite.targetRole),
                    );
                    return;
                }
                // #1026 slice 5: 409 UNIT_NOT_CREATED — the unit it waits for is not there yet.
                const explained = conflictMessage(error);
                if (explained) {
                    message.error(explained);
                    return;
                }
                message.error(t('links.accountInvites.resendFailed', 'Could not resend invite'));
            }
        },
        [
            conflictMessage,
            activeTemplates,
            forbiddenFallbackFor,
            loadInvites,
            rememberGeneratedLink,
            reportSmtpFailure,
            selectedTemplateId,
            t,
        ],
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
        // Same for a 502 SMTP failure (UserService#1160): mail is misconfigured for
        // the whole platform, so every remaining row would fail identically.
        let firstSmtpFailure: Response | null = null;
        // #1026 slice 5: the first explained 409 (e.g. UNIT_NOT_CREATED), shown once.
        let firstConflict: string | null = null;
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
                firstConflict ??= conflictMessage(error);
                if (error instanceof Response && error.status === 502) {
                    firstSmtpFailure ??= error;
                    failed.push(...targets.slice(i + 1));
                    break;
                }
                if (error instanceof Response && error.status === 403) {
                    // A role-level 403 fails EVERY remaining row the same way
                    // (UserService#1006) — mark them failed and stop, instead of
                    // firing one doomed request per row. Same early-stop as the
                    // CSV import.
                    firstForbidden ??= error;
                    failed.push(...targets.slice(i + 1));
                    break;
                }
            }
        }
        setBulkRunning(false);
        if (firstForbidden) {
            message.error((await extractApiErrorMessageOrNull(firstForbidden)) ?? forbiddenFallbackFor(targetRole));
        }
        // The delivery cause first, then the count summary below: the admin needs
        // to know WHY before deciding whether a retry can ever work. Selected rows
        // stay DRAFT, so retrying after SMTP is fixed sends exactly these again.
        if (firstSmtpFailure) {
            await reportSmtpFailure(firstSmtpFailure);
        }
        if (firstConflict) {
            message.error(firstConflict);
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
    }, [
        conflictMessage,
        forbiddenFallbackFor,
        loadInvites,
        rememberGeneratedLink,
        reportSmtpFailure,
        selectedInvites,
        selectedTemplateId,
        targetRole,
        t,
    ]);

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
                // #1026: the Träger tab is platform-admin only and founds NEW Träger;
                // on the counsellor tab a tenant admin is pinned to their own Träger
                // and "Rolle" offers what the viewer may hand out (slice 3).
                defaultRole={targetRole === 'TENANT_ADMIN' ? 'TENANT_ADMIN' : 'COUNSELLOR'}
                allowedRoles={isTenantInvite ? ['TENANT_ADMIN'] : undefined}
                // #1026 slice 2: the Beratungsstelle type-ahead finds existing agencies
                // (AgencyService#307); slice 4: the platform admin's Träger type-ahead
                // finds existing Träger on the counsellor tab.
                searchAgencies={includeAgencyField ? searchAgenciesForPicker : undefined}
                searchTenants={!isTenantInvite && isSuperAdmin ? searchTenantsForPicker : undefined}
                onSelfAssign={isTenantInvite ? undefined : (agency) => setSelfAssign({ agency })}
                includeAgencyField={includeAgencyField}
                ownTenant={currentTenantId != null ? { id: currentTenantId } : undefined}
                viewerScope={isTenantInvite || isSuperAdmin ? 'platform' : 'tenant'}
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
                onCsvParsed={(result, sendMode) => setCsvImport({ result, sendMode, batchId: newImportBatchId() })}
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
                    viewerScope={isSuperAdmin ? 'platform' : 'tenant'}
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
                    forbiddenFallback={forbiddenFallbackFor(targetRole)}
                    idKind={isTenantInvite ? 'tenant' : 'agency'}
                    tabRole={targetRole === 'TENANT_ADMIN' ? 'TENANT_ADMIN' : 'COUNSELLOR'}
                    templates={activeTemplates}
                    viewerScope={isTenantInvite || isSuperAdmin ? 'platform' : 'tenant'}
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
