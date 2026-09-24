import { UserRole } from '../enums/UserRole';
import type { InviteEmailTemplateKind } from '../api/accountInvites/accountInvites';
import type { HasRoleFn } from './caseHandoverAccess';
import type { InviteViewerScope } from '../pages/Links/inviteModel';

/**
 * Which "Links" tabs an admin may see. The section hands out invite links, and each
 * tab creates something a level BELOW the admin who uses it:
 *
 * - "Träger-Invites" create whole tenants and "Externe Inbounds" configure
 *   platform-wide inbound links → platform admin only.
 * - "Berater-Invites" create counsellors inside the admin's own unit → platform
 *   admin, tenant admin, and (#1026) Beratungsstellen-Admins (`agency-admin` /
 *   `restricted-agency-admin` without `tenant-admin`), who may invite ONLY
 *   counsellors into their own agencies. The backend enforces that rule
 *   (UserService#1215) and scopes the invite list and the agency search.
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
        return ['counsellor'];
    }
    return [];
};

/**
 * Who fills the counsellor tab's invite bar (#1026): the platform admin edits
 * everything, a tenant admin is pinned to their own Träger, a Beratungsstellen-
 * Admin to their own Träger AND own agencies and may invite counsellors only.
 */
export const resolveInviteViewerScope = ({ isSuperAdmin, hasRole }: LinksAccessContext): InviteViewerScope => {
    if (isSuperAdmin) return 'platform';
    if (!hasRole(UserRole.TenantAdmin) && isAgencyAdmin(hasRole)) return 'agency';
    return 'tenant';
};

export const canSeeLinksSection = (context: LinksAccessContext): boolean => resolveVisibleLinksTabs(context).length > 0;

/**
 * The invite e-mail template kinds each Links tab sends with. Tenant invites and
 * the contract forward belong to the platform operator's work; the counsellor
 * invite is the kind everyone else sends with — tenant admins and, since #1026,
 * Beratungsstellen-Admins, who may write templates for it (Frank, Q30/Q31,
 * 2026-09-24).
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
 * Whether an admin may change a STORED template. Because a template is shared by
 * every tenant, an edit by one tenant admin changes the mail every other tenant
 * sends; only the platform operator, who owns that shared text, may make it.
 *
 * Creating one is not gated by this, on purpose: everyone who may send invites
 * may also write a template (Q30/Q31, Frank 2026-09-24). Only the stored row is
 * protected, until templates carry an owning tenant.
 *
 * This is the UI's half. The server refuses the same PUT
 * (UserService `AccountInviteAccessPolicy#authorizeTemplateUpdate`).
 */
export const canEditSharedTemplates = ({ isSuperAdmin }: LinksAccessContext): boolean => isSuperAdmin;
