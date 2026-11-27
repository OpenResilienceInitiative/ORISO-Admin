import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'use-debounce';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { TypeOfUser } from '../../enums/TypeOfUser';
import { useAdviceSeekersData } from '../../hooks/useAdviceSeekersData';
import { useAgenciesData } from '../../hooks/useAgencysData';
import { useConsultantsOrAdminsData } from '../../hooks/useConsultantsOrAdminsData';
import { useTenantsData } from '../../hooks/useTenantsData';
import { useTopicList } from '../../hooks/useTopicList';
import { useUserPermissions } from '../../hooks/useUserPermission';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import {
    accountDocs,
    adviceSeekerDocs,
    agencyDocs,
    departmentDocs,
    tenantDocs,
    topicDocs,
    type EntityLabels,
} from './searchEntities';
import type { SearchDoc } from './searchTypes';

/** Rows per list; the search shows the best few, the page behind the result shows the rest. */
const PER_LIST = 5;
const MIN_LENGTH = 2;
const DEBOUNCE_MS = 250;
const NO_FILTERS = {};

/**
 * Tenants, agencies (and their departments), topics, accounts and advice seekers that match `query`, through
 * the same list endpoints the pages use and only for what the admin may read. The server
 * does the matching (names, e-mail, id); nothing is cached beyond react-query's own cache.
 */
export const useSearchEntities = (query: string) => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();
    const [search] = useDebounce(query.trim(), DEBOUNCE_MS);
    const enabled = search.length >= MIN_LENGTH;

    const canTenants = isSuperAdmin && can(PermissionAction.Create, Resource.Tenant);
    const canAgencies = can(PermissionAction.Read, Resource.Agency);
    const canTopics = can(PermissionAction.Read, Resource.Topic);
    const canConsultants = can(PermissionAction.Read, Resource.Consultant);
    const canAgencyAdmins = can(PermissionAction.Read, Resource.AgencyAdminUser);
    const canTenantAdmins = can(PermissionAction.Read, Resource.TenantAdminUser);
    const canAdviceSeekers = can(PermissionAction.Read, Resource.AdviceSeeker);

    const tenants = useTenantsData({ search, perPage: PER_LIST, enabled: enabled && canTenants });
    const agencies = useAgenciesData({ search, pageSize: PER_LIST, enabled: enabled && canAgencies });
    const topics = useTopicList({ current: 1, search, pageSize: 50, enabled: enabled && canTopics });
    // The account lists swallow a failed request into an empty list unless told to reject; without
    // `rethrowOnFailure` their `isError` never turns true and an outage reads as "nothing found".
    const consultants = useConsultantsOrAdminsData({
        typeOfUser: TypeOfUser.Consultants,
        search,
        pageSize: PER_LIST,
        rethrowOnFailure: true,
        enabled: enabled && canConsultants,
    });
    const agencyAdmins = useConsultantsOrAdminsData({
        typeOfUser: TypeOfUser.AgencyAdmins,
        search,
        pageSize: PER_LIST,
        rethrowOnFailure: true,
        enabled: enabled && canAgencyAdmins,
    });
    const tenantAdmins = useConsultantsOrAdminsData({
        typeOfUser: TypeOfUser.TenantAdmins,
        search,
        pageSize: PER_LIST,
        rethrowOnFailure: true,
        enabled: enabled && canTenantAdmins,
    });

    // Usernames are stored encoded, so the server finds only the complete username.
    const adviceSeekers = useAdviceSeekersData({
        page: 1,
        perPage: PER_LIST,
        username: search,
        filters: NO_FILTERS,
        enabled: enabled && canAdviceSeekers,
    });

    const labels = useMemo<EntityLabels>(
        () => ({
            tenants: t('adminSearch.group.tenants'),
            agencies: t('adminSearch.group.agencies'),
            topics: t('adminSearch.group.topics'),
            departments: t('adminSearch.group.departments'),
            accounts: t('adminSearch.group.accounts'),
            accountLists: {
                consultants: t('users.sectionPills.counsellors'),
                'agency-admins': t('users.sectionPills.counsellorAdmins'),
                'tenant-admins': t('users.sectionPills.tenantAdmins'),
                'advice-seekers': t('users.sectionPills.adviceSeekers'),
            },
        }),
        [t],
    );

    const canEditTopics = can([PermissionAction.Update, PermissionAction.Create], Resource.Topic);
    const queries = [tenants, agencies, topics, consultants, agencyAdmins, tenantAdmins, adviceSeekers];
    const isFetching = enabled && queries.some((result) => result.isFetching);
    // A list that failed (403, 500) drops out of the results; without this it reads as "nothing found".
    const hasError = enabled && queries.some((result) => result.isError);
    const stamp = queries.map((result) => result.dataUpdatedAt).join('|');

    const docs = useMemo<SearchDoc[]>(() => {
        if (!enabled) {
            return [];
        }

        // The topic list has no server search (it returns them all): narrow it here.
        const needle = search.toLowerCase();
        const matchingTopics = (topics.data?.data ?? []).filter((topic) =>
            `${topic.name} ${topic.description ?? ''} ${topic.internalIdentifier ?? ''}`.toLowerCase().includes(needle),
        );

        return [
            ...tenantDocs(tenants.data?.data ?? [], labels),
            ...agencyDocs(agencies.data?.data ?? [], labels),
            ...departmentDocs(agencies.data?.data ?? [], labels),
            ...topicDocs(matchingTopics.slice(0, PER_LIST), labels, canEditTopics),
            ...accountDocs(consultants.data?.data ?? [], 'consultants', labels),
            ...accountDocs(agencyAdmins.data?.data ?? [], 'agency-admins', labels),
            ...accountDocs(tenantAdmins.data?.data ?? [], 'tenant-admins', labels),
            ...adviceSeekerDocs(adviceSeekers.data?.data ?? [], labels),
        ];
        // `stamp` changes exactly when one of the lists got new data.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, labels, search, stamp, canEditTopics]);

    // `search` trails the typed text by the debounce; the rows belong to `search`, not to what is typed now.
    return { docs, isFetching, hasError, forQuery: search };
};
