import { Button, Input, InputNumber, Space, Switch, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnType } from 'antd/lib/table';
import { ListingTable } from '../../../components/ListingTable';
import { Page } from '../../../components/Page';
import { useCaseHandoverLogsData } from '../../../hooks/useCaseHandoverLogsData';
import {
    useCaseHandoverReasonPoliciesData,
    useCaseHandoverReasonPoliciesMutation,
} from '../../../hooks/useCaseHandoverReasonPolicies';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { canEditCaseHandoverReasonPolicies } from '../../../constants/caseHandoverAccess';
import { CaseHandoverLogEntry } from '../../../types/caseHandoverLogs';
import { CaseHandoverReasonPolicy } from '../../../types/caseHandoverReasonPolicy';

const statusColor = (status: string) => {
    switch (status) {
        case 'GRANTED':
            return 'green';
        case 'PENDING':
        case 'PENDING_CLIENT_CONSENT':
            return 'gold';
        case 'DENIED':
        case 'CLIENT_CONSENT_DECLINED':
            return 'red';
        default:
            return 'default';
    }
};

export const CaseHandoverLogsPage = () => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();
    const canEditReasonPolicies = canEditCaseHandoverReasonPolicies(isSuperAdmin, can);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const { data, isLoading } = useCaseHandoverLogsData({ page, perPage });
    const { data: reasonPolicies, isLoading: isLoadingReasonPolicies } = useCaseHandoverReasonPoliciesData();
    const updateReasonPolicies = useCaseHandoverReasonPoliciesMutation();
    const [editablePolicies, setEditablePolicies] = useState<CaseHandoverReasonPolicy[]>([]);

    useEffect(() => {
        if (reasonPolicies) {
            setEditablePolicies(
                reasonPolicies.map((policy) => ({
                    ...policy,
                    accessAllowed: policy.accessAllowed === true,
                })),
            );
        }
    }, [reasonPolicies]);

    const updatePolicy = useCallback((code: string, patch: Partial<CaseHandoverReasonPolicy>) => {
        setEditablePolicies((currentPolicies) =>
            currentPolicies.map((policy) => (policy.code === code ? { ...policy, ...patch } : policy)),
        );
    }, []);

    const policyColumns: ColumnType<CaseHandoverReasonPolicy>[] = useMemo(
        () => [
            {
                title: t('caseHandoverLogs.policy.table.code'),
                dataIndex: 'code',
                key: 'code',
                width: 240,
            },
            {
                title: t('caseHandoverLogs.policy.table.label'),
                dataIndex: 'label',
                key: 'label',
                width: 280,
                render: (value: string, row) => (
                    <Input
                        value={value}
                        disabled={!canEditReasonPolicies}
                        aria-label={`${t('caseHandoverLogs.policy.table.label')} (${row.code})`}
                        onChange={(event) => updatePolicy(row.code, { label: event.target.value })}
                    />
                ),
            },
            {
                title: t('caseHandoverLogs.policy.table.clientConsentRequired'),
                dataIndex: 'clientConsentRequired',
                key: 'clientConsentRequired',
                width: 180,
                render: (value: boolean, row) => (
                    <Switch
                        checked={value}
                        disabled={!canEditReasonPolicies}
                        aria-label={`${t('caseHandoverLogs.policy.table.clientConsentRequired')} (${row.code})`}
                        onChange={(checked) => updatePolicy(row.code, { clientConsentRequired: checked })}
                    />
                ),
            },
            {
                title: t('caseHandoverLogs.policy.table.accessAllowed'),
                dataIndex: 'accessAllowed',
                key: 'accessAllowed',
                width: 160,
                render: (value: boolean, row) => (
                    <Switch
                        checked={value === true}
                        disabled={!canEditReasonPolicies}
                        aria-label={`${t('caseHandoverLogs.policy.table.accessAllowed')} (${row.code})`}
                        onChange={(checked) => updatePolicy(row.code, { accessAllowed: checked })}
                    />
                ),
            },
            {
                title: t('caseHandoverLogs.policy.table.enabled'),
                dataIndex: 'enabled',
                key: 'enabled',
                width: 140,
                render: (value: boolean, row) => (
                    <Switch
                        checked={value}
                        disabled={!canEditReasonPolicies}
                        aria-label={`${t('caseHandoverLogs.policy.table.enabled')} (${row.code})`}
                        onChange={(checked) => updatePolicy(row.code, { enabled: checked })}
                    />
                ),
            },
            {
                title: t('caseHandoverLogs.policy.table.displayOrder'),
                dataIndex: 'displayOrder',
                key: 'displayOrder',
                width: 140,
                render: (value: number, row) => (
                    <InputNumber
                        min={1}
                        value={value}
                        disabled={!canEditReasonPolicies}
                        aria-label={`${t('caseHandoverLogs.policy.table.displayOrder')} (${row.code})`}
                        onChange={(nextValue) =>
                            updatePolicy(row.code, { displayOrder: Number(nextValue ?? row.displayOrder ?? 100) })
                        }
                    />
                ),
            },
            {
                title: t('caseHandoverLogs.policy.table.policyAuthority'),
                dataIndex: 'policyAuthority',
                key: 'policyAuthority',
                width: 220,
                render: (value: string | null | undefined, row) => (
                    <Input
                        value={value ?? ''}
                        disabled={!canEditReasonPolicies}
                        aria-label={`${t('caseHandoverLogs.policy.table.policyAuthority')} (${row.code})`}
                        onChange={(event) => updatePolicy(row.code, { policyAuthority: event.target.value })}
                    />
                ),
            },
        ],
        [t, updatePolicy, canEditReasonPolicies],
    );

    const columns: ColumnType<CaseHandoverLogEntry>[] = useMemo(
        () => [
            {
                title: t('caseHandoverLogs.table.createdAt'),
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 180,
                render: (value: string) => (value ? new Date(value).toLocaleString() : '-'),
            },
            {
                title: t('caseHandoverLogs.table.status'),
                dataIndex: 'status',
                key: 'status',
                width: 180,
                render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag>,
            },
            {
                title: t('caseHandoverLogs.table.sessionId'),
                dataIndex: 'sessionId',
                key: 'sessionId',
                width: 110,
            },
            {
                title: t('caseHandoverLogs.table.requester'),
                key: 'requester',
                width: 220,
                render: (_: any, row) => row.requesterName || row.requesterUsername || row.requesterConsultantId,
            },
            {
                title: t('caseHandoverLogs.table.previous'),
                key: 'previous',
                width: 220,
                render: (_: any, row) => row.previousName || row.previousUsername || row.previousConsultantId || '-',
            },
            {
                title: t('caseHandoverLogs.table.reason'),
                dataIndex: 'reasonLabel',
                key: 'reasonLabel',
                width: 240,
            },
            {
                title: t('caseHandoverLogs.table.consent'),
                dataIndex: 'clientConsentRequired',
                key: 'clientConsentRequired',
                width: 120,
                render: (value: boolean) => (value ? t('yes') : t('no')),
            },
            {
                title: t('caseHandoverLogs.table.auditOutcome'),
                dataIndex: 'auditOutcome',
                key: 'auditOutcome',
                width: 220,
            },
            {
                title: t('caseHandoverLogs.table.explanation'),
                dataIndex: 'explanation',
                key: 'explanation',
                ellipsis: true,
            },
        ],
        [t],
    );

    return (
        <Page>
            <Page.Title titleKey="caseHandoverLogs.title" subTitle={String(t('caseHandoverLogs.subTitle'))} />
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <h2>{t('caseHandoverLogs.policy.title')}</h2>
                    <ListingTable<CaseHandoverReasonPolicy>
                        rowKey={(row) => row.code}
                        loading={isLoadingReasonPolicies}
                        columns={policyColumns}
                        dataSource={editablePolicies}
                        pagination={false}
                        scroll={{ x: 1200, y: 'auto' }}
                    />
                    {canEditReasonPolicies && (
                        <Button
                            type="primary"
                            loading={updateReasonPolicies.isLoading}
                            disabled={!editablePolicies.length || isLoadingReasonPolicies}
                            onClick={() => updateReasonPolicies.mutate(editablePolicies)}
                        >
                            {t('caseHandoverLogs.policy.save')}
                        </Button>
                    )}
                </Space>
                <ListingTable<CaseHandoverLogEntry>
                    rowKey={(row) => `${row.requestId}`}
                    loading={isLoading}
                    columns={columns}
                    dataSource={data?.data ?? []}
                    scroll={{ x: 1500 }}
                    pagination={{
                        current: page,
                        pageSize: perPage,
                        total: data?.total ?? 0,
                        showSizeChanger: true,
                        onChange: (nextPage, nextPageSize) => {
                            setPage(nextPage);
                            if (nextPageSize && nextPageSize !== perPage) {
                                setPerPage(nextPageSize);
                                setPage(1);
                            }
                        },
                    }}
                />
            </Space>
        </Page>
    );
};
