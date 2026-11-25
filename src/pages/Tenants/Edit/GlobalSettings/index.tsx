import { useParams } from 'react-router-dom';
import { LiveChatLinks } from '../../../../components/LiveChatLinks';
import { TenantPermissionsSettings } from '../../../../components/Tenants/AppSettings/PermissionsSettings/TenantPermissionsSettings';

/**
 * Funktionszugriff of one Träger, edited by a platform admin (`/admin/tenants/:id/global-settings`).
 * ORISO-Admin#989: it edits THIS Träger — its stored values and its policies — not the platform-wide
 * controls under /settings. ORISO-Admin#1577: the same tiles as the platform and Beratungsstelle pages,
 * the chat links on the Live Chat tile. Frank, 2026-11-25: it looks exactly like Einstellungen →
 * Funktionszugriff, so the intro carries no extra scope paragraph (the Träger name heads the page).
 */
export const TenantGlobalSettings = () => {
    const { id } = useParams<{ id: string }>();
    const tenantId = Number(id);
    const validTenantId = Number.isSafeInteger(tenantId) && tenantId > 0;

    return (
        <TenantPermissionsSettings
            tenantId={id || ''}
            liveChatLinks={
                validTenantId ? <LiveChatLinks key={tenantId} mode="manage" tenantId={tenantId} /> : undefined
            }
        />
    );
};
