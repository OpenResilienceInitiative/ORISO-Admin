import { ChevronLeft } from '@mui/icons-material';
import { Spin } from 'antd';
import classNames from 'classnames';
import React, { cloneElement, forwardRef, LegacyRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { ReactComponent as AppearanceIcon } from '../../resources/img/svg/permissions/appearance.svg';
import { ReactComponent as EmailServerIcon } from '../../resources/img/svg/permissions/email_server.svg';
import { ReactComponent as FunctionalitiesIcon } from '../../resources/img/svg/permissions/functionalities.svg';
import { ReactComponent as FunctionalityAccessIcon } from '../../resources/img/svg/permissions/functionality_access.svg';
import { ReactComponent as GlobalConfigIcon } from '../../resources/img/svg/permissions/global_config.svg';
import { ReactComponent as GlobalSettingsIcon } from '../../resources/img/svg/permissions/global_settings.svg';
import { ReactComponent as LegalIcon } from '../../resources/img/svg/permissions/legal.svg';
import { ReactComponent as MasterDataIcon } from '../../resources/img/svg/permissions/master_data.svg';
import { ReactComponent as TabStarIcon } from '../../resources/img/svg/permissions/tab_star.svg';
import styles from './styles.module.scss';

interface PageProps {
    isLoading?: boolean;
    stickyHeader?: boolean;
    children?: React.ReactChild | React.ReactChild[];
}

interface PageTitleProps {
    // Kept for API compatibility; new design hides all page titles.
    // eslint-disable-next-line react/no-unused-prop-types
    titleKey?: string;
    // eslint-disable-next-line react/no-unused-prop-types
    subTitleKey?: string;
    // eslint-disable-next-line react/no-unused-prop-types
    subTitle?: React.ReactChild;
    children?: React.ReactChild | React.ReactChild[];
    tabs?: Array<{ to: string; titleKey; iconName?: string }>;
}

interface PageBackProps {
    title?: React.ReactChild;
    titleKey?: string;
    path: string;
    children?: React.ReactChild | React.ReactChild[];
    tabs?: Array<{ to: string; titleKey: string; iconName?: string; icon?: JSX.Element }>;
}

export const Page = ({ children, stickyHeader, isLoading }: PageProps) => {
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

const tabIcons = {
    appearance: AppearanceIcon,
    email_server: EmailServerIcon,
    functionalities: FunctionalitiesIcon,
    functionality_access: FunctionalityAccessIcon,
    global_config: GlobalConfigIcon,
    global_settings: GlobalSettingsIcon,
    legal: LegalIcon,
    master_data: MasterDataIcon,
};

const PageTabs = ({ tabs }: { tabs: Array<{ to: string; titleKey; iconName?: string; icon?: JSX.Element }> }) => {
    const { t } = useTranslation();

    return (
        <div className={styles.tabsContainer}>
            {tabs
                ?.filter((tab) => tab && tab.to)
                .map(({ icon, iconName, ...tab }) => {
                    const TabIcon = iconName ? tabIcons[iconName] || TabStarIcon : TabStarIcon;

                    return (
                        <NavLink className={styles.tab} to={tab.to} key={tab.titleKey}>
                            <TabIcon className={styles.tabStar} width={20} height={20} />
                            <span className={styles.tabLabel}>{t(tab.titleKey)}</span>
                            {icon && cloneElement(icon, { className: styles.tabIcon })}
                        </NavLink>
                    );
                })}
        </div>
    );
};

export const PageTitle = forwardRef(({ tabs, children }: PageTitleProps, ref) => {
    const finalTabs = useMemo(() => tabs?.filter?.(Boolean) || [], [tabs]);

    return (
        <div className={styles.pageTitleContainer} ref={ref as LegacyRef<HTMLDivElement>}>
            {children}
            {!!finalTabs?.length && finalTabs.length > 1 && <PageTabs tabs={finalTabs} />}
        </div>
    );
});

export const PageBack = forwardRef(({ path, title, titleKey, tabs, children }: PageBackProps, ref) => {
    const { t } = useTranslation();
    const finalTabs = useMemo(() => tabs?.filter?.(Boolean) || [], [tabs]);

    return (
        <div className={styles.back} ref={ref as LegacyRef<HTMLDivElement>}>
            <NavLink to={path} className={classNames(styles.backLink, { [styles.backWithTabs]: !!finalTabs?.length })}>
                <ChevronLeft />
                <h3 className={styles.backHeadline}>{title || t(titleKey)}</h3>
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
