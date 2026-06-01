import { Button, Form, InputNumber, message, Select } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AgencyInviteLinkDTO, createInviteLink, listInviteLinks } from '../../api/invitelinks/invitelinks';
import { ListingTable, listingTableStyles } from '../../components/ListingTable';
import { StatusTag } from '../../components/ListingTable/StatusTag';
import { Page } from '../../components/Page';
import { searchTenantData } from '../../api/tenant/searchTenantData';
import { getSingleTenantData } from '../../api/tenant/getSingleTenantData';
import { useAgenciesData } from '../../hooks/useAgencysData';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';
import { appURL } from '../../appConfig';

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
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

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

    const loadLinks = useCallback(
        async (page: number, pageSize: number) => {
            setLoadingLinks(true);
            try {
                const response = await listInviteLinks({ page: page - 1, size: pageSize });
                setLinks(response.content ?? []);
                setPagination({
                    current: (response.page ?? 0) + 1,
                    pageSize: response.size ?? pageSize,
                    total: response.totalElements ?? 0,
                });
            } catch {
                message.error(t('inviteLinks.error.loadFailed', 'Could not load invite links'));
            } finally {
                setLoadingLinks(false);
            }
        },
        [t],
    );

    useEffect(() => {
        loadLinks(1, 20);
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
                message.success(t('inviteLinks.created', 'Invite link created'));
                await loadLinks(1, pagination.pageSize);
            } catch {
                message.error(t('inviteLinks.error.createFailed', 'Could not create invite link'));
            } finally {
                setSubmitting(false);
            }
        },
        [t, loadLinks, pagination.pageSize],
    );

    const onTableChange = useCallback(
        (tablePagination: TablePaginationConfig) => {
            const nextPage = tablePagination.current ?? 1;
            const nextSize = tablePagination.pageSize ?? 20;
            loadLinks(nextPage, nextSize);
        },
        [loadLinks],
    );

    const formatDate = (value: string | null) => {
        if (!value) {
            return '—';
        }
        return new Date(value).toLocaleString();
    };

    const buildUrl = (link: AgencyInviteLinkDTO) => `${appURL}/invite/${link.token}`;

    const copyLink = useCallback(
        (link: AgencyInviteLinkDTO) => {
            const url = buildUrl(link);
            navigator.clipboard
                .writeText(url)
                .then(() => message.success(t('inviteLinks.copied', { defaultValue: 'Link copied' })))
                .catch(() => message.error(t('inviteLinks.copyFailed', 'Copy failed')));
        },
        [t],
    );

    const columns = useMemo(
        () => [
            {
                title: t('inviteLinks.col.createDate', 'Created'),
                dataIndex: 'createDate',
                key: 'createDate',
                render: (value: string) => formatDate(value),
            },
            {
                title: t('inviteLinks.col.createdBy', 'Created by'),
                dataIndex: 'createdByUsername',
                key: 'createdByUsername',
                render: (value: string | null) => value || '—',
            },
            {
                title: t('inviteLinks.col.agency', 'Agency'),
                dataIndex: 'agencyId',
                key: 'agencyId',
                render: (value: number | null | undefined) => (value != null ? value : '—'),
            },
            {
                title: t('inviteLinks.col.status', 'Status'),
                dataIndex: 'status',
                key: 'status',
                render: (status: AgencyInviteLinkDTO['status']) => <StatusTag status={status} />,
            },
            {
                title: t('inviteLinks.col.expiresAt', 'Expires'),
                dataIndex: 'expiresAt',
                key: 'expiresAt',
                render: (value: string | null) => formatDate(value),
            },
            {
                title: t('inviteLinks.col.usedAt', 'Used'),
                dataIndex: 'usedAt',
                key: 'usedAt',
                render: (value: string | null) => formatDate(value),
            },
            {
                title: t('inviteLinks.col.link', 'Link'),
                key: 'link',
                render: (_: unknown, record: AgencyInviteLinkDTO) => (
                    <Button size="small" className={listingTableStyles.copyButton} onClick={() => copyLink(record)}>
                        {t('inviteLinks.copy', 'Copy')}
                    </Button>
                ),
            },
        ],
        [copyLink, t],
    );

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
            <Form form={form} className={listingTableStyles.createForm} layout="inline" onFinish={onGenerate}>
                <div className={listingTableStyles.formFields}>
                    <Form.Item
                        name="tenantId"
                        label={t('inviteLinks.form.tenant', 'Tenant')}
                        rules={[{ required: true }]}
                    >
                        <Select
                            style={{ minWidth: 200 }}
                            placeholder={t('inviteLinks.form.tenantPh', 'Select tenant')}
                            disabled={!isSuperAdmin}
                            options={tenants.map((tn) => ({ value: tn.id, label: tn.name }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="agencyId"
                        label={t('inviteLinks.form.agency', 'Agency')}
                        rules={[{ required: true }]}
                    >
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
                        <InputNumber min={1} max={365} style={{ width: 90 }} />
                    </Form.Item>
                </div>
                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting} className={listingTableStyles.createButton}>
                        {t('inviteLinks.generate', 'Generate link')}
                    </Button>
                </Form.Item>
            </Form>
            <ListingTable
                rowKey="id"
                loading={loadingLinks}
                dataSource={links}
                columns={columns}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '30'],
                }}
                onChange={onTableChange}
            />
        </Page>
    );
};
