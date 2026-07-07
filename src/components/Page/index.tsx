import {
    AdminPanelSettingsOutlined,
    AppsOutlined,
    BalanceOutlined,
    CategoryOutlined,
    ChevronLeft,
    EmailOutlined,
    ManageAccountsOutlined,
    SettingsApplicationsOutlined,
    SettingsOutlined,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import { Spin } from 'antd';
import classNames from 'classnames';
import React, { cloneElement, forwardRef, Ref, useEffect, useMemo, useRef, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { ReactComponent as TabStarIcon } from '../../resources/img/svg/permissions/tab_star.svg';
import styles from './styles.module.scss';

interface PageProps {
    isLoading?: boolean;
    stickyHeader?: boolean;
    children?: React.ReactNode;
}

interface PageTitleProps {
    // Kept for API compatibility; new design hides all page titles.
    // eslint-disable-next-line react/no-unused-prop-types
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
    functionalities: AppsOutlined,
    functionality_access: AdminPanelSettingsOutlined,
    global_config: SettingsOutlined,
    global_settings: SettingsApplicationsOutlined,
    legal: BalanceOutlined,
    master_data: ManageAccountsOutlined,
};

const PageTabs = ({ tabs }: { tabs: Array<{ to: string; titleKey; iconName?: string; icon?: JSX.Element }> }) => {
    const { t } = useTranslation();
    const tabsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        tabsContainerRef.current?.querySelector('a.active')?.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
        });
    }, [tabs]);

    return (
        <div className={styles.tabsContainer} ref={tabsContainerRef}>
            {tabs
                ?.filter((tab) => tab && tab.to)
                .map(({ icon, iconName, ...tab }) => {
                    const Icon = iconName ? tabIcons[iconName] : undefined;

                    return (
                        <NavLink
                            className={({ isActive }) => classNames(styles.tab, { active: isActive })}
                            to={tab.to}
                            key={tab.titleKey}
                        >
                            {() => {
                                const TabIcon = Icon || TabStarIcon;

                                return (
                                    <>
                                        <TabIcon
                                            className={styles.tabStar}
                                            data-admin-tab-icon={iconName || 'fallback'}
                                        />
                                        <span className={styles.tabLabel}>{t(tab.titleKey)}</span>
                                        {icon && cloneElement(icon, { className: styles.tabIcon })}
                                    </>
                                );
                            }}
                        </NavLink>
                    );
                })}
        </div>
    );
};

export const PageTitle = forwardRef(({ tabs, children }: PageTitleProps, ref) => {
    const finalTabs = useMemo(() => tabs?.filter?.(Boolean) || [], [tabs]);

    return (
        <div className={styles.pageTitleContainer} ref={ref as Ref<HTMLDivElement>} data-admin-page-header>
            {children}
            {!!finalTabs?.length && finalTabs.length > 1 && <PageTabs tabs={finalTabs} />}
        </div>
    );
});

const getTruncatedTitle = (title: React.ReactNode, titleMaxLength?: number) => {
    if (!titleMaxLength || typeof title !== 'string' || title.length <= titleMaxLength) {
        return title;
    }

    return `${title.slice(0, titleMaxLength)}...`;
};

export const PageBack = forwardRef(({ path, title, titleKey, titleMaxLength, tabs, children }: PageBackProps, ref) => {
    const { t } = useTranslation();
    const finalTabs = useMemo(() => tabs?.filter?.(Boolean) || [], [tabs]);
    const headline = getTruncatedTitle(title ?? (titleKey ? t<string>(titleKey) : ''), titleMaxLength);

    return (
        <div className={styles.back} ref={ref as Ref<HTMLDivElement>} data-admin-page-header>
            <NavLink to={path} className={classNames(styles.backLink, { [styles.backWithTabs]: !!finalTabs?.length })}>
                <ChevronLeft />
                <h3 className={styles.backHeadline}>{headline}</h3>
            </NavLink>
            {!!finalTabs?.length && finalTabs.length > 1 && <PageTabs tabs={finalTabs} />}
            {children}
        </div>
    );
});

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
