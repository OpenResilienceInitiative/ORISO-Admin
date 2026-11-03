import { LiveChatLinks } from '../../../components/LiveChatLinks';
import { PermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings';
import { resolveLiveChatLinksAccess } from '../../../constants/liveChatLinksAccess';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const PermissionsSettingsPage = () => {
    const { tenantId, isSuperAdmin, hasRole } = useUserRoles();
    const resolvedTenantId = tenantId && tenantId > 0 ? `${tenantId}` : '';
    // The chat links sit on the live-chat tile they belong to (ORISO-Admin#1321).
    const liveChatLinksAccess = resolveLiveChatLinksAccess({ isSuperAdmin, hasRole });

    return (
        <PermissionsSettings
            tenantId={resolvedTenantId}
            superAdminControlMode={isSuperAdmin}
            liveChatLinks={liveChatLinksAccess !== 'none' ? <LiveChatLinks mode={liveChatLinksAccess} /> : undefined}
        />
    );
};
