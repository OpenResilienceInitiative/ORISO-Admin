import { Button, message, Tag } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    accountInviteAcceptBaseUrl,
    AccountInviteDTO,
    AccountInviteTargetRole,
    createAccountInvite,
    InviteEmailTemplateDTO,
    InviteEmailTemplateKind,
    listAccountInvites,
    listInviteEmailTemplates,
    resendAccountInvite,
    revokeAccountInvite,
} from '../../api/accountInvites/accountInvites';
import { searchTenantData } from '../../api/tenant/searchTenantData';
import getAgencyDataById from '../../api/agency/getAgencyById';
import { ListingTable, listingTableStyles } from '../../components/ListingTable';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { EmailTemplatesDialog } from './EmailTemplatesDialog';
import { InviteComposer, InviteComposerValues } from './InviteComposer';

interface AccountInvitesTabProps {
    targetRole: AccountInviteTargetRole;
    templateKind: InviteEmailTemplateKind;
    includeAgencyField?: boolean;
}

const statusColor = (value?: string | null) => {
    switch (value) {
        case 'EMAIL_SENT':
        case 'PENDING':
        case 'PENDING_SETUP':
        case 'BLOCKED_EMAIL':
        case 'BLOCKED_TWO_FACTOR':
            return 'gold';
        case 'ACCEPTED':
        case 'VERIFIED':
        case 'ACTIVE':
        case 'WAIVED':
        case 'READY':
        case 'SENT':
            return 'green';
        case 'EXPIRED':
        case 'REVOKED':
        case 'SUPERSEDED':
        case 'FAILED':
            return 'red';
        case 'DRAFT':
            return 'default';
        default:
            return 'default';
    }
};

const StatusValue = ({ value }: { value?: string | null }) => <Tag color={statusColor(value)}>{value || '—'}</Tag>;

