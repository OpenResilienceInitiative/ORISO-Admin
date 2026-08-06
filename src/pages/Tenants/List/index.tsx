import { PlusOutlined } from '@ant-design/icons';
import { Button, notification } from 'antd';
import { ColumnProps, TablePaginationConfig } from 'antd/lib/table';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import routePathNames from '../../../appConfig';
import { EditButtons } from '../../../components/EditableTable/EditButtons';
import { Modal } from '../../../components/Modal';
import { Page } from '../../../components/Page';
import { ResizeTable } from '../../../components/ResizableTable';
import { GlobalSearchBar } from '../../../components/GlobalSearch';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { PermissionAction } from '../../../enums/PermissionAction';
import { ReleaseToggle } from '../../../enums/ReleaseToggle';
import { Resource } from '../../../enums/Resource';
import { useDeleteTenant } from '../../../hooks/useDeleteTenant';
import { useReleasesToggle } from '../../../hooks/useReleasesToggle.hook';
import { useTenantsData } from '../../../hooks/useTenantsData';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { TenantData } from '../../../types/tenant';
import decodeHTML from '../../../utils/decodeHTML';
import { getDomain } from '../../../utils/getDomain';
import styles from './styles.module.scss';

const TENANT_SORT_FIELD_BY_DATA_INDEX: Record<string, string> = {
    beraterCount: 'BERATERCOUNT',
    id: 'ID',
    name: 'NAME',
    subdomain: 'SUBDOMAIN',
};

const getTenantColumnSortOrder = (
    dataIndex: keyof typeof TENANT_SORT_FIELD_BY_DATA_INDEX,
    tableState: TableState,
): 'ascend' | 'descend' | undefined => {
    if (tableState.sortBy !== TENANT_SORT_FIELD_BY_DATA_INDEX[dataIndex]) {
        return undefined;
    }

    return tableState.order === 'DESC' ? 'descend' : 'ascend';
};

