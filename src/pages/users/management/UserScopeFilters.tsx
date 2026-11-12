import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterDisclosure } from '../../../components/FilterDisclosure';
import { ScopeContextBar } from '../../../components/UserTable/ScopeContextBar';
import { ScopeFilter, type ScopeFilterOption } from '../../../components/UserTable/ScopeFilter';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { useAgenciesData } from '../../../hooks/useAgencysData';
import { useTenantsData } from '../../../hooks/useTenantsData';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import type { UserSearchFilters } from '../../../utils/userSearchFilters';
import styles from './userScopeFilters.module.scss';

// Both lists are small; one page is the whole set.
const ALL = 10000;

/** Which filters a tab offers: Träger for the platform admin, centres wherever people belong to centres. */
export const useScopeFilterAvailability = (sectionId: TypeOfUser) => {
    const { isSuperAdmin, isTenantScopedAdmin } = useUserRoles();
    const { can } = useUserPermissions();
    const centreTab = sectionId === TypeOfUser.Consultants || sectionId === TypeOfUser.AgencyAdmins;
    return {
        tenant: isSuperAdmin && (centreTab || sectionId === TypeOfUser.TenantAdmins),
        agency: centreTab,
        // AgencyService scopes this read-only search to the token tenant or assigned centres.
        canListAgencies: centreTab && (isTenantScopedAdmin || can(PermissionAction.Read, Resource.Agency)),
    };
};

export interface UserScopeFiltersProps {
    sectionId: TypeOfUser;
    filters: UserSearchFilters;
    onChange: (filters: UserSearchFilters) => void;
    actions?: ReactNode;
}

/**
 * One "Filter" button (no search field: the admin search, ⌘K, is the one place to type); the Träger and Beratungsstelle pickers fold out
 * below (Admin#1510). The active filters stay visible as context bars, so a closed panel never hides
 * why the list is shorter.
 */
export const UserScopeFilters = ({ sectionId, filters, onChange, actions }: UserScopeFiltersProps) => {
    const { t } = useTranslation();
    const available = useScopeFilterAvailability(sectionId);

    const tenantsQuery = useTenantsData({ perPage: ALL, enabled: available.tenant });
    const agenciesQuery = useAgenciesData({ pageSize: ALL, enabled: available.canListAgencies });

    const tenantOptions: ScopeFilterOption[] = (tenantsQuery.data?.data ?? []).map((tenant) => ({
        id: String(tenant.id),
        name: tenant.name,
    }));
    const agencyOptions: ScopeFilterOption[] = (agenciesQuery.data?.data ?? [])
        .filter((agency) => !filters.tenantId || String(agency.tenantId) === filters.tenantId)
        .map((agency) => ({
            id: String(agency.id),
            name: agency.name,
            detail: [agency.postcode, agency.city].filter(Boolean).join(' '),
        }));

    if (!available.tenant && !available.agency && !actions) return null;

    const tenant = tenantOptions.find((option) => option.id === filters.tenantId);
    const centres = (filters.agencyIds ?? []).map(
        (id) => agencyOptions.find((option) => option.id === id) ?? { id, name: id },
    );
    // A picked centre stays shown even when the list has only that one left.
    const nothingToChoose = agencyOptions.length < 2 && !centres.length;

    // A choice of one is no choice: the Beratungsstelle picker only appears when it can narrow the list.
    const showAgencyPicker =
        available.agency && available.canListAgencies && (agenciesQuery.isLoading || !nothingToChoose);
    const hasPickers = available.tenant || showAgencyPicker;
    const activeCount = (filters.tenantId ? 1 : 0) + (centres.length > 0 ? 1 : 0);

    const pickers = (
        <>
            {available.tenant && (
                <ScopeFilter
                    kind="tenant"
                    options={tenantOptions}
                    loading={tenantsQuery.isLoading}
                    value={filters.tenantId ? [filters.tenantId] : []}
                    // Centres belong to one Träger, so a new Träger drops them.
                    onChange={([tenantId]) => onChange({ tenantId, agencyIds: [] })}
                />
            )}
            {showAgencyPicker && (
                <ScopeFilter
                    kind="agency"
                    multiple
                    options={agencyOptions}
                    loading={agenciesQuery.isLoading}
                    value={filters.agencyIds ?? []}
                    onChange={(agencyIds) => onChange({ ...filters, agencyIds })}
                />
            )}
        </>
    );

    return (
        <div className={styles.wrapper}>
            {hasPickers ? (
                <FilterDisclosure
                    groupLabel={t('userTable.filter.label', 'Liste filtern')}
                    activeCount={activeCount}
                    trailing={actions}
                >
                    {pickers}
                </FilterDisclosure>
            ) : (
                <div className={styles.toolbar}>{actions}</div>
            )}
            {filters.tenantId && (
                <ScopeContextBar
                    kind="tenant"
                    id={filters.tenantId}
                    name={tenant?.name ?? filters.tenantId}
                    onClear={() => onChange({ ...filters, tenantId: undefined })}
                />
            )}
            {centres.length > 0 && (
                <ScopeContextBar
                    kind="agency"
                    id={centres.map((centre) => centre.id).join(', ')}
                    name={centres.map((centre) => centre.name).join(', ')}
                    address={centres.length === 1 ? centres[0].detail : undefined}
                    onClear={() => onChange({ ...filters, agencyIds: [] })}
                />
            )}
        </div>
    );
};
