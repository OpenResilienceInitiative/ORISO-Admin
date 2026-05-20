import { UserOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import routePathNames from '../../../appConfig';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import styles from './UserSectionPills.module.scss';

type SectionPill = {
    id: string;
    labelKey: string;
    to?: string;
    disabled?: boolean;
};

const PillIcon = () => <UserOutlined className={styles.pillIcon} aria-hidden />;

export const UserSectionPills = () => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();

    const pills = useMemo(() => {
        const visible: SectionPill[] = [
            {
                id: 'platform-admins',
                labelKey: 'users.sectionPills.platformAdmins',
                disabled: true,
            },
        ];

        if (can(PermissionAction.Create, Resource.Tenant)) {
            visible.push({
                id: 'tenants',
                labelKey: 'users.sectionPills.tenants',
                to: routePathNames.usersTenants,
            });
        }

        if (can(PermissionAction.Read, Resource.AgencyAdminUser)) {
            visible.push({
                id: 'agency-admins',
                labelKey: 'users.sectionPills.counsellorAdmins',
                to: routePathNames.agencyAdmins,
            });
        }

        if (can(PermissionAction.Read, Resource.Consultant)) {
            visible.push({
                id: 'counsellors',
                labelKey: 'users.sectionPills.counsellors',
                to: routePathNames.consultants,
            });
        }

        visible.push({
            id: 'volunteers',
            labelKey: 'users.sectionPills.volunteers',
            disabled: true,
        });

        return visible;
    }, [can]);

    const navigablePills = pills.filter((pill) => pill.to && !pill.disabled);

    if (navigablePills.length === 0) {
        return null;
    }

    const renderPillContent = (labelKey: string) => (
        <>
            <PillIcon />
            <span className={styles.pillLabel}>{t(labelKey)}</span>
        </>
    );

    return (
        <div className={styles.container}>
            <div className={styles.pillGroupScroll}>
                <div className={styles.pillGroup} role="tablist" aria-label={t('users.allUsers')}>
                    {pills.map((pill) => {
                        if (pill.disabled || !pill.to) {
                            return (
                                <button
                                    key={pill.id}
                                    type="button"
                                    role="tab"
                                    className={classNames(styles.pill, styles.pillDisabled)}
                                    disabled
                                    aria-disabled="true"
                                >
                                    {renderPillContent(pill.labelKey)}
                                </button>
                            );
                        }

                        return (
                            <NavLink
                                key={pill.id}
                                to={pill.to}
                                role="tab"
                                className={({ isActive }) =>
                                    classNames(styles.pill, {
                                        [styles.pillActive]: isActive,
                                    })
                                }
                            >
                                {renderPillContent(pill.labelKey)}
                            </NavLink>
                        );
                    })}
                </div>
            </div>
            <button type="button" className={styles.myAccessButton} disabled aria-disabled="true">
                <PillIcon />
                <span className={styles.myAccessLabel}>{t('users.sectionPills.myAccess')}</span>
            </button>
        </div>
    );
};