export const TenantsList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [tableState, setTableState] = useState<TableState>({
        current: 1,
        pageSize: 10,
    });

    const { settings } = useAppConfigContext();
    const [search, setSearch] = useState('');
    const [tenantToDelete, setTenantToDelete] = useState<TenantData | null>(null);
    const { can } = useUserPermissions();
    const { isEnabled } = useReleasesToggle();
    const { isSuperAdmin } = useUserRoles();
    const handleSearch = useCallback((value) => {
        setSearch(value);
        setTableState((data) => ({ ...data, current: 1 }));
    }, []);
    const handleSearchDebounced = useDebouncedCallback(handleSearch, 1000);
    const { data, isLoading } = useTenantsData({
        page: tableState.current,
        perPage: tableState.pageSize,
        search,
        sort: tableState.sortBy,
        dir: tableState.order,
    });
    const { mutate: deleteTenant } = useDeleteTenant({
        onSuccess: () => {
            notification.success({ message: t('tenants.list.deleteMessage.success') });
        },
        onError: () => {
            notification.error({
                closeIcon: null,
                duration: 10,
                description: t('tenants.list.deleteMessage.error.description'),
                message: t('tenants.list.deleteMessage.error.title'),
            });
        },
    });

    const onDelete = useCallback(
        (id: number) => {
            setTenantToDelete(null);
            deleteTenant(id);
        },
        [deleteTenant],
    );

    const handleTableAction = useCallback((pagination: TablePaginationConfig, _: any, sorter: any) => {
        const { current, pageSize } = pagination;

        const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
        const sortField =
            activeSorter?.field && typeof activeSorter.field === 'string'
                ? TENANT_SORT_FIELD_BY_DATA_INDEX[activeSorter.field]
                : undefined;

        setTableState((currentState) => {
            if (!sortField || !activeSorter?.order) {
                return { ...currentState, current, pageSize, sortBy: undefined, order: undefined };
            }

            return {
                ...currentState,
                current,
                pageSize,
                sortBy: sortField,
                order: activeSorter.order === 'descend' ? 'DESC' : 'ASC',
            };
        });
    }, []);

    const pagination = {
        total: data?.total,
        current: tableState.current,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '30'],
    };

    const columnsData = [
        {
            title: t('tenants.list.name'),
            dataIndex: 'name',
            width: 100,
            ellipsis: true,
            sorter: true,
            sortOrder: getTenantColumnSortOrder('name', tableState),
            showSorterTooltip: false,
            render: (name: string) => <>{decodeHTML(name)}</>,
        },
        !settings.multitenancyWithSingleDomainEnabled && {
            width: 150,
            title: t('tenants.list.subdomain'),
            dataIndex: 'subdomain',
            ellipsis: true,
            sorter: true,
            sortOrder: getTenantColumnSortOrder('subdomain', tableState),
            showSorterTooltip: false,
            render: (subdomain: string) => (
                <Link target="_blank" to={`//${getDomain(subdomain)}`} className={styles.subdomain}>{`${getDomain(
                    subdomain,
                )}`}</Link>
            ),
        },
        {
            width: 100,
            title: t('tenants.list.tenantId'),
            dataIndex: 'id',
            ellipsis: true,
            sorter: true,
            sortOrder: getTenantColumnSortOrder('id', tableState),
            showSorterTooltip: false,
        },
        {
            width: 130,
            title: t('tenants.list.maxConsultants'),
            dataIndex: 'beraterCount',
            ellipsis: true,
            sorter: true,
            sortOrder: getTenantColumnSortOrder('beraterCount', tableState),
            showSorterTooltip: false,
        },
        can([PermissionAction.Update, PermissionAction.Delete], Resource.Tenant) && {
            width: 80,
            title: '',
            key: 'edit',
            render: (_: unknown, record: TenantData) => {
                return (
                    <div className="tableActionWrapper">
                        <EditButtons
                            handleEdit={() => navigate(`${routePathNames.tenants}/${record.id}`)}
                            handleDelete={() => setTenantToDelete(record)}
                            record={record}
                            hide={can(PermissionAction.Delete, Resource.Tenant) ? [] : ['delete']}
                            disabled={{
                                edit: false,
                                delete: settings.mainTenantSubdomainForSingleDomainMultitenancy === record.subdomain,
                            }}
                            resource={Resource.Tenant}
                        />
                    </div>
                );
            },
            className: 'counselorList__column',
            fixed: 'right',
        },
    ] as Array<ColumnProps<TenantData>>;

    return (
        <Page>
            <Page.Title titleKey="tenants.title" subTitle={t<string>('tenants.subTitle', { count: data?.total || 0 })}>
                <div className={styles.searchContainer}>
                    <GlobalSearchBar
                        className={styles.searchWithButton}
                        expandedWidth={499}
                        onSearch={handleSearch}
                        onSearchChange={handleSearchDebounced}
                        searchPlaceholder={t('tenants.searchPlaceholder')}
                    >
                        {can(PermissionAction.Create, Resource.Tenant) &&
                            (isSuperAdmin || isEnabled(ReleaseToggle.TENANT_ADMIN_CREATING)) && (
                                <div className={styles.toolbarActions}>
                                    <Button
                                        className={styles.createButton}
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() =>
                                            navigate(
                                                `${routePathNames.tenants}/add/general${
                                                    data?.total === 0 ? '?main=true' : ''
                                                }`,
                                            )
                                        }
                                    >
                                        {t('tenants.list.new')}
                                    </Button>
                                </div>
                            )}
                    </GlobalSearchBar>
                </div>
            </Page.Title>
            <div className={styles.tableContainer}>
                <ResizeTable
                    loading={isLoading}
                    columns={columnsData}
                    dataSource={data?.data || []}
                    pagination={pagination}
                    onChange={handleTableAction}
                    rowKey="id"
                    locale={{ emptyText: t('tenants.list.empty') }}
                />
            </div>

            {tenantToDelete !== null && (
                <Modal
                    titleKey="tenants.list.deleteModal.title"
                    titleKeyOptions={{ name: decodeHTML(tenantToDelete.name) }}
                    contentKey="tenants.list.deleteModal.description"
                    okLabelKey="tenants.list.deleteModal.confirm"
                    cancelLabelKey="tenants.list.deleteModal.cancel"
                    onConfirm={() => onDelete(tenantToDelete.id)}
                    onClose={() => setTenantToDelete(null)}
                />
            )}
        </Page>
    );
};
