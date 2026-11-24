import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import routePathNames from '../../../appConfig';
import type { DataTableSort } from '../../../components/DataTable';
import { M3Button } from '../../../components/M3Button';
import { Page } from '../../../components/Page';
import { PageMobileActions } from '../../../components/Page/PageMobileActions';
import { ListSearchBar } from '../../../components/ListSearchBar';
import { useListQuery, useListTableState } from '../../../hooks/useListQuery';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { PermissionAction } from '../../../enums/PermissionAction';
import { ReleaseToggle } from '../../../enums/ReleaseToggle';
import { Resource } from '../../../enums/Resource';
import { useReleasesToggle } from '../../../hooks/useReleasesToggle.hook';
import { useTenantsData } from '../../../hooks/useTenantsData';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { TenantDataTable, type TenantRow } from './TenantDataTable';
import { TenantDeletionModal } from './TenantDeletionModal';
import { nextTenantSortState, tenantSortOf } from './tenantSort';
import styles from './styles.module.scss';
import { Notify } from '../../../components/Notify';

export const TenantsList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    // The admin search (⌘K) is the one place to type; "Show all matches in the list" opens this page with ?q=.
    const { query: search, clear: clearSearch } = useListQuery();
    // A new search starts on page 1 (in the same render, so the old page is never asked for with it).
    const [tableState, setTableState] = useListTableState<TableState>(search, {
        current: 1,
        pageSize: 10,
    });
    const [tenantToDelete, setTenantToDelete] = useState<TenantRow | null>(null);
    const { can } = useUserPermissions();
    const { isEnabled } = useReleasesToggle();
    const { isSuperAdmin } = useUserRoles();
    const { data, isLoading, isError } = useTenantsData({
        page: tableState.current,
        perPage: tableState.pageSize,
        search,
        sort: tableState.sortBy,
        dir: tableState.order,
    });
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
                    add={canCreateTenant ? { label: t('tenants.list.new'), onAdd: () => navigate(addPath) } : undefined}
                >
                    {canCreateTenant && (
                        <div className={styles.toolbar}>
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
                        </div>
                    )}
                </PageMobileActions>
            </Page.Title>
            {search && (
                <div className={styles.toolbar}>
                    <ListSearchBar query={search} onClear={clearSearch} />
                </div>
            )}

            {isError && (
                <Notify
                    severity="error"
                    title={t('notify.title.tenants')}
                    causeKey="tenants:list"
                    jump="tenants-list-table"
                    retry
                >
                    {t('error.loading')}
                </Notify>
            )}

            <div id="tenants-list-table">
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
                    // Deleting a Träger empties it of everything: the platform administrator's act alone
                    // (ORISO-Admin#1525), as TenantService enforces.
                    onDelete={
                        isSuperAdmin && can(PermissionAction.Delete, Resource.Tenant) ? setTenantToDelete : undefined
                    }
                    canDeleteRow={(row) => settings.mainTenantSubdomainForSingleDomainMultitenancy !== row.subdomain}
                    ariaLabel={t('tenants.title')}
                />
            </div>

            {tenantToDelete !== null && (
                <TenantDeletionModal tenant={tenantToDelete} onClose={() => setTenantToDelete(null)} />
            )}
        </Page>
    );
};
