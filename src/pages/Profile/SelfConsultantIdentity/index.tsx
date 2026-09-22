import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/Card';
import { GrantConsultantIdentityModal } from '../../../components/GrantConsultantIdentityModal';
import { UserRole } from '../../../enums/UserRole';
import { useUserData } from '../../../hooks/useUserData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import styles from './styles.module.scss';

const CONSULTANT_ROLE = 'consultant';
const ADMIN_ROLES = [
    UserRole.AgencyAdmin,
    UserRole.RestrictedAgencyAdmin,
    UserRole.TenantAdmin,
    UserRole.SingleTenantAdmin,
];

/**
 * Lets a Beratungsstellen-Admin or Träger-Admin make themselves a counsellor — the same grant the
 * admin edit page offers for other admins, pointed at the signed-in account. Platform admins stay
 * excluded, as on the edit pages.
 */
export const SelfConsultantIdentity = () => {
    const { t } = useTranslation();
    const { roles, hasRole, isSuperAdmin, isTechnicalAccount, tenantId } = useUserRoles();
    const { data: userData } = useUserData();
    // Realm roles live in the token, which only refreshes on the next sign-in; remember the grant
    // locally so the card does not offer it a second time in this session.
    const [granted, setGranted] = useState(false);

    const userId: string | undefined = userData?.userId;
    if (!userId || isSuperAdmin || isTechnicalAccount || !hasRole(ADMIN_ROLES)) {
        return null;
    }

    const isConsultant = granted || (roles as string[]).includes(CONSULTANT_ROLE);
    // The grant endpoint requires the user-admin realm role (UserService SecurityConfig).
    const mayGrant = hasRole(UserRole.UserAdmin);

    return (
        <Card titleKey="grantConsultantIdentity.self.title" subTitleKey="grantConsultantIdentity.self.text">
            {isConsultant ? (
                <p className={styles.note}>{t('grantConsultantIdentity.self.already')}</p>
            ) : (
                <div className={styles.body}>
                    <GrantConsultantIdentityModal
                        adminId={userId}
                        tenantId={tenantId ?? undefined}
                        disabled={!mayGrant}
                        buttonLabelKey="grantConsultantIdentity.self.button"
                        successMessageKey="message.grantConsultantIdentity.selfSuccess"
                        onSuccess={() => setGranted(true)}
                    />
                    {!mayGrant && <p className={styles.note}>{t('grantConsultantIdentity.self.noPermission')}</p>}
                </div>
            )}
        </Card>
    );
};
