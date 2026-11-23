import { useEffect } from 'react';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import { applyBrandingFavicon } from '../../utils/applyBrandingFavicon';
import { resolveBrandingFavicon } from '../../utils/resolveBrandingFavicon';

/**
 * Puts the branding favicon into the browser tab.
 *
 * AdminApp mounts the platform default on public routes and once a protected
 * route admits the session. The default comes from the shared public tenant query.
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
