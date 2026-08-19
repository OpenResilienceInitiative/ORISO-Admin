/** Converts a tenant id to the route value without treating platform id 0 as absent. */
export const resolveTenantId = (explicitTenantId?: string, loadedTenantId?: number | null): string => {
    if (explicitTenantId !== undefined && explicitTenantId !== '') {
        return explicitTenantId;
    }
    return loadedTenantId === null || loadedTenantId === undefined ? '' : `${loadedTenantId}`;
};
