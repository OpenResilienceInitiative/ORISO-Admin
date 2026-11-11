import {
    AdminPanelSettingsOutlined,
    AppsOutlined,
    BalanceOutlined,
    CategoryOutlined,
    ChatOutlined,
    EmailOutlined,
    ManageAccountsOutlined,
    SettingsApplicationsOutlined,
    SettingsOutlined,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import { Spin } from 'antd';
import classNames from 'classnames';
import React, { forwardRef, Ref, useMemo, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { ReactComponent as TabStarIcon } from '../../resources/img/svg/permissions/tab_star.svg';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import { useRegisterMobileNav } from '../AdminMobileNav/MobileNavContext';
import { AdminSegmentedTabs, type AdminSegmentedTabItem } from '../AdminSegmentedTabs/AdminSegmentedTabs';
import { BackButton } from '../BackButton';
import styles from './styles.module.scss';

interface PageProps {
    isLoading?: boolean;
    stickyHeader?: boolean;
    children?: React.ReactNode;
}

interface PageTitleProps {
    // The visible title is hidden in the new design; it still names the tab list.
    titleKey?: string;
    // eslint-disable-next-line react/no-unused-prop-types
    subTitleKey?: string;
    // eslint-disable-next-line react/no-unused-prop-types
    subTitle?: React.ReactNode;
    children?: React.ReactNode;
    tabs?: Array<{ to: string; titleKey; iconName?: string }>;
}

interface PageBackProps {
    title?: React.ReactNode;
    titleKey?: string;
    titleMaxLength?: number;
    path: string;
    /** i18n key of the list the back button returns to ("Träger"); shown as a breadcrumb above the name. */
    parentKey?: string;
    /** Short facts about the record (subdomain, counts), shown as chips next to the name. */
    meta?: React.ReactNode[];
    children?: React.ReactNode;
    tabs?: Array<{ to: string; titleKey: string; iconName?: string; icon?: JSX.Element }>;
}

export const Page = ({ children, stickyHeader = true, isLoading }: PageProps) => {
    return (
        <div
            className={classNames(styles.page, {
                [styles.loading]: isLoading,
                [styles.stickyHeaderPage]: stickyHeader,
            })}
        >
            {isLoading ? <Spin /> : <div className={styles.content}>{children}</div>}
        </div>
    );
};

export const tabIcons: Record<string, SvgIconComponent> = {
    appearance: CategoryOutlined,
    email_server: EmailOutlined,
    erstantwort: ChatOutlined,
    functionalities: AppsOutlined,
    functionality_access: AdminPanelSettingsOutlined,
    global_config: SettingsOutlined,
    global_settings: SettingsApplicationsOutlined,
    legal: BalanceOutlined,
    master_data: ManageAccountsOutlined,
};

type PageTab = { to: string; titleKey; iconName?: string; icon?: JSX.Element };

/**
 * Desktop sub-navigation of a page header. Renders the shared
 * AdminSegmentedTabs bar, so Settings, entity edit pages, Logs, Statistics and
 * Invites all show the same underline tabs (ORISO-Admin#1374).
 */
const PageTabs = ({ tabs, ariaLabel }: { tabs: PageTab[]; ariaLabel?: string }) => {
    const { t } = useTranslation();
    const isDesktopLayout = useIsDesktopLayout();

    /*
     * Mobile renders no tab row at all: the subsections moved into the bottom
     * navigation, where the thumb is. The page only publishes them (see
     * useRegisterMobileNav in PageMobileNavRegistration below).
     */
    if (!isDesktopLayout) {
        return null;
    }

    const items: AdminSegmentedTabItem[] = tabs
        .filter((tab) => tab && tab.to)
        .map(({ icon, iconName, to, titleKey }) => {
            const Icon = (iconName && tabIcons[iconName]) || TabStarIcon;

            return {
                id: to,
                to,
                label: String(t(titleKey)),
                icon: <Icon data-admin-tab-icon={iconName || 'fallback'} />,
                badge: icon ?? undefined,
            };
        });

    return (
        <div className={styles.tabsRow} data-admin-page-tabs>
            <AdminSegmentedTabs ariaLabel={ariaLabel || String(t('page.tabs.label'))} items={items} />
        </div>
    );
};

/**
 * Publishes the page's subsections and back target to the mobile bar, which
 * renders them next to its FAB. Headless: on desktop nothing reads the
 * registration, and the tab row above is unaffected.
 */
const PageMobileNavRegistration = ({
    id,
    tabs,
    backPath,
    backLabel,
}: {
    id: string;
    tabs: Array<{ to: string; titleKey; iconName?: string; icon?: JSX.Element }>;
    backPath?: string;
    backLabel?: string;
}) => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const usable = tabs.filter((tab) => tab && tab.to);
    // Longest match wins: subsection routes share a prefix with their parent.
    const active = usable
        .filter((tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`))
        .sort((a, b) => b.to.length - a.to.length)[0];

    useRegisterMobileNav(id, {
        // `to` is load-bearing: without it M3ConnectedButtonGroup renders plain
        // buttons, and the bar never supplies onSubsectionSelect — chips would
        // look tappable and do nothing.
        subsections:
            usable.length > 1
                ? usable.map((tab) => ({
                      key: tab.to,
                      label: String(t(tab.titleKey)),
                      to: tab.to,
                  }))
                : [],
        activeSubsectionKey: active?.to,
        backPath,
        backLabel,
    });

    return null;
};

export const PageTitle = forwardRef(({ tabs, titleKey, children }: PageTitleProps, ref) => {
    const { t } = useTranslation();
    const finalTabs = useMemo(() => tabs?.filter?.(Boolean) || [], [tabs]);

    return (
        <div className={styles.pageTitleContainer} ref={ref as Ref<HTMLDivElement>} data-admin-page-header>
            <PageMobileNavRegistration id="page-title" tabs={finalTabs} />
            {children}
            {!!finalTabs?.length && finalTabs.length > 1 && (
                <PageTabs tabs={finalTabs} ariaLabel={titleKey ? String(t(titleKey)) : undefined} />
            )}
        </div>
    );
});

const getTruncatedTitle = (title: React.ReactNode, titleMaxLength?: number) => {
    if (!titleMaxLength || typeof title !== 'string' || title.length <= titleMaxLength) {
        return title;
    }

    return `${title.slice(0, titleMaxLength)}...`;
};

export const PageBack = forwardRef(
    ({ path, title, titleKey, titleMaxLength, parentKey, meta, tabs, children }: PageBackProps, ref) => {
        const { t } = useTranslation();
        const isDesktopLayout = useIsDesktopLayout();
        const finalTabs = useMemo(() => tabs?.filter?.(Boolean) || [], [tabs]);
        const headline = getTruncatedTitle(title ?? (titleKey ? t<string>(titleKey) : ''), titleMaxLength);
        const parentLabel = parentKey ? t<string>(parentKey) : undefined;
        // Names the list back leads to ("Zurück zu Beratungsstellen"); the same text is the accessible
        // name of the desktop button and of its icon-only twin in the mobile bottom bar.
        const backLabel = String(parentLabel ? t('page.back.to', { parent: parentLabel }) : t('page.back.label'));
        const visibleMeta = (meta ?? []).filter(
            (item) => item !== null && item !== undefined && item !== false && item !== '',
        );

        return (
            <div className={styles.back} ref={ref as Ref<HTMLDivElement>} data-admin-page-header>
                <PageMobileNavRegistration id="page-back" tabs={finalTabs} backPath={path} backLabel={backLabel} />
                {/* On mobile the back button lives in the bottom bar, icon only and
                without the entity name (Figma 1683:40339) — repeating it here
                would be a second control for the same thing. */}
                {/* Compact header (#1374): a small tonal back button, the list it returns to as a
                breadcrumb, the record's name and a few facts about it — instead of an 88px
                back pill that carried nothing but the name. */}
                {isDesktopLayout && (
                    <div className={classNames(styles.backBar, { [styles.backWithTabs]: !!finalTabs?.length })}>
                        <BackButton iconOnly label={backLabel} to={path} />
                        <div className={styles.backText}>
                            {parentLabel && (
                                <nav aria-label={String(t('page.breadcrumb'))}>
                                    <NavLink to={path} className={styles.breadcrumb}>
                                        {parentLabel}
                                    </NavLink>
                                </nav>
                            )}
                            <h3 className={styles.backHeadline}>{headline}</h3>
                        </div>
                        {!!visibleMeta.length && (
                            <ul className={styles.backMeta}>
                                {visibleMeta.map((item, index) => (
                                    // eslint-disable-next-line react/no-array-index-key -- static, order-stable facts
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
                {!!finalTabs?.length && finalTabs.length > 1 && (
                    <PageTabs tabs={finalTabs} ariaLabel={typeof headline === 'string' ? headline : undefined} />
                )}
                {children}
            </div>
        );
    },
);

export const PageBackWithActions = forwardRef((props: PageBackProps, ref) => (
    <PageBack {...props} ref={ref}>
        <div className={styles.actions}>{props.children}</div>
    </PageBack>
));

Page.Title = PageTitle;
Page.Back = PageBack;
Page.Back.displayName = 'PageBack';
Page.Title.displayName = 'PageTitle';
Page.BackWithActions = PageBackWithActions;
Page.BackWithActions.displayName = 'PageBackWithActions';
