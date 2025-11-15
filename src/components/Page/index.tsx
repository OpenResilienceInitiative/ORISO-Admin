import { ChevronLeft } from '@mui/icons-material';
import { Spin } from 'antd';
import Title from 'antd/es/typography/Title';
import classNames from 'classnames';
import React, { cloneElement, forwardRef, LegacyRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import styles from './styles.module.scss';

interface PageProps {
    isLoading?: boolean;
    stickyHeader?: boolean;
    children?: React.ReactChild | React.ReactChild[];
}

interface PageTitleProps {
    titleKey: string;
    subTitleKey?: string;
    subTitle?: React.ReactChild;
    children?: React.ReactChild | React.ReactChild[];
    tabs?: Array<{ to: string; titleKey }>;
}

interface PageBackProps {
    title?: React.ReactChild;
    titleKey?: string;
    path: string;
    children?: React.ReactChild | React.ReactChild[];
    tabs?: Array<{ to: string; titleKey: string; icon?: JSX.Element }>;
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

const PageTabs = ({ tabs }: { tabs: Array<{ to: string; titleKey; icon?: JSX.Element }> }) => {
    const { t } = useTranslation();

    return (
        <div className={styles.tabsContainer}>
            {tabs
                ?.filter((tab) => tab && tab.to)
                .map(({ icon, ...tab }) => (
                    <NavLink className={styles.tab} to={tab.to} key={tab.titleKey}>
                        {t(tab.titleKey)}
                        {icon && cloneElement(icon, { className: styles.tabIcon })}
                    </NavLink>
                ))}
        </div>
    );
};

export const PageTitle = forwardRef(({ titleKey, subTitleKey, subTitle, tabs, children }: PageTitleProps, ref) => {
    const { t } = useTranslation();
    const finalTabs = useMemo(() => tabs?.filter?.(Boolean) || [], [tabs]);

    return (
        <div className={styles.pageTitleContainer} ref={ref as LegacyRef<HTMLDivElement>}>
            <div className={classNames(styles.titleContainer, { [styles.titleWithTabs]: !!finalTabs?.length })}>
                <Title level={3} className={styles.title}>
                    {t(titleKey)}
                </Title>
                {subTitleKey && <p>{t(subTitleKey)}</p>}
                {subTitle}
            </div>
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
