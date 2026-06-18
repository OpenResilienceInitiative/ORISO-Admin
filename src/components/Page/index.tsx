import { ChevronLeft } from '@mui/icons-material';
import { Spin } from 'antd';
import classNames from 'classnames';
import React, { cloneElement, forwardRef, LegacyRef, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { ReactComponent as FunctionalitiesIcon } from '../../resources/img/svg/permissions/functionalities.svg';
import { ReactComponent as GlobalSettingsIcon } from '../../resources/img/svg/permissions/global_settings.svg';
import { ReactComponent as MasterDataIcon } from '../../resources/img/svg/permissions/master_data.svg';
import { ReactComponent as TabStarIcon } from '../../resources/img/svg/permissions/tab_star.svg';
import { ReactComponent as AppearanceIcon } from '../../resources/img/svg/settings-tabs/appearance.svg';
import { ReactComponent as AppearanceFilledIcon } from '../../resources/img/svg/settings-tabs/appearance_filled.svg';
import { ReactComponent as EmailServerIcon } from '../../resources/img/svg/settings-tabs/email_server.svg';
import { ReactComponent as FunctionalityAccessIcon } from '../../resources/img/svg/settings-tabs/feature_access.svg';
import { ReactComponent as GlobalConfigIcon } from '../../resources/img/svg/settings-tabs/global_configs.svg';
import { ReactComponent as LegalIcon } from '../../resources/img/svg/settings-tabs/legal.svg';
import { ReactComponent as MasterDataFilledIcon } from '../../resources/img/svg/settings-tabs/master_data.svg';
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
    titleMaxLength?: number;
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

const tabIcons: Record<
    string,
    {
        outline: React.ComponentType<React.SVGProps<SVGSVGElement>>;
        filled?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    }
> = {
    appearance: {
        outline: AppearanceIcon,
        filled: AppearanceFilledIcon,
    },
    email_server: {
        outline: EmailServerIcon,
    },
    functionalities: {
        outline: FunctionalitiesIcon,
    },
    functionality_access: {
        outline: FunctionalityAccessIcon,
    },
    global_config: {
        outline: GlobalConfigIcon,
    },
    global_settings: {
        outline: GlobalSettingsIcon,
    },
    legal: {
        outline: LegalIcon,
    },
    master_data: {
        outline: MasterDataIcon,
        filled: MasterDataFilledIcon,
    },
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
                    const IconSet = iconName ? tabIcons[iconName] : undefined;

                    return (
                        <NavLink
                            className={({ isActive }) => classNames(styles.tab, { active: isActive })}
                            to={tab.to}
                            key={tab.titleKey}
                        >
                            {({ isActive }) => {
                                const TabIcon = isActive
                                    ? IconSet?.filled || IconSet?.outline || TabStarIcon
                                    : IconSet?.outline || TabStarIcon;

                                return (
                                    <>
                                        <TabIcon className={styles.tabStar} width={20} height={20} />
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
        <div className={styles.pageTitleContainer} ref={ref as LegacyRef<HTMLDivElement>}>
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
        <div className={styles.back} ref={ref as LegacyRef<HTMLDivElement>}>
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
