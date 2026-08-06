import { useQuery } from '@tanstack/react-query';
import { getTenantAdminControls } from '../api/tenant/getTenantAdminControls';

export const TENANT_ADMIN_CONTROLS_KEY = 'tenant-admin-controls';

export const useTenantAdminControls = (enabled = true) =>
    useQuery({
        queryKey: [TENANT_ADMIN_CONTROLS_KEY],
        queryFn: getTenantAdminControls,
        enabled,
        staleTime: 60_000,
    });
