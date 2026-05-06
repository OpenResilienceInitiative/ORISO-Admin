import { Button, Form, InputNumber, message, Select, Space, Table, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AgencyInviteLinkDTO, createInviteLink, listInviteLinks } from '../../api/invitelinks/invitelinks';
import { Page } from '../../components/Page';
import { searchTenantData } from '../../api/tenant/searchTenantData';
import { getSingleTenantData } from '../../api/tenant/getSingleTenantData';
import { useAgenciesData } from '../../hooks/useAgencysData';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { mainURL } from '../../appConfig';

interface TenantOption {
    id: number;
    name: string;
    subdomain?: string;
}

/**
 * Admin page for creating agency invite links. Opening the generated link
 * auto-registers an anonymous user for the selected agency. Tokens are
 * single-use and tracked in the table below.
 */
export const InviteLinksPage = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { isSuperAdmin } = useUserRoles();
    const [tenants, setTenants] = useState<TenantOption[]>([]);
    const [links, setLinks] = useState<AgencyInviteLinkDTO[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const selectedTenantId = Form.useWatch('tenantId', form);
    const { data: agenciesResp } = useAgenciesData({ pageSize: 10000 });

    useEffect(() => {
        const { tenantId = 0 } = parseUserAuthInfo();
        if (isSuperAdmin) {
            searchTenantData({ perPage: 1000 })
                .then(({ data }) => setTenants(data as TenantOption[]))
                .catch(() => setTenants([]));
        } else if (tenantId > 0) {
            getSingleTenantData(tenantId)
                .then((data) => {
                    setTenants([data as TenantOption]);
                    form.setFieldsValue({ tenantId });
                })
                .catch(() => setTenants([]));
        }
    }, [isSuperAdmin]);

    const filteredAgencies = useMemo(() => {
        const all = (agenciesResp?.data as any[]) || [];
        if (!selectedTenantId) return [];
        return all.filter((a: any) => a.deleteDate === 'null' && a.tenantId === Number(selectedTenantId));
    }, [agenciesResp, selectedTenantId]);

    const loadLinks = useCallback(() => {
        setLoadingLinks(true);
        listInviteLinks()
            .then(setLinks)
            .catch(() => message.error(t('inviteLinks.error.loadFailed', 'Could not load invite links')))
            .finally(() => setLoadingLinks(false));
    }, [t]);

    useEffect(() => {
        loadLinks();
    }, [loadLinks]);

    const onGenerate = useCallback(
        async (values: { tenantId: number; agencyId: number; expiresInDays?: number }) => {
            setSubmitting(true);
            try {
                await createInviteLink({
                    agencyId: Number(values.agencyId),
                    expiresInDays: values.expiresInDays ? Number(values.expiresInDays) : undefined,
                });
                message.success(t('inviteLinks.created', 'Invite link created'));
                loadLinks();
            } catch {
                message.error(t('inviteLinks.error.createFailed', 'Could not create invite link'));
            } finally {
                setSubmitting(false);
            }
        },
        [t, loadLinks],
    );

    const buildUrl = (link: AgencyInviteLinkDTO) => {
        // The user-facing app is served from app.oriso-dev.site (single-domain
        // multi-tenancy). Swap the api subdomain for app.
        const host = mainURL.replace('api.', 'app.');
        return `${host}/invite/${link.token}`;
    };

    const copyLink = (link: AgencyInviteLinkDTO) => {
        const url = buildUrl(link);
        navigator.clipboard
            .writeText(url)
            .then(() => message.success(t('inviteLinks.copied', { defaultValue: 'Link copied' })))
            .catch(() => message.error(t('inviteLinks.copyFailed', 'Copy failed')));
    };

    const statusTag = (status: AgencyInviteLinkDTO['status']) => {
        const colors: Record<AgencyInviteLinkDTO['status'], string> = {
            ACTIVE: 'green',
            USED: 'default',
            EXPIRED: 'red',
        };
        return <Tag color={colors[status]}>{status}</Tag>;
    };

    const columns = [
        {
            title: t('inviteLinks.col.createDate', 'Created'),
            dataIndex: 'createDate',
            key: 'createDate',
            render: (v: string) => new Date(v).toLocaleString(),
        },
        {
            title: t('inviteLinks.col.createdBy', 'Created by'),
            dataIndex: 'createdByUsername',
            key: 'createdByUsername',
        },
        {
            title: t('inviteLinks.col.agency', 'Agency'),
            dataIndex: 'agencyId',
            key: 'agencyId',
        },
        {
            title: t('inviteLinks.col.status', 'Status'),
            dataIndex: 'status',
            key: 'status',
            render: statusTag,
        },
        {
            title: t('inviteLinks.col.expiresAt', 'Expires'),
            dataIndex: 'expiresAt',
            key: 'expiresAt',
            render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
        },
        {
            title: t('inviteLinks.col.usedAt', 'Used'),
            dataIndex: 'usedAt',
            key: 'usedAt',
            render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
        },
        {
            title: t('inviteLinks.col.link', 'Link'),
            key: 'link',
            render: (_: any, record: AgencyInviteLinkDTO) => (
                <Space>
                    <Button size="small" onClick={() => copyLink(record)}>
                        {t('inviteLinks.copy', 'Copy')}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Page>
            <Page.Title
                titleKey="inviteLinks.title"
                subTitle={
                    t(
                        'inviteLinks.subtitle',
                        'Share these single-use links; opening one auto-registers the visitor as an anonymous user for the chosen agency.',
                    ) as unknown as string
                }
            />
            <Form form={form} layout="inline" onFinish={onGenerate} style={{ marginBottom: 24, gap: 12 }}>
                <Form.Item name="tenantId" label={t('inviteLinks.form.tenant', 'Tenant')} rules={[{ required: true }]}>
                    <Select
                        style={{ minWidth: 200 }}
                        placeholder={t('inviteLinks.form.tenantPh', 'Select tenant')}
                        disabled={!isSuperAdmin}
                        options={tenants.map((tn) => ({ value: tn.id, label: tn.name }))}
                    />
                </Form.Item>
                <Form.Item name="agencyId" label={t('inviteLinks.form.agency', 'Agency')} rules={[{ required: true }]}>
                    <Select
                        style={{ minWidth: 240 }}
                        placeholder={t('inviteLinks.form.agencyPh', 'Select agency')}
                        options={filteredAgencies.map((a: any) => ({
                            value: a.id,
                            label: `${a.postcode || ''} ${a.name}`.trim(),
                        }))}
                    />
                </Form.Item>
                <Form.Item
                    name="expiresInDays"
                    label={t('inviteLinks.form.expiresInDays', 'Expires in (days)')}
                    initialValue={30}
                >
                    <InputNumber min={1} max={365} />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                        {t('inviteLinks.generate', 'Generate link')}
                    </Button>
                </Form.Item>
            </Form>
            <Table
                rowKey="id"
                loading={loadingLinks}
                dataSource={links}
                columns={columns as any}
                pagination={{ pageSize: 20 }}
            />
        </Page>
    );
};
