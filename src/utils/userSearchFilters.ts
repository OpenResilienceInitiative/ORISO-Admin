/** Träger and counselling-centre filters of the users hub; the server only ever narrows with them. */
export interface UserSearchFilters {
    tenantId?: string;
    agencyIds?: string[];
}

export const hasUserSearchFilters = ({ tenantId, agencyIds }: UserSearchFilters) =>
    !!tenantId || (agencyIds?.length ?? 0) > 0;

/** Query-string tail for the user searches, e.g. `&tenantId=3&agencyId=101%2C102`. */
export const userSearchFilterParams = (
    { tenantId, agencyIds }: UserSearchFilters,
    { agencies = true }: { agencies?: boolean } = {},
): string => {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', tenantId);
    if (agencies && agencyIds?.length) params.set('agencyId', agencyIds.join(','));
    const query = params.toString();
    return query ? `&${query}` : '';
};
