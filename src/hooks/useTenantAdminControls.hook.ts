import { useQuery } from 'react-query';
import { getTenantAdminControls } from '../api/tenant/getTenantAdminControls';

export const TENANT_ADMIN_CONTROLS_KEY = 'tenant-admin-controls';

export const useTenantAdminControls = (enabled = true) =>
    useQuery([TENANT_ADMIN_CONTROLS_KEY], getTenantAdminControls, {
        enabled,
        staleTime: 60_000
    });
