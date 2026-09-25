import { Alert, Button, Grid, Popover, notification } from 'antd';
import { TablePaginationConfig } from 'antd/lib/table';
import classNames from 'classnames';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import { PlusOutlined } from '@ant-design/icons';
import routePathNames from '../../../appConfig';
import { Modal } from '../../../components/Modal';
import { SortNotice } from '../../../components/UserTable/SortNotice';
import { canSeeLinksSection } from '../../../constants/linksAccess';
import { GlobalSearchBar } from '../../../components/GlobalSearch';
import { PageMobileActions } from '../../../components/Page/PageMobileActions';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { PermissionAction } from '../../../enums/PermissionAction';
import { ReleaseToggle } from '../../../enums/ReleaseToggle';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { useAdminListPreferences, useSaveAdminListSort } from '../../../hooks/useAdminListPreferences';
import { useConsultantsOrAdminsData } from '../../../hooks/useConsultantsOrAdminsData';
import { useDeleteTenant } from '../../../hooks/useDeleteTenant';
import { useReleasesToggle } from '../../../hooks/useReleasesToggle.hook';
import { useTenantsData } from '../../../hooks/useTenantsData';
import { useTenantAdminsData } from '../../../hooks/useTenantUserAdminsData';
import { usePlatformAdminsData } from '../../../hooks/usePlatformAdminsData';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { CounselorData } from '../../../types/counselor';
import { TenantData } from '../../../types/tenant';
import { useAppConfigContext } from '../../../context/useAppConfig';
import decodeHTML from '../../../utils/decodeHTML';
import { hasUserSearchFilters, type UserSearchFilters } from '../../../utils/userSearchFilters';
import { DeleteUserModal } from '../List/components/DeleteUser';
import { DeleteTenantAdminModal } from '../List/components/DeleteTenantAdmin';
import { USER_TABLE_CONFIGS, shouldShowTenantColumn } from './userTableConfigs';
import { mapSorterToApiField } from './useUserTableColumns';
import { TenantTable } from './TenantTable';
import { UserDataTable } from './UserDataTable';
import { UserScopeFilters, useScopeFilterAvailability } from './UserScopeFilters';
import {
    normalizeTenantAdminSortField,
    USER_TABLE_API_SAFE_ORDER,
    USER_TABLE_API_SAFE_SORT,
} from '../../../constants/userTableSort';
import type { UserSearchResult } from '../../../utils/fetchUserSearchWithSortFallback';
import styles from './UserManagementTable.module.scss';

const NO_FILTERS: UserSearchFilters = {};

interface UserManagementTableProps {
    figmaTableHeader?: boolean;
}

