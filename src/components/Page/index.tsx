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
import { NavLink, useLocation } from 'react-router-dom';
import { ReactComponent as TabStarIcon } from '../../resources/img/svg/permissions/tab_star.svg';
import { SectionCarousel, type SectionCarouselItem } from '../SectionCarousel';
import { getSectionArtwork } from '../../constants/sectionArtwork';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import { CardDeckNavProvider, useCardDeckNav } from '../CardDeck/CardDeckNavContext';
import { SideScrollerButton } from '../SideScrollerFooter';
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
        <CardDeckNavProvider>
            <div
                className={classNames(styles.page, {
                    [styles.loading]: isLoading,
                    [styles.stickyHeaderPage]: stickyHeader,
                })}
            >
                {isLoading ? <Spin /> : <div className={styles.content}>{children}</div>}
            </div>
        </CardDeckNavProvider>
    );
};

/**
 * The card-deck arrows, anchored to the left and right edge of the page header
 * (Figma 1285-80496). They used to sit in a sticky footer under the cards, where
 * they overlapped the cards' own footer actions and toasts. The deck registers
 * itself via CardDeckNavContext; with no scrollable deck on the page both arrows
 * stay visible but disabled, so the header does not change height per route.
 */
const PageDeckNav = () => {
    const { t } = useTranslation();
    const nav = useCardDeckNav();

    return (
        <div className={styles.deckNavRail} data-admin-page-deck-nav>
            <SideScrollerButton
                controlsId={nav?.controlsId}
                direction="backward"
                edgeAnchored
                enabled={nav?.canScrollBackward ?? false}
                label={nav?.previousLabel ?? t('cardDeck.nav.previous')}
                onClick={() => nav?.scroll(-1)}
            />
            <SideScrollerButton
                controlsId={nav?.controlsId}
                direction="forward"
                edgeAnchored
                enabled={nav?.canScrollForward ?? false}
                label={nav?.nextLabel ?? t('cardDeck.nav.next')}
                onClick={() => nav?.scroll(1)}
            />
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
    const isDesktopLayout = useIsDesktopLayout();
    const { pathname } = useLocation();

    useEffect(() => {
        tabsContainerRef.current?.querySelector('a.active')?.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
        });
    }, [tabs]);

    /*
     * Mobile shows the section carousel instead of the pill row: the pills are
     * sized for a desktop header and become unusable on a phone. Artwork is
     * looked up by `iconName`, which is also what the image files are named
     * after — sections without one keep their icon on a tonal tile, so pages
     * outside settings (logs, statistics, users) work unchanged.
     */
    if (!isDesktopLayout) {
        const items: SectionCarouselItem[] = tabs
            .filter((tab) => tab && tab.to)
            .map(({ icon, iconName, ...tab }) => {
                const Icon = iconName ? tabIcons[iconName] : undefined;
                const TabIcon = Icon || TabStarIcon;

                return {
                    key: tab.to,
                    label: String(t(tab.titleKey)),
                    image: iconName ? getSectionArtwork(iconName) : undefined,
                    icon: icon ?? <TabIcon data-admin-tab-icon={iconName || 'fallback'} />,
                    to: tab.to,
                };
            });

        const active = items.filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

        return (
            <SectionCarousel
                activeKey={active.sort((a, b) => b.key.length - a.key.length)[0]?.key}
                ariaLabel={String(t('settings.title', 'Bereiche'))}
                dimUnselected
                items={items}
            />
        );
    }

    return (
        <div className={styles.tabsRow}>
            <PageDeckNav />
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
