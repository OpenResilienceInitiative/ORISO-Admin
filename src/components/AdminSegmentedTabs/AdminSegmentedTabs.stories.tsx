import {
    AdminPanelSettingsOutlined,
    BalanceOutlined,
    CategoryOutlined,
    CorporateFareOutlined,
    EmailOutlined,
    ManageAccountsOutlined,
    PublicOutlined,
    SettingsOutlined,
    StoreOutlined,
} from '@mui/icons-material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { AdminSegmentedTabs, type AdminSegmentedTabItem } from './AdminSegmentedTabs';
import { ReactComponent as PowerOffIcon } from '../../resources/img/svg/power_off.svg';
import { ReactComponent as FaceNodIcon } from '../../resources/img/svg/face_nod.svg';
import { ReactComponent as DeleteIcon } from '../../resources/img/svg/delete.svg';

/** Settings at platform level — the most tabs any sub-navigation has. */
const SETTINGS_TABS: AdminSegmentedTabItem[] = [
    { id: 'global', label: 'Konfiguration', icon: <SettingsOutlined /> },
    { id: 'master', label: 'Stammdaten', icon: <ManageAccountsOutlined /> },
    { id: 'appearance', label: 'Erscheinungsbild', icon: <CategoryOutlined /> },
    { id: 'legal', label: 'Rechtliches', icon: <BalanceOutlined /> },
    { id: 'smtp', label: 'E-Mail-Server', icon: <EmailOutlined /> },
    { id: 'notices', label: 'Systemhinweise', icon: <EmailOutlined /> },
    { id: 'permissions', label: 'Funktionszugriff', icon: <AdminPanelSettingsOutlined /> },
];

const LOGS_TABS: AdminSegmentedTabItem[] = [
    { id: 'handover', label: 'Fallübergaben', icon: <FaceNodIcon /> },
    { id: 'inactive', label: 'Inaktivitäts-Logs', icon: <PowerOffIcon /> },
    { id: 'deletions', label: 'Löschprotokoll', icon: <DeleteIcon /> },
];

const STATISTICS_TABS: AdminSegmentedTabItem[] = [
    { id: 'platform', label: 'Plattformweit', icon: <PublicOutlined /> },
    { id: 'tenant', label: 'Auf Trägerebene', icon: <CorporateFareOutlined /> },
    { id: 'agency', label: 'Auf Beratungsstellenebene', icon: <StoreOutlined /> },
];

/**
 * The one sub-navigation bar of the admin (ORISO-Admin#1374, "Variant A"):
 * underline tabs, 48px, 4px gap, full-width divider; active = primary text +
 * 3px primary underline; icons monochrome. When the tabs do not fit, the bar
 * scrolls horizontally inside itself — it never wraps or truncates.
 */
const meta = {
    title: 'Molecules/AdminSegmentedTabs',
    component: AdminSegmentedTabs,
    parameters: {
        layout: 'padded',
    },
    args: {
        ariaLabel: 'Einstellungen',
        activeId: 'global',
        items: SETTINGS_TABS,
    },
} satisfies Meta<typeof AdminSegmentedTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Settings, platform admin: seven tabs. */
export const SettingsTabs: Story = {};

export const AppearanceActive: Story = {
    args: {
        activeId: 'appearance',
    },
};

/** Logs: three tabs. The Löschprotokoll icon follows the tab colour like the others. */
export const LogsTabs: Story = {
    args: {
        ariaLabel: 'Logs',
        activeId: 'deletions',
        items: LOGS_TABS,
    },
};

export const StatisticsTabs: Story = {
    args: {
        ariaLabel: 'Statistik-Ebene',
        activeId: 'platform',
        items: STATISTICS_TABS,
    },
};

/**
 * Narrow container: the seven settings tabs stay on one line at full label
 * length and the bar scrolls inside itself; the active tab is scrolled into
 * view, the page never scrolls sideways.
 */
export const NarrowOverflowScroll: Story = {
    args: {
        activeId: 'smtp',
    },
    decorators: [
        (Story) => (
            <div style={{ width: 375 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const tablist = within(canvasElement).getByRole('tablist');
        await expect(tablist.scrollWidth).toBeGreaterThan(tablist.clientWidth);
        await expect(tablist.getBoundingClientRect().width).toBeLessThanOrEqual(375);

        const active = within(canvasElement).getByRole('tab', { selected: true });
        const bar = tablist.getBoundingClientRect();
        const tab = active.getBoundingClientRect();
        await expect(tab.left).toBeGreaterThanOrEqual(bar.left - 1);
        await expect(tab.right).toBeLessThanOrEqual(bar.right + 1);
    },
};
