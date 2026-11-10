import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import type { DataTableSort } from '../../../components/DataTable';
import { M3Button } from '../../../components/M3Button';
import { AgencyData } from '../../../types/agency';
import { AgencyDeletionModal } from './AgencyDeletionModal';
import { useFeatureContext } from '../../../context/FeatureContext';
import routePathNames from '../../../appConfig';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { Page } from '../../../components/Page';
import { PageMobileActions } from '../../../components/Page/PageMobileActions';
import { useAgenciesData } from '../../../hooks/useAgencysData';
import { GlobalSearchBar } from '../../../components/GlobalSearch';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { useTenantsData } from '../../../hooks/useTenantsData';
import { useDpaGate } from '../../../hooks/useDpaGate.hook';
import { canStartNewCounselling } from '../../../utils/dpaBlockerGate';
import { isAgencyScopedAdmin, resolveAgencyAdminLanding } from '../../../constants/agencyAdminLanding';
import { Notify } from '../../../components/Notify';
import { AgencyDataTable } from './AgencyDataTable';
import { agencySortOf, nextAgencySortState } from './agencySort';
import styles from './styles.module.scss';

export const AgencyList = () => {
    const { t } = useTranslation();
    const [tableState, setTableState] = useState<TableState>({
        current: 1,
        sortBy: undefined,
        order: undefined,
        pageSize: 10,
    });
    const { data, isLoading, isError, refetch } = useAgenciesData({ ...tableState });
    const { can } = useUserPermissions();
    const { isSuperAdmin, isTenantScopedAdmin, tenantId, hasRole } = useUserRoles();
    // ORISO-Admin#917: a Beratungsstellen-Admin with exactly one assigned agency is forwarded
    // straight into that agency's settings; with several they stay on this list. The assignment
    // is the one this very list is built from — AgencyService filters it to the agencies the
    // caller administers. `GET /service/users/data` must NOT be used here: its `agencies` array
    // is the CONSULTANT assignment, so an account that counsels in one centre and administers
    // two others was forwarded into a centre it does not administer.
    const isAgencyAdminOnly = isAgencyScopedAdmin(hasRole);
    const {
        data: dpaGate,
        isLoading: isDpaGateLoading,
        isError: isDpaGateError,
    } = useDpaGate(tenantId ?? 0, isTenantScopedAdmin);
    const { data: tenantsData } = useTenantsData({ perPage: 1000, page: 1, enabled: isSuperAdmin });
    const { isEnabled } = useFeatureContext();
    const [agencyToDelete, setAgencyToDelete] = useState<AgencyData>();
    const isAgencyCreationDpaBlocked =
        isTenantScopedAdmin && (isDpaGateLoading || isDpaGateError || !canStartNewCounselling(dpaGate));

    const navigate = useNavigate();

    // A search narrows the same list, so only the unfiltered result says how many agencies the
    // admin actually has — otherwise typing a name would forward out of the list mid-search.
    const ownAgencyPath = isAgencyAdminOnly && !isError && !tableState.search ? resolveAgencyAdminLanding(data) : null;

    const onClose = useCallback(() => {
        setAgencyToDelete(null);
        refetch();
    }, []);

    const updateSearch = useCallback((search?: string) => {
        setTableState((tmpData) => ({ ...tmpData, current: 1, search }));
    }, []);
    const setSearchDebounced = useDebouncedCallback(updateSearch, 100);
    const tenantNameById = new Map(
        (tenantsData?.data || []).map((tenant) => [Number(tenant.id), String(tenant.name || '')]),
    );

    const onSortChange = useCallback((sort: DataTableSort | null) => {
        setTableState((state) => nextAgencySortState(state, sort));
    }, []);

    const canCreate = can(PermissionAction.Create, Resource.Agency);

    if (isAgencyAdminOnly && !isError && isLoading) {
        // Do not flash the list before we know whether to forward into the single agency.
        return null;
    }
    if (ownAgencyPath && ownAgencyPath !== routePathNames.agency) {
        return <Navigate to={ownAgencyPath} replace />;
    }

    return (
        <Page>
            <Page.Title titleKey="agency" subTitleKey={`agency.title.text${canCreate ? '' : '.self'}`}>
                <PageMobileActions
                    id="agencies"
                    search={{
                        label: t('agency.list.searchPlaceholder'),
                        placeholder: t('agency.list.searchPlaceholder'),
                        onSearch: updateSearch,
                    }}
                    add={
                        canCreate && !isAgencyCreationDpaBlocked
                            ? { label: t('new'), onAdd: () => navigate(routePathNames.agencyAdd) }
                            : undefined
                    }
                >
                    <div className={styles.toolbar}>
                        <GlobalSearchBar
                            className={styles.searchField}
                            expandedWidth={499}
                            onSearch={updateSearch}
                            onSearchChange={setSearchDebounced}
                            searchPlaceholder={t('agency.list.searchPlaceholder')}
                        >
                            {canCreate && (
                                // The title explains a disabled button; a disabled button gets no hover itself.
                                <span
                                    className={styles.toolbarActions}
                                    title={isAgencyCreationDpaBlocked ? t('agency.dpaGate.title') : undefined}
                                >
                                    <M3Button
                                        variant="filled"
                                        icon={<AddIcon />}
                                        className={styles.createButton}
                                        disabled={isAgencyCreationDpaBlocked}
                                        onClick={() => navigate(routePathNames.agencyAdd)}
                                    >
                                        {t('new')}
                                    </M3Button>
                                </span>
                            )}
                        </GlobalSearchBar>
                    </div>
                </PageMobileActions>
            </Page.Title>

            {isError && (
                <Notify
                    severity="error"
                    title={t('notify.title.agency')}
                    causeKey="agency:list"
                    jump="agency-list-table"
                    actions={[{ label: t('notify.retry'), onClick: () => refetch() }]}
                >
                    {t('error.loading')}
                </Notify>
            )}
            <div id="agency-list-table">
                <AgencyDataTable
                    rows={data?.data ?? []}
                    loading={isLoading}
                    emptyText={isError ? t('message.error.default') : t('tenants.list.empty')}
                    sort={agencySortOf(tableState.sortBy, tableState.order)}
                    onSortChange={onSortChange}
                    page={tableState.current ?? 1}
                    pageSize={tableState.pageSize ?? 10}
                    total={data?.total ?? 0}
                    onPageChange={(current) => setTableState((state) => ({ ...state, current }))}
                    onPageSizeChange={(pageSize) => setTableState((state) => ({ ...state, current: 1, pageSize }))}
                    showTenant={isSuperAdmin}
                    tenantNameOf={(row) =>
                        row.tenantName || tenantNameById.get(Number(row.tenantId)) || String(row.tenantId ?? '')
                    }
                    showTopics={can(PermissionAction.Read, Resource.Topic)}
                    markMissingTopics={isEnabled(FeatureFlag.TopicsInRegistration)}
                    onEdit={
                        can(PermissionAction.Update, Resource.Agency)
                            ? (row) => navigate(`${routePathNames.agency}/${row.id}`)
                            : undefined
                    }
                    onDelete={can(PermissionAction.Delete, Resource.Agency) ? setAgencyToDelete : undefined}
                    ariaLabel={t('agency')}
                />
            </div>
            {agencyToDelete && <AgencyDeletionModal agencyModel={agencyToDelete} onClose={onClose} />}
        </Page>
    );
};
