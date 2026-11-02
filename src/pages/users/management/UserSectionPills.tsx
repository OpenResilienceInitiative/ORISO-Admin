import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminSegmentedTabs, AdminSegmentedTabItem } from '../../../components/AdminSegmentedTabs/AdminSegmentedTabs';
import { useRegisterMobileNav } from '../../../components/AdminMobileNav/MobileNavContext';
import { TabScroller } from '../../../components/UserTable/TabScroller';
import { getUserSections } from '../../../constants/userSections';
import { useIsDesktopLayout } from '../../../hooks/useIsDesktopLayout.hook';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { ReactComponent as AllUsersFilledIcon } from '../../../resources/img/svg/user-management/all_users_filled.svg';
import { ReactComponent as AllUsersIcon } from '../../../resources/img/svg/user-management/all_users.svg';
import styles from './UserSectionPills.module.scss';

type SectionPill = {
    id: string;
    labelKey: string;
    to?: string;
    disabled?: boolean;
};

export const UserSectionPills = () => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const isDesktopLayout = useIsDesktopLayout();
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();

    const pills = useMemo<SectionPill[]>(() => getUserSections({ isSuperAdmin, can }), [can, isSuperAdmin]);

    const navigablePills = useMemo(
        () => pills.filter((pill): pill is SectionPill & { to: string } => Boolean(pill.to) && !pill.disabled),
        [pills],
    );

    const activeSubsectionKey = useMemo(() => {
        const matches = navigablePills
            .filter((pill) => pathname === pill.to || pathname.startsWith(`${pill.to}/`))
            .sort((a, b) => b.to.length - a.to.length);

        return matches[0]?.to;
    }, [navigablePills, pathname]);

    // Page.Title is not given `tabs` here (desktop keeps AdminSegmentedTabs with
    // its own icons), so publish the same routes for the mobile chip row.
    useRegisterMobileNav(
        'users-sections',
        navigablePills.length > 1
            ? {
                  subsections: navigablePills.map((pill) => ({
                      key: pill.to,
                      label: t(pill.labelKey),
                      to: pill.to,
                  })),
                  activeSubsectionKey,
              }
            : null,
    );

    if (navigablePills.length === 0) {
        return null;
    }

    // On mobile the chip row lives in the bottom bar — repeating the pills here
    // would stack two switchers in the first viewport.
    if (!isDesktopLayout) {
        return null;
    }

    const tabItems: AdminSegmentedTabItem[] = pills.map((pill) => ({
        id: pill.id,
        label: t(pill.labelKey),
        to: pill.to,
        disabled: pill.disabled,
        icon: <AllUsersIcon />,
        activeIcon: <AllUsersFilledIcon />,
    }));

    return (
        <TabScroller>
            <AdminSegmentedTabs className={styles.container} items={tabItems} ariaLabel={t('users.allUsers')} />
        </TabScroller>
    );
};
