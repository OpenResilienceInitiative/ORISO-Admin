import { Button, Form, InputNumber, message, Select, Space, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AgencyInviteLinkDTO, createInviteLink, listInviteLinks } from '../../api/invitelinks/invitelinks';
import { Page } from '../../components/Page';
import { searchTenantData } from '../../api/tenant/searchTenantData';
import { getSingleTenantData } from '../../api/tenant/getSingleTenantData';
import { useAgenciesData } from '../../hooks/useAgencysData';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { appURL } from '../../appConfig';
import { ListingTable } from '../../components/ListingTable';
import { isActiveDeleteDate } from '../../utils/deleteDate';

interface TenantOption {
    id: number;
    name: string;
    subdomain?: string;
}

/**
 * Legacy agency invite links page (Rebuild). New topic-based links live under
 * /admin/links/external-inbounds — keep this file aligned with Rebuild to
 * avoid merge conflicts.
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
        return all.filter((a: any) => isActiveDeleteDate(a.deleteDate) && a.tenantId === Number(selectedTenantId));
    }, [agenciesResp, selectedTenantId]);

    const loadLinks = useCallback(() => {
        setLoadingLinks(true);
        listInviteLinks()
            .then((response) => {
                setLinks(response.content ?? []);
            })
            .catch(() => message.error(t('inviteLinks.error.loadFailed')))
            .finally(() => setLoadingLinks(false));
    }, [t]);

    useEffect(() => {
        loadLinks();
    }, [loadLinks]);

    const onGenerate = useCallback(
        async (values: { tenantId: number; agencyId: number; expiresInDays?: number }) => {
            setSubmitting(true);
            try {
                await createInviteLink(
                    {
                        agencyId: Number(values.agencyId),
                        expiresInDays: values.expiresInDays ? Number(values.expiresInDays) : undefined,
                    },
                    Number(values.tenantId),
                );
                message.success(t('inviteLinks.created'));
                loadLinks();
            } catch {
                message.error(t('inviteLinks.error.createFailed'));
            } finally {
                setSubmitting(false);
            }
        },
        [t, loadLinks],
    );

    const buildUrl = (link: AgencyInviteLinkDTO) => `${appURL}/invite/${link.token}`;

    const copyLink = (link: AgencyInviteLinkDTO) => {
        const url = buildUrl(link);
        navigator.clipboard
            .writeText(url)
            .then(() => message.success(t('inviteLinks.copied')))
            .catch(() => message.error(t('inviteLinks.copyFailed')));
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
            title: t('inviteLinks.col.createDate'),
            dataIndex: 'createDate',
            key: 'createDate',
            render: (v: string) => new Date(v).toLocaleString(),
        },
        {
            title: t('inviteLinks.col.createdBy'),
            dataIndex: 'createdByUsername',
            key: 'createdByUsername',
        },
        {
            title: t('inviteLinks.col.agency'),
            dataIndex: 'agencyId',
            key: 'agencyId',
        },
        {
            title: t('inviteLinks.col.status'),
            dataIndex: 'status',
            key: 'status',
            render: statusTag,
        },
        {
            title: t('inviteLinks.col.expiresAt'),
            dataIndex: 'expiresAt',
            key: 'expiresAt',
            render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
        },
        {
            title: t('inviteLinks.col.usedAt'),
            dataIndex: 'usedAt',
            key: 'usedAt',
            render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
        },
        {
            title: t('inviteLinks.col.link'),
            key: 'link',
            render: (_: any, record: AgencyInviteLinkDTO) => (
                <Space>
                    <Button size="small" onClick={() => copyLink(record)}>
                        {t('inviteLinks.copy')}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Page>
            <Page.Title titleKey="inviteLinks.title" subTitle={t('inviteLinks.subtitle') as string} />
            <Form form={form} layout="inline" onFinish={onGenerate} style={{ marginBottom: 24, gap: 12 }}>
                <Form.Item name="tenantId" label={t('inviteLinks.form.tenant')} rules={[{ required: true }]}>
                    <Select
                        style={{ minWidth: 200 }}
                        placeholder={t('inviteLinks.form.tenantPh')}
                        disabled={!isSuperAdmin}
                        options={tenants.map((tn) => ({ value: tn.id, label: tn.name }))}
                    />
                </Form.Item>
                <Form.Item name="agencyId" label={t('inviteLinks.form.agency')} rules={[{ required: true }]}>
                    <Select
                        style={{ minWidth: 240 }}
                        placeholder={t('inviteLinks.form.agencyPh')}
                        options={filteredAgencies.map((a: any) => ({
                            value: a.id,
                            label: `${a.postcode || ''} ${a.name}`.trim(),
                        }))}
                    />
                </Form.Item>
                <Form.Item name="expiresInDays" label={t('inviteLinks.form.expiresInDays')} initialValue={30}>
                    <InputNumber min={1} max={365} />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                        {t('inviteLinks.generate')}
                    </Button>
                </Form.Item>
            </Form>
            <ListingTable
                rowKey="id"
                loading={loadingLinks}
                dataSource={links}
                columns={columns as any}
                pagination={{ pageSize: 20 }}
            />
        </Page>
    );
};
