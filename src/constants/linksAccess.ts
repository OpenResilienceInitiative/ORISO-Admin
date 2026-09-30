import { UserRole } from '../enums/UserRole';
import type { InviteEmailTemplateKind } from '../api/accountInvites/accountInvites';
import type { HasRoleFn } from './caseHandoverAccess';

/**
 * Which "Links" tabs an admin may see. The section hands out invite links, and each
 * tab creates something a level BELOW the admin who uses it:
 *
 * - "Träger-Invites" create whole tenants and "Externe Inbounds" configure
 *   platform-wide inbound links → platform admin only.
 * - "Berater-Invites" create counsellors inside the admin's own tenant → platform
 *   admin and tenant admin.
 * - Beratungsstellen-Admins (`agency-admin` / `restricted-agency-admin` without
 *   `tenant-admin`) invite nobody through links, so they get no "Links" section.
 */
export type LinksTabKey = 'tenants' | 'counsellor' | 'external-inbounds';

export interface LinksAccessContext {
    isSuperAdmin: boolean;
    hasRole: HasRoleFn;
}

export const resolveVisibleLinksTabs = ({ isSuperAdmin, hasRole }: LinksAccessContext): LinksTabKey[] => {
    if (isSuperAdmin) {
        return ['tenants', 'counsellor', 'external-inbounds'];
    }
    if (hasRole(UserRole.TenantAdmin)) {
        return ['counsellor'];
    }
    return [];
};

export const canSeeLinksSection = (context: LinksAccessContext): boolean => resolveVisibleLinksTabs(context).length > 0;

/**
 * The invite e-mail template kinds each Links tab sends with. Tenant invites and
 * the contract forward both belong to the platform operator's work; a counsellor
 * invite is the one kind a tenant admin writes.
 */
const TEMPLATE_KINDS_BY_TAB: Record<LinksTabKey, InviteEmailTemplateKind[]> = {
    tenants: ['TENANT_INVITE', 'DPA_FORWARD'],
    counsellor: ['COUNSELLOR_INVITE'],
    'external-inbounds': [],
};

/**
 * Which template kinds an admin may see in the template list — derived from the
 * tabs they may use, so a tab granted or withdrawn later carries its templates
 * with it instead of drifting from a second hand-kept list.
 *
 * Templates carry no tenant: one text is shared by the whole platform and each
 * tenant's branding is applied when the mail is rendered. Kind is therefore the
 * only line an admin's view can be drawn along.
 */
export const resolveVisibleTemplateKinds = (context: LinksAccessContext): InviteEmailTemplateKind[] =>
    resolveVisibleLinksTabs(context).flatMap((tab) => TEMPLATE_KINDS_BY_TAB[tab]);

/**
 * Whether an admin may change a stored template. Because a template is shared by
 * every tenant, an edit by one tenant admin changes the mail every other tenant
 * sends; only the platform operator, who owns that shared text, may make it.
 *
 * This is the UI's half. The server must refuse the same request (POST/PUT
 * /service/useradmin/invite-email-templates), or this only hides a door that is
 * still open.
 */
export const canEditSharedTemplates = ({ isSuperAdmin }: LinksAccessContext): boolean => isSuperAdmin;