export const UserManagementTable = ({ figmaTableHeader = false }: UserManagementTableProps) => {
    const screens = Grid.useBreakpoint();
    const { typeOfUsers } = useParams<{ typeOfUsers: TypeOfUser }>();
    const sectionId = typeOfUsers || TypeOfUser.Consultants;
    const config = USER_TABLE_CONFIGS[sectionId] ?? USER_TABLE_CONFIGS[TypeOfUser.Consultants];
    const isTenants = sectionId === TypeOfUser.Tenants;
    const isTenantAdmins = sectionId === TypeOfUser.TenantAdmins;
    const isPlatformAdmins = sectionId === TypeOfUser.PlatformAdmins;
    const isConsultants = sectionId === TypeOfUser.Consultants;
    const isAgencyAdmins = sectionId === TypeOfUser.AgencyAdmins;
    const isMobile = !screens.md;
    const consultantsSectionId =
        sectionId === TypeOfUser.AgencyAdmins ? TypeOfUser.AgencyAdmins : TypeOfUser.Consultants;

    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { isSuperAdmin, hasRole } = useUserRoles();
    const { isEnabled } = useReleasesToggle();
    const { settings } = useAppConfigContext();
    const { data: tenantData } = useTenantData();
    const navigate = useNavigate();
    const allowedNumberOfUsers = tenantData?.licensing?.allowedNumberOfUsers || 0;

    const [search, setSearch] = useState('');
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [deleteTenantAdmin, setDeleteTenantAdmin] = useState<CounselorData | null>(null);
    const [tenantToDelete, setTenantToDelete] = useState<TenantData | null>(null);

    const [tableState, setTableState] = useState<TableState>({
        current: 1,
        sortBy: config.defaultSort.field,
        order: config.defaultSort.order,
        pageSize: 10,
    });
    // The page remounts this table per tab (keyed by tab), so plain state is already per tab.
    const [pickedSort, setPickedSort] = useState<{ sortBy: string; order: 'ASC' | 'DESC' } | null>(null);
    const [filters, setFilters] = useState<UserSearchFilters>(NO_FILTERS);
    const scopeFilters = useScopeFilterAvailability(sectionId);

    // Wait for the saved sort before the first search, so the list is fetched once and in the right order.
    const preferencesQuery = useAdminListPreferences({ enabled: !isTenants });
    const saveSort = useSaveAdminListSort();
    const preferencesPending = !isTenants && preferencesQuery.isLoading;
    const savedSort = preferencesQuery.data?.sorts?.[sectionId];
    const userSort = isTenants
        ? { sortBy: tableState.sortBy, order: tableState.order }
        : pickedSort ??
          (savedSort && { sortBy: savedSort.field, order: savedSort.order }) ?? {
              sortBy: config.defaultSort.field,
              order: config.defaultSort.order,
          };
    const userQueryState = { ...tableState, sortBy: userSort.sortBy, order: userSort.order };

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
        ...userQueryState,
        filters,
        typeOfUser: consultantsSectionId,
        enabled: !isTenantAdmins && !isPlatformAdmins && !isTenants && !preferencesPending,
    });

    const tenantAdminsQuery = useTenantAdminsData({
        search,
        ...userQueryState,
        filters,
        enabled: isTenantAdmins && !preferencesPending,
    });

    const platformAdminsQuery = usePlatformAdminsData({
        search,
        ...userQueryState,
        enabled: isPlatformAdmins && !preferencesPending,
    });

    const activeQuery = (() => {
        if (isTenants) return tenantsQuery;
        if (isTenantAdmins) return tenantAdminsQuery;
        if (isPlatformAdmins) return platformAdminsQuery;
        return consultantsQuery;
    })();
    const { data: responseList, isLoading, isError, error, refetch } = activeQuery;
    // When the server refused the chosen order, the arrow follows the rows it actually sent.
    const rejectedSort = (responseList as UserSearchResult | undefined)?.rejectedSort;
    const shownSortBy = rejectedSort ? USER_TABLE_API_SAFE_SORT : userQueryState.sortBy;
    const shownOrder = rejectedSort ? USER_TABLE_API_SAFE_ORDER : userQueryState.order;

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

    const showTenantColumn = shouldShowTenantColumn(sectionId, isSuperAdmin);
    const showSubdomain = !settings.multitenancyWithSingleDomainEnabled && (isTenantAdmins || isTenants);

    const canCreate =
        can(PermissionAction.Create, config.createResource) &&
        (!isTenants || isSuperAdmin || isEnabled(ReleaseToggle.TENANT_ADMIN_CREATING));
    const canEditOrDelete = can([PermissionAction.Update, PermissionAction.Delete], config.updateResource);

    const onEditUser = useCallback(
        (record: CounselorData) => {
            navigate(`${config.editPathPrefix}/${record.id}`);
        },
        [config.editPathPrefix, navigate],
    );

    const onDeleteUser = useCallback(
        (record: CounselorData) => {
            if (isTenantAdmins || isPlatformAdmins) {
                setDeleteTenantAdmin(record);
            } else {
                setDeleteUserId(record.id);
            }
        },
        [isTenantAdmins, isPlatformAdmins],
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

    const updateSearch = useCallback((value: string) => {
        setTableState((state) => ({ ...state, current: 1 }));
        setSearch(value);
    }, []);
    const setSearchDebounced = useDebouncedCallback(updateSearch, 100);

    const handleTableAction = useCallback(
        (pagination: TablePaginationConfig, _: unknown, sorter: any) => {
            const { current, pageSize } = pagination;
            setTableState((prev) => {
                if (sorter?.field) {
                    const mappedField = mapSorterToApiField(String(sorter.field)) || String(sorter.field).toUpperCase();
                    const apiField =
                        sectionId === TypeOfUser.TenantAdmins || sectionId === TypeOfUser.PlatformAdmins
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

    const onUserSortChange = useCallback(
        (sortBy: string, order: 'ASC' | 'DESC') => {
            setPickedSort({ sortBy, order });
            setTableState((prev) => ({ ...prev, current: 1 }));
            saveSort(sectionId, { field: sortBy, order });
        },
        [saveSort, sectionId],
    );

    const onFiltersChange = useCallback((next: UserSearchFilters) => {
        setFilters(next);
        setTableState((prev) => ({ ...prev, current: 1 }));
    }, []);

    // Links only invites counsellors, and Träger (with their admin) for a platform admin.
    const canInvite =
        (isConsultants && canSeeLinksSection({ isSuperAdmin, hasRole })) || (isTenantAdmins && isSuperAdmin);

    const onCloseDelete = useCallback(() => {
        setDeleteUserId(null);
        setDeleteTenantAdmin(null);
        refetch();
    }, [refetch]);

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

    const countLicences = isConsultants && allowedNumberOfUsers > 0;
    const narrowed = !!search || hasUserSearchFilters(filters);
    // The licence counts every counsellor, not the searched or filtered list.
    const unfilteredCount = useConsultantsOrAdminsData({
        typeOfUser: TypeOfUser.Consultants,
        current: 1,
        pageSize: 1,
        sortBy: USER_TABLE_API_SAFE_SORT,
        order: USER_TABLE_API_SAFE_ORDER,
        enabled: countLicences && narrowed,
    });
    const consultantCount = narrowed ? unfilteredCount.data?.total : responseList?.total;
    const atConsultantLimit = countLicences && consultantCount != null && consultantCount >= allowedNumberOfUsers;

    const createButton = useMemo(() => {
        if (isTenants) {
            return (
                <Button
                    className={styles.createButton}
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
            <Button
                className={styles.createButton}
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                disabled={atConsultantLimit}
            >
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
            <PageMobileActions
                id="users"
                search={{
                    label: t(config.searchPlaceholderKey),
                    placeholder: t(config.searchPlaceholderKey),
                    onSearch: updateSearch,
                }}
                add={
                    canCreate && !atConsultantLimit
                        ? {
                              label: t(config.createLabelKey ?? 'new'),
                              onAdd: () =>
                                  navigate(
                                      isTenants
                                          ? `${config.editPathPrefix}/add/general${
                                                responseList?.total === 0 ? '?main=true' : ''
                                            }`
                                          : `${config.editPathPrefix}/add`,
                                  ),
                          }
                        : undefined
                }
            >
                <div className={styles.searchContainer}>
                    <GlobalSearchBar
                        className={styles.searchWithButton}
                        expandedWidth={499}
                        onSearch={updateSearch}
                        onSearchChange={setSearchDebounced}
                        searchPlaceholder={t(config.searchPlaceholderKey)}
                    >
                        {(canCreate || canInvite) && (
                            <div className={styles.toolbarActions}>
                                {canInvite && (
                                    <Link to={routePathNames.links} className={styles.inviteButton}>
                                        {t('userTable.invite', 'Einladen')}
                                    </Link>
                                )}
                                {canCreate && createButton}
                            </div>
                        )}
                    </GlobalSearchBar>
                    {countLicences && consultantCount != null && (
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
                        <span className={styles.sectionCount}>
                            {t('tenants.subTitle', { count: responseList.total })}
                        </span>
                    )}
                </div>
            </PageMobileActions>
            {isError && (
                <Alert
                    message={t('error.loading')}
                    description={(error as Error)?.message || t('error.default')}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
            {!isTenants && <UserScopeFilters sectionId={sectionId} filters={filters} onChange={onFiltersChange} />}
            {rejectedSort && <SortNotice shownOrder={t('userTable.sortNotice.safeOrder', 'Vorname A–Z')} />}
            {!isTenants && (
                <UserDataTable
                    sectionId={sectionId}
                    rows={tableData as CounselorData[]}
                    loading={isLoading || preferencesPending}
                    showTenant={showTenantColumn}
                    showSubdomain={showSubdomain}
                    canEditOrDelete={canEditOrDelete}
                    sortBy={shownSortBy}
                    order={shownOrder}
                    onSortChange={onUserSortChange}
                    onEdit={onEditUser}
                    onDelete={onDeleteUser}
                    page={tableState.current}
                    pageSize={tableState.pageSize}
                    total={responseList?.total ?? 0}
                    onPageChange={(current) => setTableState((prev) => ({ ...prev, current }))}
                    onPageSizeChange={(pageSize) => setTableState((prev) => ({ ...prev, current: 1, pageSize }))}
                    onTenantClick={
                        scopeFilters.tenant ? (tenantId) => onFiltersChange({ tenantId, agencyIds: [] }) : undefined
                    }
                    onAgencyClick={
                        scopeFilters.canListAgencies
                            ? (agencyId) => onFiltersChange({ ...filters, agencyIds: [agencyId] })
                            : undefined
                    }
                    ariaLabel={t(config.searchPlaceholderKey)}
                />
            )}
            {isTenants && (
                <TenantTable
                    rows={tenantsQuery.data?.data ?? []}
                    loading={isLoading}
                    pagination={pagination}
                    onChange={handleTableAction}
                    emptyTextKey={config.emptyTextKey}
                    figmaTableHeader={figmaTableHeader}
                    showSubdomain={showSubdomain}
                    canEditOrDelete={canEditOrDelete}
                    mainTenantSubdomain={settings.mainTenantSubdomainForSingleDomainMultitenancy}
                    fixActionsColumn={!isMobile}
                    sortBy={shownSortBy}
                    order={shownOrder}
                    onEdit={onEditTenant}
                    onDelete={onDeleteTenant}
                />
            )}
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
