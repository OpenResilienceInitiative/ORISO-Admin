import { useTranslation } from 'react-i18next';
import { useUserRoles } from '../../../../hooks/useUserRoles.hook';
import { UserRole } from '../../../../enums/UserRole';
import { LegalHelpContext, LegalHelpRole, LegalHelpType, resolveLegalHelpKey } from '../utils/legalHelpTexts';

export interface LegalHelp {
    /** Normal-weight description shown next to the info icon. */
    text: string;
    /** Bold CTA tip (Figma "Text type Admin Panel", variant Hints). */
    hint: string;
    role: LegalHelpRole;
    /** i18n key base the texts were resolved from (also a stable state id). */
    keyBase: string;
}

/**
 * Resolves the role- and state-dependent editor help texts (description + bold
 * CTA hint) for a legal text card. Platform admin = super admin, tenant =
 * tenant-scoped admins, everything else (agency admins) = agency.
 */
export const useLegalHelp = (type: LegalHelpType, context: LegalHelpContext): LegalHelp => {
    const { t } = useTranslation();
    const { isSuperAdmin, isTenantScopedAdmin, hasRole } = useUserRoles();

    let role: LegalHelpRole = 'agency';
    if (isSuperAdmin) {
        role = 'platform';
    } else if (isTenantScopedAdmin || hasRole(UserRole.SingleTenantAdmin)) {
        role = 'tenant';
    }

    const keyBase = resolveLegalHelpKey(type, role, context);
    return {
        text: t(`${keyBase}.text`),
        hint: t(`${keyBase}.hint`),
        role,
        keyBase,
    };
};
