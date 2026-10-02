import { UserRole } from '../enums/UserRole';
import type { InviteEmailTemplateKind } from '../api/accountInvites/accountInvites';
import type { HasRoleFn } from './caseHandoverAccess';
import type { InviteViewerScope } from '../pages/Links/inviteModel';

/**
 * Which "Links" tabs an admin may see. The section hands out invite links, and each
 * tab creates something a level BELOW the admin who uses it:
 *
 * - "Externe Inbounds" configure platform-wide inbound links → platform admin only.
 * - "Träger-Invites" found whole tenants for the platform admin; a tenant admin
 *   sees the tab too but only invites further admins into their OWN Träger
 *   (the server refuses anything else). An agency admin sees it, the server
 *   lets them invite counsellors only, so the tab is read-only for them.
 * - "Berater-Invites" create counsellors inside the admin's own unit → platform
 *   admin, tenant admin and agency admin (counsellors into own agencies only).
 */
export type LinksTabKey = 'tenants' | 'counsellor' | 'external-inbounds';

export interface LinksAccessContext {
    isSuperAdmin: boolean;
    hasRole: HasRoleFn;
}

const isAgencyAdmin = (hasRole: HasRoleFn): boolean => hasRole([UserRole.AgencyAdmin, UserRole.RestrictedAgencyAdmin]);

export const resolveVisibleLinksTabs = ({ isSuperAdmin, hasRole }: LinksAccessContext): LinksTabKey[] => {
    if (isSuperAdmin) {
        return ['tenants', 'counsellor', 'external-inbounds'];
    }
    if (hasRole(UserRole.TenantAdmin) || isAgencyAdmin(hasRole)) {
        return ['tenants', 'counsellor'];
    }
    return [];
};

/** A tenant admin is pinned to their own Träger; an agency admin also to their own agencies. */
export const resolveInviteViewerScope = ({ isSuperAdmin, hasRole }: LinksAccessContext): InviteViewerScope => {
    if (isSuperAdmin) return 'platform';
    if (!hasRole(UserRole.TenantAdmin) && isAgencyAdmin(hasRole)) return 'agency';
    return 'tenant';
};

export const canSeeLinksSection = (context: LinksAccessContext): boolean => resolveVisibleLinksTabs(context).length > 0;

/**
 * Which template kinds an admin may see, create and send with. Kind and the admin's
 * own level are the only line an admin's view can be drawn along: templates carry
 * no tenant in what the Admin shows, one text is shared and each Träger's branding
 * is applied when the mail is rendered.
 *
 * - Platform admin: every kind, the contract forward included.
 * - Träger admin: the Berater and the Träger invite (they add further Träger admins).
 * - Beratungsstellen admin: the Berater invite only; the Träger tab is read-only for them.
 *
 * The server enforces the same rule; this keeps the Admin from offering what it would refuse.
 */
export const resolveVisibleTemplateKinds = ({
    isSuperAdmin,
    hasRole,
}: LinksAccessContext): InviteEmailTemplateKind[] => {
    if (isSuperAdmin) return ['TENANT_INVITE', 'DPA_FORWARD', 'COUNSELLOR_INVITE'];
    if (hasRole(UserRole.TenantAdmin)) return ['TENANT_INVITE', 'COUNSELLOR_INVITE'];
    return isAgencyAdmin(hasRole) ? ['COUNSELLOR_INVITE'] : [];
};

/**
 * Whether an admin may change a STORED template. Because a template is shared by
 * every tenant, an edit by one tenant admin changes the mail every other tenant
 * sends; only the platform operator, who owns that shared text, may make it.
 *
 * Creating one is not gated, on purpose: whoever may send invites may write a template.
 * The server enforces the same rule (`AccountInviteAccessPolicy#authorizeTemplateUpdate`).
 */
export const canEditSharedTemplates = ({ isSuperAdmin }: LinksAccessContext): boolean => isSuperAdmin;
