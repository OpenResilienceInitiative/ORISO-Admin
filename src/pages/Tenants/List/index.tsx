import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import AddIcon from '@mui/icons-material/Add';
import routePathNames from '../../../appConfig';
import type { DataTableSort } from '../../../components/DataTable';
import { M3Button } from '../../../components/M3Button';
import { Modal } from '../../../components/Modal';
import { Page } from '../../../components/Page';
import { PageMobileActions } from '../../../components/Page/PageMobileActions';
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
import decodeHTML from '../../../utils/decodeHTML';
import { TenantDataTable, type TenantRow } from './TenantDataTable';
import { nextTenantSortState, tenantSortOf } from './tenantSort';
import styles from './styles.module.scss';

type DeleteResult = 'success' | 'error' | null;

export const TenantsList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [tableState, setTableState] = useState<TableState>({
        current: 1,
        pageSize: 10,
    });

    const { settings } = useAppConfigContext();
    const [search, setSearch] = useState('');
    const [tenantToDelete, setTenantToDelete] = useState<TenantRow | null>(null);
    const [deleteResult, setDeleteResult] = useState<DeleteResult>(null);
    const { can } = useUserPermissions();
    const { isEnabled } = useReleasesToggle();
    const { isSuperAdmin } = useUserRoles();
    const handleSearch = useCallback((value) => {
        setSearch(value);
        setTableState((data) => ({ ...data, current: 1 }));
    }, []);
    const handleSearchDebounced = useDebouncedCallback(handleSearch, 1000);
    const { data, isLoading, isError } = useTenantsData({
        page: tableState.current,
        perPage: tableState.pageSize,
        search,
        sort: tableState.sortBy,
        dir: tableState.order,
    });
    const { mutate: deleteTenant } = useDeleteTenant({
        onSuccess: () => setDeleteResult('success'),
        onError: () => setDeleteResult('error'),
    });

    const onDelete = useCallback(
        (id: number) => {
            setTenantToDelete(null);
            setDeleteResult(null);
            deleteTenant(id);
        },
        [deleteTenant],
    );

    const onSortChange = useCallback((sort: DataTableSort | null) => {
        setTableState((state) => nextTenantSortState(state, sort));
    }, []);

    const canCreateTenant =
        can(PermissionAction.Create, Resource.Tenant) &&
        (isSuperAdmin || isEnabled(ReleaseToggle.TENANT_ADMIN_CREATING));
    const addPath = `${routePathNames.tenants}/add/general${data?.total === 0 ? '?main=true' : ''}`;

    return (
        <Page>
            <Page.Title titleKey="tenants.title" subTitle={t<string>('tenants.subTitle', { count: data?.total || 0 })}>
                <PageMobileActions
                    id="tenants"
                    search={{
                        label: t('tenants.searchPlaceholder'),
                        placeholder: t('tenants.searchPlaceholder'),
                        onSearch: handleSearch,
                    }}
                    add={canCreateTenant ? { label: t('tenants.list.new'), onAdd: () => navigate(addPath) } : undefined}
                >
                    <div className={styles.toolbar}>
                        <GlobalSearchBar
                            className={styles.searchField}
                            expandedWidth={499}
                            onSearch={handleSearch}
                            onSearchChange={handleSearchDebounced}
                            searchPlaceholder={t('tenants.searchPlaceholder')}
                        >
                            {canCreateTenant && (
                                <span className={styles.toolbarActions}>
                                    <M3Button
                                        variant="filled"
                                        icon={<AddIcon />}
                                        className={styles.createButton}
                                        onClick={() => navigate(addPath)}
                                    >
                                        {t('tenants.list.new')}
                                    </M3Button>
                                </span>
                            )}
                        </GlobalSearchBar>
                    </div>
                </PageMobileActions>
            </Page.Title>

            {deleteResult === 'success' && (
                <Alert severity="success" className={styles.notice} onClose={() => setDeleteResult(null)}>
                    {t('tenants.list.deleteMessage.success')}
                </Alert>
            )}
            {deleteResult === 'error' && (
                <Alert severity="error" className={styles.notice} onClose={() => setDeleteResult(null)}>
                    <AlertTitle>{t('tenants.list.deleteMessage.error.title')}</AlertTitle>
                    {t('tenants.list.deleteMessage.error.description')}
                </Alert>
            )}

            <TenantDataTable
                rows={data?.data ?? []}
                loading={isLoading}
                emptyText={isError ? t('message.error.default') : t('tenants.list.empty')}
                sort={tenantSortOf(tableState.sortBy, tableState.order)}
                onSortChange={onSortChange}
                page={tableState.current ?? 1}
                pageSize={tableState.pageSize ?? 10}
                total={data?.total ?? 0}
                onPageChange={(current) => setTableState((state) => ({ ...state, current }))}
                onPageSizeChange={(pageSize) => setTableState((state) => ({ ...state, current: 1, pageSize }))}
                showSubdomain={!settings.multitenancyWithSingleDomainEnabled}
                onEdit={
                    can(PermissionAction.Update, Resource.Tenant)
                        ? (row) => navigate(`${routePathNames.tenants}/${row.id}`)
                        : undefined
                }
                onDelete={can(PermissionAction.Delete, Resource.Tenant) ? setTenantToDelete : undefined}
                canDeleteRow={(row) => settings.mainTenantSubdomainForSingleDomainMultitenancy !== row.subdomain}
                ariaLabel={t('tenants.title')}
            />

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