export const AccountInvitesTab = ({ targetRole, templateKind, includeAgencyField = false }: AccountInvitesTabProps) => {
    const { t } = useTranslation();
    const [invites, setInvites] = useState<AccountInviteDTO[]>([]);
    const [templates, setTemplates] = useState<InviteEmailTemplateDTO[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();
    const [generatedLinks, setGeneratedLinks] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [templatesDialogView, setTemplatesDialogView] = useState<'list' | 'create' | null>(null);

    const currentTenantId = parseUserAuthInfo().tenantId || undefined;

    // Auto-suggested, non-colliding Träger-ID (Träger-Invites/TENANT_ADMIN only): the
    // smallest positive integer not already used by an existing tenant or by another
    // still-active (DRAFT/EMAIL_SENT) TENANT_ADMIN invite. Both sources load
    // asynchronously, so a `*Loaded` flag distinguishes "not loaded yet" from
    // "loaded and genuinely empty" — otherwise the suggestion would briefly compute
    // as 1 before the real taken-id data arrives.
    const isTenantInvite = targetRole === 'TENANT_ADMIN';
    const [existingTenantIds, setExistingTenantIds] = useState<Set<number>>(new Set());
    const [existingTenantIdsLoaded, setExistingTenantIdsLoaded] = useState(false);
    const [activeInviteTenantIds, setActiveInviteTenantIds] = useState<Set<number>>(new Set());
    const [activeInviteTenantIdsLoaded, setActiveInviteTenantIdsLoaded] = useState(false);

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
                setExistingTenantIdsLoaded(true);
            }
        };
        setExistingTenantIdsLoaded(false);
        loadAllTenantIds().catch(() => {
            if (!cancelled) setExistingTenantIdsLoaded(false);
        });
        return () => {
            cancelled = true;
        };
    }, [isTenantInvite]);

    useEffect(() => {
        if (!isTenantInvite) return undefined;
        // A dedicated, large, unpaginated fetch: the visible `invites` table is
        // paginated (20/page) and would miss active invites sitting on other pages.
        let cancelled = false;
        const loadAllActiveInviteTenantIds = async () => {
            const responses: AccountInviteDTO[] = [];
            let page = 0;
            let totalPages = 1;
            while (page < totalPages) {
                // Pagination is intentionally sequential because totalPages comes from the preceding response.
                // eslint-disable-next-line no-await-in-loop
                const response = await listAccountInvites({ targetRole: 'TENANT_ADMIN', page, size: 200 });
                responses.push(...(response.content ?? []));
                totalPages = response.totalPages ?? 0;
                page += 1;
            }
            if (!cancelled) {
                const ids = responses
                    .filter((invite) => invite.inviteStatus === 'DRAFT' || invite.inviteStatus === 'EMAIL_SENT')
                    .map((invite) => invite.tenantId)
                    .filter((id): id is number => id != null);
                setActiveInviteTenantIds(new Set(ids));
                setActiveInviteTenantIdsLoaded(true);
            }
        };
        setActiveInviteTenantIdsLoaded(false);
        loadAllActiveInviteTenantIds().catch(() => {
            if (!cancelled) setActiveInviteTenantIdsLoaded(false);
        });
        // Recomputed whenever the visible (paginated) invite list reloads — e.g. right
        // after this component creates a new invite — so the just-taken id is reflected
        // without waiting for an unrelated trigger.
        return () => {
            cancelled = true;
        };
    }, [isTenantInvite, invites]);

    const takenTenantIds = useMemo(
        () => new Set<number>([...existingTenantIds, ...activeInviteTenantIds]),
        [existingTenantIds, activeInviteTenantIds],
    );

    const suggestedTenantId = useMemo(() => {
        if (!isTenantInvite || !existingTenantIdsLoaded || !activeInviteTenantIdsLoaded) {
            return undefined;
        }
        let candidate = 1;
        while (takenTenantIds.has(candidate)) {
            candidate += 1;
        }
        return candidate;
    }, [isTenantInvite, existingTenantIdsLoaded, activeInviteTenantIdsLoaded, takenTenantIds]);

    const activeTemplates = useMemo(() => templates.filter((template) => template.active), [templates]);

    const loadInvites = useCallback(
        async (page: number, pageSize: number) => {
            setLoading(true);
            try {
                const response = await listAccountInvites({
                    page: page - 1,
                    size: pageSize,
                    targetRole,
                });
                setInvites(response.content ?? []);
                setPagination({
                    current: (response.page ?? 0) + 1,
                    pageSize: response.size ?? pageSize,
                    total: response.totalElements ?? 0,
                });
            } catch {
                message.error(t('links.error.loadFailed', 'Could not load links'));
            } finally {
                setLoading(false);
            }
        },
        [targetRole, t],
    );

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
        loadInvites(1, 20);
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

    const onCreate = useCallback(
        async (values: InviteComposerValues): Promise<boolean> => {
            setSubmitting(true);
            try {
                let departmentId: number | undefined;
                if (targetRole === 'COUNSELLOR') {
                    if (values.agencyId == null || values.tenantId == null) {
                        throw new Error('Counsellor invite requires tenant and agency routing');
                    }
                    const agencyResponse = await getAgencyDataById(String(values.agencyId));
                    const agency = agencyResponse?._embedded ?? agencyResponse;
                    const topics = agency?.topics ?? [];
                    if (Number(agency?.tenantId) !== values.tenantId || topics.length !== 1) {
                        throw new Error('Counsellor invite agency must belong to the tenant and have exactly one topic');
                    }
                    departmentId = Number(topics[0].id);
                    if (!Number.isFinite(departmentId)) {
                        throw new Error('Counsellor invite topic is invalid');
                    }
                }
                const created = await createAccountInvite({
                    acceptBaseUrl: accountInviteAcceptBaseUrl,
                    agencyId: values.agencyId,
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
                await loadInvites(1, pagination.pageSize);
                return true;
            } catch (error) {
                // The backend also rejects a colliding tenantId with 409 (see
                // createAccountInvite's CONFLICT_WITH_RESPONSE handling); surface that
                // specific message instead of the generic fallback when we can tell.
                if (isTenantInvite && error instanceof Response && error.status === 409) {
                    message.error(t('links.accountInvites.tenantIdTaken', 'This tenant ID is already taken.'));
                } else {
                    message.error(t('links.error.createFailed', 'Could not create link'));
                }
                return false;
            } finally {
                setSubmitting(false);
            }
        },
        [isTenantInvite, loadInvites, pagination.pageSize, rememberGeneratedLink, targetRole, t],
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
                    acceptBaseUrl: accountInviteAcceptBaseUrl,
                    templateId,
                });
                rememberGeneratedLink(resent);
                message.success(t('links.accountInvites.resent', 'Invite resent'));
                await loadInvites(pagination.current, pagination.pageSize);
            } catch {
                message.error(t('links.accountInvites.resendFailed', 'Could not resend invite'));
            }
        },
        [
            activeTemplates,
            loadInvites,
            pagination.current,
            pagination.pageSize,
            rememberGeneratedLink,
            selectedTemplateId,
            t,
        ],
    );

    const onRevoke = useCallback(
        async (invite: AccountInviteDTO) => {
            try {
                await revokeAccountInvite(invite.id);
                message.success(t('links.accountInvites.revoked', 'Invite revoked'));
                await loadInvites(pagination.current, pagination.pageSize);
            } catch {
                message.error(t('links.accountInvites.revokeFailed', 'Could not revoke invite'));
            }
        },
        [loadInvites, pagination.current, pagination.pageSize, t],
    );

    const onTableChange = useCallback(
        (tablePagination: TablePaginationConfig) => {
            loadInvites(tablePagination.current ?? 1, tablePagination.pageSize ?? 20);
        },
        [loadInvites],
    );

    const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

    const columns = useMemo(
        () => [
            {
                title: t('links.accountInvites.email', 'E-mail'),
                dataIndex: 'recipientEmail',
                key: 'recipientEmail',
            },
            {
                title: t('links.accountInvites.inviteStatus', 'Invite'),
                dataIndex: 'inviteStatus',
                key: 'inviteStatus',
                render: (value: string) => <StatusValue value={value} />,
            },
            {
                title: t('links.accountInvites.mailStatus', 'Mail'),
                dataIndex: 'emailDeliveryStatus',
                key: 'emailDeliveryStatus',
                render: (value: string | null) => <StatusValue value={value} />,
            },
            {
                title: t('links.accountInvites.twoFactorStatus', '2FA'),
                dataIndex: 'twoFactorStatus',
                key: 'twoFactorStatus',
                render: (value: string) => <StatusValue value={value} />,
            },
            {
                title: t('links.accountInvites.provisioningStatus', 'Provisioning'),
                dataIndex: 'provisioningStatus',
                key: 'provisioningStatus',
                render: (value: string | null) => <StatusValue value={value} />,
            },
            {
                title: t('links.accountInvites.accessGateStatus', 'Access'),
                dataIndex: 'accessGateStatus',
                key: 'accessGateStatus',
                render: (value: string) => <StatusValue value={value} />,
            },
            {
                title: t('links.col.expiresAt', 'Expires'),
                dataIndex: 'expiresAt',
                key: 'expiresAt',
                render: (value: string | null) => formatDate(value),
            },
            {
                title: t('links.col.link', 'Link'),
                key: 'link',
                render: (_: unknown, invite: AccountInviteDTO) => (
                    <Button
                        size="small"
                        className={listingTableStyles.copyButton}
                        onClick={() => copyLink(generatedLinks[invite.id])}
                    >
                        {t('links.copy', 'Copy')}
                    </Button>
                ),
            },
            {
                title: t('links.accountInvites.actions', 'Actions'),
                key: 'actions',
                render: (_: unknown, invite: AccountInviteDTO) => (
                    <div className={listingTableStyles.actionGroup}>
                        <Button size="small" onClick={() => onResend(invite)}>
                            {t('links.accountInvites.resend', 'Resend')}
                        </Button>
                        <Button size="small" danger onClick={() => onRevoke(invite)}>
                            {t('links.accountInvites.revoke', 'Revoke')}
                        </Button>
                    </div>
                ),
            },
        ],
        [copyLink, generatedLinks, onResend, onRevoke, t],
    );

    return (
        <>
            <InviteComposer
                includeAgencyField={includeAgencyField}
                initialTenantId={isTenantInvite ? undefined : currentTenantId}
                persistKey={targetRole}
                requireNames={targetRole === 'COUNSELLOR'}
                requireTenantId={isTenantInvite}
                submitting={submitting}
                suggestedTenantId={suggestedTenantId}
                takenTenantIds={takenTenantIds}
                templateId={selectedTemplateId}
                templates={templates}
                onManageTemplates={(intent) => setTemplatesDialogView(intent === 'create' ? 'create' : 'list')}
                onSubmit={onCreate}
                onTemplateIdChange={setSelectedTemplateId}
            />
            <ListingTable
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={invites}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '30'],
                }}
                onChange={onTableChange}
            />
            {templatesDialogView && (
                <EmailTemplatesDialog
                    initialView={templatesDialogView}
                    templateKind={templateKind}
                    onClose={() => setTemplatesDialogView(null)}
                    onChanged={onTemplateChanged}
                />
            )}
        </>
    );
};

export const TenantInvitesTab = () => <AccountInvitesTab targetRole="TENANT_ADMIN" templateKind="TENANT_INVITE" />;

export const CounsellorInvitesTab = () => (
    <AccountInvitesTab targetRole="COUNSELLOR" templateKind="COUNSELLOR_INVITE" includeAgencyField />
);
