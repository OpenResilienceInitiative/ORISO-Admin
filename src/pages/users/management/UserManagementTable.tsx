import { Alert, Button, Grid, Popover, notification } from 'antd';
import { TablePaginationConfig } from 'antd/lib/table';
import classNames from 'classnames';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useDebouncedCallback } from 'use-debounce';
import { PlusOutlined } from '@ant-design/icons';
import { Modal } from '../../../components/Modal';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import SearchInput from '../../../components/SearchInput/SearchInput';
import { ResizeTable } from '../../../components/ResizableTable';
import { PermissionAction } from '../../../enums/PermissionAction';
import { ReleaseToggle } from '../../../enums/ReleaseToggle';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { useConsultantsOrAdminsData } from '../../../hooks/useConsultantsOrAdminsData';
import { useDeleteTenant } from '../../../hooks/useDeleteTenant';
import { useReleasesToggle } from '../../../hooks/useReleasesToggle.hook';
import { useTenantsData } from '../../../hooks/useTenantsData';
import { useTenantAdminsData } from '../../../hooks/useTenantUserAdminsData';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { CounselorData } from '../../../types/counselor';
import { TenantData } from '../../../types/tenant';
import { useAppConfigContext } from '../../../context/useAppConfig';
import decodeHTML from '../../../utils/decodeHTML';
import { DeleteUserModal } from '../List/components/DeleteUser';
import { DeleteTenantAdminModal } from '../List/components/DeleteTenantAdmin';
import { USER_TABLE_CONFIGS } from './userTableConfigs';
import { mapSorterToApiField, useUserTableColumns } from './useUserTableColumns';
import { normalizeTenantAdminSortField } from '../../../constants/userTableSort';
import styles from './UserManagementTable.module.scss';

interface UserManagementTableProps {
    figmaTableHeader?: boolean;
}

