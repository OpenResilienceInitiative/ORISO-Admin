import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/Card';
import { UserRole } from '../../../enums/UserRole';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { ReactComponent as RolesIcon } from '../../../resources/img/svg/permissions/functionality_access.svg';
import styles from './styles.module.scss';

const CONSULTANT_ROLE = 'consultant';

/** Realm roles worth showing to the person; `technical` and unknown roles stay hidden. */
const ROLE_LABEL_KEYS: Record<string, string> = {
    [UserRole.TenantAdmin]: 'profile.roles.role.tenantAdmin',
    [UserRole.SingleTenantAdmin]: 'profile.roles.role.singleTenantAdmin',
    [UserRole.AgencyAdmin]: 'profile.roles.role.agencyAdmin',
    [UserRole.RestrictedAgencyAdmin]: 'profile.roles.role.restrictedAgencyAdmin',
    [UserRole.TopicAdmin]: 'profile.roles.role.topicAdmin',
    [UserRole.UserAdmin]: 'profile.roles.role.userAdmin',
    [CONSULTANT_ROLE]: 'profile.roles.role.consultant',
};

/**
 * Read-only overview of the roles the signed-in account holds. Roles are granted by the
 * Träger administration, so there is nothing to edit here.
 */
export const RolesAndAssignment = () => {
    const { t } = useTranslation();
    const { roles, isSuperAdmin } = useUserRoles();

    const labelKeys = isSuperAdmin
        ? ['profile.roles.role.platformAdmin']
        : (roles as string[]).filter((role) => ROLE_LABEL_KEYS[role]).map((role) => ROLE_LABEL_KEYS[role]);

    return (
        <Card
            titleKey="profile.roles.title"
            subTitleKey="profile.roles.subtitle"
            headerIcon={<RolesIcon />}
            dataTestId="profile-roles-card"
        >
            {labelKeys.length > 0 ? (
                <ul className={styles.chips} aria-label={t('profile.roles.heading')}>
                    {labelKeys.map((key) => (
                        <li key={key} className={styles.chip}>
                            {t(key)}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={styles.note}>{t('profile.roles.empty')}</p>
            )}
        </Card>
    );
};
