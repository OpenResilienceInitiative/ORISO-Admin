import { LiveChatLinks } from '../../../components/LiveChatLinks';
import { PermissionsSettings } from '../../../components/Tenants/AppSettings/PermissionsSettings';
import { resolveLiveChatLinksAccess } from '../../../constants/liveChatLinksAccess';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const PermissionsSettingsPage = () => {
    const { tenantId, isSuperAdmin, hasRole } = useUserRoles();
    const resolvedTenantId = tenantId && tenantId > 0 ? `${tenantId}` : '';
    // The chat links sit next to the chat settings they belong to (ORISO-Admin#1321).
    const liveChatLinksAccess = resolveLiveChatLinksAccess({ isSuperAdmin, hasRole });

    return (
        <>
            <PermissionsSettings tenantId={resolvedTenantId} superAdminControlMode={isSuperAdmin} />
            {liveChatLinksAccess !== 'none' && <LiveChatLinks mode={liveChatLinksAccess} />}
        </>
    );
};
