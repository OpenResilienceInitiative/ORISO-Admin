import { useEffect } from 'react';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import { applyBrandingFavicon } from '../../utils/applyBrandingFavicon';
import { resolveBrandingFavicon } from '../../utils/resolveBrandingFavicon';

/**
 * Puts the branding favicon into the browser tab.
 *
 * Mounted above the router in `index.tsx`, NOT inside `<App />`: `App` sits
 * behind `ProtectedRoute`, so the previous favicon effect never ran on
 * `/admin/login`, the password-reset pages, the onboarding pages, imprint or
 * privacy — every route an unregistered visitor actually sees. The platform
 * admin's upload has to be the default icon for those visitors too, and
 * `usePublicTenantData` reaches it without a token
 * (`GET /service/tenant/public/{mainTenantSubdomain}`, `skipAuth`).
 *
 * `tenantFavicon` is the optional, more specific override that `<App />` passes
 * once a signed-in admin's own tenant data has loaded — see
 * {@link resolveBrandingFavicon} for the full order.
 */
export const TenantFavicon = ({ tenantFavicon }: { tenantFavicon?: string }) => {
    const { data: publicTenantData } = usePublicTenantData();
    const platformFavicon = publicTenantData?.theming?.favicon;

    useEffect(() => {
        const favicon = resolveBrandingFavicon(tenantFavicon, platformFavicon);
        if (!favicon) return;
        applyBrandingFavicon(favicon);
    }, [tenantFavicon, platformFavicon]);

    return null;
};

export default TenantFavicon;
