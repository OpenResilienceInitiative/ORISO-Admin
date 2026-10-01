import { Layout } from 'antd';
import { NavLink } from 'react-router-dom';
import { NavIcon } from './NavIcon';

const { Sider } = Layout;

export interface AdminSidebarNavItem {
    /** Stable key for the list item. */
    key: string;
    /** Route the link navigates to. */
    to: string;
    /** Accessible + visible label. */
    label: string;
    /** Path handed to `<NavIcon>` to pick the icon (matches the NavIcon switch cases). */
    iconPath: string;
    /** Forwarded to `NavLink` — exact-match only when true. */
    end?: boolean;
    /**
     * Extra active-detection on top of `NavLink`'s own `isActive`. Some items stay
     * highlighted across a family of sub-routes (settings, links). When set, the item is
     * active if `NavLink` reports active OR `currentPath` matches one of `paths` by `mode`.
     */
    activeMatch?: {
        paths: string[];
        mode: 'includes' | 'startsWith';
    };
}

export interface AdminSidebarActivityLogs {
    label: string;
    items: AdminSidebarNavItem[];
}

export interface AdminSidebarProps {
    /** Upper nav items — already filtered to what the current user may see. */
    items: AdminSidebarNavItem[];
    /** Optional grouped "activity logs" section shown below the main items. */
    activityLogs?: AdminSidebarActivityLogs;
    /**
     * Lower "account" nav item. Omitted while the layout is restricted (#891):
     * a gated admin may only enrol, recover or log out, so no destination is
     * offered that the gate would swallow anyway.
     */
    account?: AdminSidebarNavItem;
    /** Logout action row. */
    logout: {
        label: string;
        onLogout: () => void;
    };
    /** BCP-47 language tag applied to the labels (`lang` attribute). */
    lang?: string;
    /** Current pathname — used only for `activeMatch` detection. */
    currentPath: string;
}

const isPathMatch = (currentPath: string, activeMatch?: AdminSidebarNavItem['activeMatch']): boolean => {
    if (!activeMatch) {
        return false;
    }
    return activeMatch.paths.some((path) =>
        activeMatch.mode === 'startsWith' ? currentPath.startsWith(path) : currentPath.includes(path),
    );
};

const NavItemLink = ({
    item,
    lang,
    currentPath,
}: {
    item: AdminSidebarNavItem;
    lang?: string;
    currentPath: string;
}) => (
    <NavLink
        to={item.to}
        end={item.end}
        aria-label={item.label}
        title={item.label}
        className={({ isActive }) => (isActive || isPathMatch(currentPath, item.activeMatch) ? 'active' : '')}
    >
        <NavIcon path={item.iconPath} />
        <span lang={lang}>{item.label}</span>
    </NavLink>
);

/**
 * Presentational admin navigation sidebar. Every permission / visibility / routing decision
 * is made by the caller and passed in as resolved props — this component holds no hooks for
 * permissions, roles, tenant or feature state, so it renders deterministically for a given
 * set of props (and therefore in Storybook). Extracted from `ProtectedPageLayoutWrapper` for
 * issue #283; the wrapper keeps all the permission/routing logic.
 */
export const AdminSidebar = ({ items, activityLogs, account, logout, lang, currentPath }: AdminSidebarProps) => (
    <Sider width={96}>
        <div className="logo" />
        <nav className="mainMenu">
            <ul className="upperSidebar">
                {items.map((item) => (
                    <li key={item.key} className="menuItem">
                        <NavItemLink item={item} lang={lang} currentPath={currentPath} />
                    </li>
                ))}

                {activityLogs && activityLogs.items.length > 0 && (
                    <li className="menuSection" role="group" aria-label={activityLogs.label}>
                        <span className="menuSectionLabel" lang={lang}>
                            {activityLogs.label}
                        </span>
                        <ul className="menuSectionItems">
                            {activityLogs.items.map((item) => (
                                <li key={item.key} className="menuItem">
                                    <NavItemLink item={item} lang={lang} currentPath={currentPath} />
                                </li>
                            ))}
                        </ul>
                    </li>
                )}
            </ul>

            <ul className="lowerSidebar">
                {account && (
                    <li className="menuItem">
                        <NavItemLink item={account} lang={lang} currentPath={currentPath} />
                    </li>
                )}

                <li className="menuItem">
                    <button onClick={logout.onLogout} type="button" aria-label={logout.label} title={logout.label}>
                        <NavIcon path="logout" />
                        <span className="logout" lang={lang}>
                            {logout.label}
                        </span>
                    </button>
                </li>
            </ul>
        </nav>
    </Sider>
);

export default AdminSidebar;
