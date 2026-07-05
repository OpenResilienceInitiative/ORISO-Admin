import { Button, Form, Input, InputNumber, message, Select, Tag } from 'antd';
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
import { ListingTable, listingTableStyles } from '../../components/ListingTable';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';

interface AccountInvitesTabProps {
    targetRole: AccountInviteTargetRole;
    templateKind: InviteEmailTemplateKind;
    includeAgencyField?: boolean;
}

interface AccountInviteFormValues {
    tenantId?: number;
    recipientEmail: string;
    firstName?: string;
    lastName?: string;
    agencyId?: number;
    expiresInDays?: number;
    templateId: number;
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
    const [form] = Form.useForm<AccountInviteFormValues>();
    const [invites, setInvites] = useState<AccountInviteDTO[]>([]);
    const [templates, setTemplates] = useState<InviteEmailTemplateDTO[]>([]);
    const [generatedLinks, setGeneratedLinks] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

    const currentTenantId = parseUserAuthInfo().tenantId || undefined;

    const templateOptions = useMemo(
        () =>
            templates
                .filter((template) => template.active)
                .map((template) => ({ value: template.id, label: template.name })),
        [templates],
    );

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

    useEffect(() => {
        listInviteEmailTemplates(templateKind)
            .then(setTemplates)
            .catch(() => message.error(t('links.accountInvites.templatesLoadFailed', 'Could not load templates')));
    }, [templateKind, t]);

    useEffect(() => {
        loadInvites(1, 20);
    }, [loadInvites]);

    useEffect(() => {
        if (templateOptions.length === 1) {
            form.setFieldValue('templateId', templateOptions[0].value);
        }
    }, [form, templateOptions]);

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
        async (values: AccountInviteFormValues) => {
            setSubmitting(true);
            try {
                const created = await createAccountInvite({
                    acceptBaseUrl: accountInviteAcceptBaseUrl,
                    agencyId: values.agencyId,
                    expiresInDays: values.expiresInDays ?? 30,
                    firstName: values.firstName,
                    lastName: values.lastName,
                    recipientEmail: values.recipientEmail,
                    targetRole,
                    templateId: values.templateId,
                    tenantId: values.tenantId,
                });
                rememberGeneratedLink(created);
                message.success(t('links.accountInvites.created', 'Invite sent'));
                form.resetFields(['recipientEmail', 'firstName', 'lastName', 'agencyId']);
                await loadInvites(1, pagination.pageSize);
            } catch {
                message.error(t('links.error.createFailed', 'Could not create link'));
            } finally {
                setSubmitting(false);
            }
        },
        [form, loadInvites, pagination.pageSize, rememberGeneratedLink, targetRole, t],
    );

    const onResend = useCallback(
        async (invite: AccountInviteDTO) => {
            const templateId = form.getFieldValue('templateId') || templateOptions[0]?.value;
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
        [form, loadInvites, pagination.current, pagination.pageSize, rememberGeneratedLink, t, templateOptions],
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
            <Form
                form={form}
                className={listingTableStyles.createForm}
                layout="inline"
                initialValues={{ expiresInDays: 30, tenantId: currentTenantId }}
                onFinish={onCreate}
            >
                <div className={listingTableStyles.formFields}>
                    <Form.Item name="tenantId" label={t('links.accountInvites.tenantId', 'Tenant ID')}>
                        <InputNumber min={1} />
                    </Form.Item>
                    <Form.Item
                        name="recipientEmail"
                        label={t('links.accountInvites.email', 'E-mail')}
                        rules={[{ required: true, type: 'email' }]}
                    >
                        <Input style={{ minWidth: 220 }} />
                    </Form.Item>
                    <Form.Item name="firstName" label={t('links.accountInvites.firstName', 'First name')}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="lastName" label={t('links.accountInvites.lastName', 'Last name')}>
                        <Input />
                    </Form.Item>
                    {includeAgencyField && (
                        <Form.Item name="agencyId" label={t('links.accountInvites.agencyId', 'Agency ID')}>
                            <InputNumber min={1} />
                        </Form.Item>
                    )}
                    <Form.Item
                        name="templateId"
                        label={t('links.accountInvites.template', 'Template')}
                        rules={[{ required: true, message: t('plsSelect') }]}
                    >
                        <Select
                            style={{ minWidth: 220 }}
                            placeholder={t('links.accountInvites.templatePh', 'Select template')}
                            options={templateOptions}
                        />
                    </Form.Item>
                    <Form.Item name="expiresInDays" label={t('links.form.expiresInDays', 'Expires in days')}>
                        <InputNumber min={1} max={365} />
                    </Form.Item>
                </div>
                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                        className={listingTableStyles.createButton}
                    >
                        {t('links.accountInvites.createAndSend', 'Create and send')}
                    </Button>
                </Form.Item>
            </Form>
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
        </>
    );
};

export const TenantInvitesTab = () => <AccountInvitesTab targetRole="TENANT_ADMIN" templateKind="TENANT_INVITE" />;

export const CounsellorInvitesTab = () => (
    <AccountInvitesTab targetRole="COUNSELLOR" templateKind="COUNSELLOR_INVITE" includeAgencyField />
);
