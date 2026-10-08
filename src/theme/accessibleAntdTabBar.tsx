import { useLayoutEffect, useRef } from 'react';
import type { TabsProps } from 'antd';
import { ownDomAttributes } from '../utils/ownedDomAttributes';

type RenderTabBar = NonNullable<TabsProps['renderTabBar']>;
type TabBarProps = Parameters<RenderTabBar>[0];
type DefaultTabBarType = Parameters<RenderTabBar>[1];

/** Pinned rc-tabs boundary: operations are siblings of the actual tab-only list. */
export const applyTabListBoundary = (root: HTMLElement) => {
    const nav = root.querySelector<HTMLElement>(':scope > .ant-tabs-nav');
    const list = nav?.querySelector<HTMLElement>(':scope > .ant-tabs-nav-wrap > .ant-tabs-nav-list');
    if (!nav || !list || nav.getAttribute('role') !== 'tablist') return undefined;
    const tabs = list.querySelectorAll('[role="tab"]');
    // Editable Add/remove buttons need a different contract. Preserve their original behavior.
    if (!tabs.length || list.querySelector('button, input, select, textarea, a[href]')) return undefined;
    if (list.hasAttribute('role')) return undefined;
    const names = ['role', 'aria-orientation', 'aria-label', 'aria-labelledby'];
    const inner = Object.fromEntries(names.map((name) => [name, nav.getAttribute(name)]));
    const restoreList = ownDomAttributes(list, inner);
    const restoreNav = ownDomAttributes(nav, Object.fromEntries(names.map((name) => [name, null])));
    return () => {
        restoreNav();
        restoreList();
    };
};

const AccessibleTabBar = ({ navProps, DefaultTabBar }: { navProps: TabBarProps; DefaultTabBar: DefaultTabBarType }) => {
    const root = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const element = root.current;
        if (!element || navProps.editable) return undefined;
        let restore = applyTabListBoundary(element);
        const observer = new MutationObserver(() => {
            restore?.();
            restore = applyTabListBoundary(element);
        });
        observer.observe(element, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            restore?.();
        };
    }, [navProps]);
    return (
        <div ref={root} style={{ display: 'contents' }}>
            <DefaultTabBar {...navProps} />
        </div>
    );
};

export const renderAccessibleAntdTabBar: RenderTabBar = (navProps, DefaultTabBar) => (
    <AccessibleTabBar navProps={navProps} DefaultTabBar={DefaultTabBar} />
);