export const UserManagementTable = ({ figmaTableHeader = false }: UserManagementTableProps) => {
    const screens = Grid.useBreakpoint();
    const { typeOfUsers } = useParams<{ typeOfUsers: TypeOfUser }>();
    const sectionId = typeOfUsers || TypeOfUser.Consultants;
    const config = USER_TABLE_CONFIGS[sectionId] ?? USER_TABLE_CONFIGS[TypeOfUser.Consultants];
    const isOrganizations = config.sectionKind === 'organizations';
    const isTenants = sectionId === TypeOfUser.Tenants;
    const isTenantAdmins = sectionId === TypeOfUser.TenantAdmins;
    const isConsultants = sectionId === TypeOfUser.Consultants;
    const isAgencyAdmins = sectionId === TypeOfUser.AgencyAdmins;
    const isMobile = !screens.md;
    const consultantsSectionId =
        sectionId === TypeOfUser.AgencyAdmins ? TypeOfUser.AgencyAdmins : TypeOfUser.Consultants;

    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();
    const { isEnabled } = useReleasesToggle();
    const { settings } = useAppConfigContext();
    const { data: tenantData } = useTenantData();
    const navigate = useNavigate();
    const allowedNumberOfUsers = tenantData?.licensing?.allowedNumberOfUsers || 0;

    const [search, setSearch] = useState('');
    const [openRows, setOpenRows] = useState<string[]>([]);
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [deleteTenantAdmin, setDeleteTenantAdmin] = useState<CounselorData | null>(null);
    const [tenantToDelete, setTenantToDelete] = useState<TenantData | null>(null);

    const [tableState, setTableState] = useState<TableState>({
        current: 1,
        sortBy: config.defaultSort.field,
        order: config.defaultSort.order,
        pageSize: 10,
    });

    useEffect(() => {
        setTableState({
            current: 1,
            sortBy: config.defaultSort.field,
            order: config.defaultSort.order,
            pageSize: 10,
        });
        setOpenRows([]);
        setSearch('');
    }, [sectionId, config.defaultSort.field, config.defaultSort.order]);

    const tenantsQuery = useTenantsData({
        page: tableState.current,
        perPage: tableState.pageSize,
        search,
        sort: tableState.sortBy,
        dir: tableState.order,
        enabled: isTenants,
    });

    const consultantsQuery = useConsultantsOrAdminsData({
        search,
        ...tableState,
        typeOfUser: consultantsSectionId,
        enabled: !isTenantAdmins && !isTenants,
    });

    const tenantAdminsQuery = useTenantAdminsData({
        search,
        ...tableState,
        enabled: isTenantAdmins,
    });

    const activeQuery = (() => {
        if (isTenants) return tenantsQuery;
        if (isTenantAdmins) return tenantAdminsQuery;
        return consultantsQuery;
    })();
    const { data: responseList, isLoading, isError, error, refetch } = activeQuery;

    const { mutate: deleteTenant } = useDeleteTenant({
        onSuccess: () => {
            notification.success({ message: t('tenants.list.deleteMessage.success') });
            refetch();
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

    const showTenantColumn = isSuperAdmin && !isTenantAdmins && !isTenants;
    const showSubdomain = !settings.multitenancyWithSingleDomainEnabled && (isTenantAdmins || isTenants);

    const canCreate =
        can(PermissionAction.Create, config.createResource) &&
        (!isTenants || isSuperAdmin || isEnabled(ReleaseToggle.TENANT_ADMIN_CREATING));
    const canEditOrDelete = can([PermissionAction.Update, PermissionAction.Delete], config.updateResource);

    const onToggleRow = useCallback((id: string) => {
        setOpenRows((current) => (current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]));
    }, []);

    const onEditUser = useCallback(
        (record: CounselorData) => {
            navigate(`${config.editPathPrefix}/${record.id}`);
        },
        [config.editPathPrefix, navigate],
    );

    const onDeleteUser = useCallback(
        (record: CounselorData) => {
            if (isTenantAdmins) {
                setDeleteTenantAdmin(record);
            } else {
                setDeleteUserId(record.id);
            }
        },
        [isTenantAdmins],
    );

    const onEditTenant = useCallback(
        (record: TenantData) => {
            navigate(`${config.editPathPrefix}/${record.id}`);
        },
        [config.editPathPrefix, navigate],
    );

    const onDeleteTenant = useCallback((record: TenantData) => {
        setTenantToDelete(record);
    }, []);

    const columns = useUserTableColumns({
        sectionId,
        showTenant: showTenantColumn,
        showSubdomain,
        openRows,
        onToggleRow,
        onEditUser,
        onDeleteUser,
        onEditTenant: isTenants ? onEditTenant : undefined,
        onDeleteTenant: isTenants ? onDeleteTenant : undefined,
        canEditOrDelete,
        mainTenantSubdomain: settings.mainTenantSubdomainForSingleDomainMultitenancy,
        figmaTableHeader: figmaTableHeader && !isOrganizations,
        fixActionsColumn: !isMobile,
    }).filter((column) => column.key !== 'status' || config.showStatus);

    const setSearchDebounced = useDebouncedCallback((value: string) => {
        setTableState((state) => ({ ...state, current: 1 }));
        setSearch(value);
    }, 100);

    const handleTableAction = useCallback(
        (pagination: TablePaginationConfig, _: unknown, sorter: any) => {
            const { current, pageSize } = pagination;
            setTableState((prev) => {
                if (sorter?.field) {
                    const mappedField = mapSorterToApiField(String(sorter.field)) || String(sorter.field).toUpperCase();
                    const apiField =
                        sectionId === TypeOfUser.TenantAdmins
                            ? normalizeTenantAdminSortField(mappedField)
                            : mappedField;
                    return {
                        ...prev,
                        current: current ?? prev.current,
                        pageSize: pageSize ?? prev.pageSize,
                        sortBy: apiField,
                        order: sorter.order === 'descend' ? 'DESC' : 'ASC',
                    };
                }
                return {
                    ...prev,
                    current: current ?? prev.current,
                    pageSize: pageSize ?? prev.pageSize,
                };
            });
        },
        [sectionId],
    );

    const onCloseDelete = useCallback(() => {
        setDeleteUserId(null);
        setDeleteTenantAdmin(null);
        refetch();
    }, [refetch]);

    const rowClassName = useCallback(
        (record: CounselorData | TenantData) =>
            classNames({
                'counselorList__row--expanded':
                    !isOrganizations && openRows.includes(String((record as CounselorData).id)),
            }),
        [isOrganizations, openRows],
    );

    const pagination = useMemo(
        () => ({
            total: responseList?.total,
            current: tableState.current,
            pageSize: tableState.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30'],
        }),
        [responseList?.total, tableState.current, tableState.pageSize],
    );

    const consultantCount = responseList?.total ?? 0;
    const atConsultantLimit = isConsultants && allowedNumberOfUsers > 0 && consultantCount >= allowedNumberOfUsers;

    const createButton = useMemo(() => {
        if (isTenants) {
            return (
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() =>
                        navigate(`${config.editPathPrefix}/add/general${responseList?.total === 0 ? '?main=true' : ''}`)
                    }
                >
                    {t(config.createLabelKey ?? 'new')}
                </Button>
            );
        }

        const handleAdd = () => navigate(`${config.editPathPrefix}/add`);

        const addButton = (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} disabled={atConsultantLimit}>
                {t('new')}
            </Button>
        );

        if (atConsultantLimit) {
            return (
                <Popover
                    placement="bottomRight"
                    content={t('counselor.new.help', { number: allowedNumberOfUsers })}
                    title={t('notice')}
                    trigger="hover"
                >
                    <span className={styles.popoverTrigger}>{addButton}</span>
                </Popover>
            );
        }

        return addButton;
    }, [
        allowedNumberOfUsers,
        atConsultantLimit,
        config.createLabelKey,
        config.editPathPrefix,
        isTenants,
        isTenantAdmins,
        navigate,
        responseList?.total,
        t,
    ]);

    const tableData = responseList?.data ?? [];

    return (
        <div className={classNames('counselorList', styles.wrapper)}>
            <div className={styles.searchContainer}>
                <div className={styles.searchWithButton}>
                    <SearchInput
                        className={styles.searchField}
                        placeholder={t(config.searchPlaceholderKey)}
                        handleOnSearch={setSearchDebounced}
                        handleOnSearchClear={() => setSearch('')}
                    />
                    {canCreate && <div className={styles.toolbarActions}>{createButton}</div>}
                </div>
                {isConsultants && allowedNumberOfUsers > 0 && (
                    <span className={styles.sectionCount}>
                        {consultantCount}/{allowedNumberOfUsers} {t('counselor.title')}
                    </span>
                )}
                {isAgencyAdmins && responseList?.total != null && (
                    <span className={styles.sectionCount}>
                        {t('agencyAdmins.title.text', { userCount: responseList.total })}
                    </span>
                )}
                {isTenantAdmins && responseList?.total != null && (
                    <span className={styles.sectionCount}>
                        {t('tenantAdmins.title.text', { userCount: responseList.total })}
                    </span>
                )}
                {isTenants && responseList?.total != null && (
                    <span className={styles.sectionCount}>{t('tenants.subTitle', { count: responseList.total })}</span>
                )}
            </div>
            {isError && (
                <Alert
                    message={t('error.loading')}
                    description={(error as Error)?.message || t('error.default')}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
            <div className={classNames(styles.tableContainer, { [styles.tableContainerFigma]: figmaTableHeader })}>
                <ResizeTable
                    rowKey="id"
                    loading={isLoading}
                    columns={columns}
                    dataSource={tableData}
                    pagination={pagination}
                    onChange={handleTableAction}
                    rowClassName={isOrganizations ? undefined : rowClassName}
                    locale={config.emptyTextKey ? { emptyText: t(config.emptyTextKey) } : undefined}
                />
            </div>
            {deleteUserId && can(PermissionAction.Delete, config.updateResource) && !isTenantAdmins && (
                <DeleteUserModal
                    deleteUserId={deleteUserId}
                    onClose={onCloseDelete}
                    typeOfUser={sectionId === TypeOfUser.AgencyAdmins ? 'admins' : 'consultants'}
                />
            )}
            {deleteTenantAdmin && can(PermissionAction.Delete, config.updateResource) && (
                <DeleteTenantAdminModal user={deleteTenantAdmin} onClose={onCloseDelete} />
            )}
            {tenantToDelete !== null && (
                <Modal
                    titleKey="tenants.list.deleteModal.title"
                    titleKeyOptions={{ name: decodeHTML(tenantToDelete.name) }}
                    contentKey="tenants.list.deleteModal.description"
                    okLabelKey="tenants.list.deleteModal.confirm"
                    cancelLabelKey="tenants.list.deleteModal.cancel"
                    onConfirm={() => {
                        deleteTenant(tenantToDelete.id);
                        setTenantToDelete(null);
                    }}
                    onClose={() => setTenantToDelete(null)}
                />
            )}
        </div>
    );
};
