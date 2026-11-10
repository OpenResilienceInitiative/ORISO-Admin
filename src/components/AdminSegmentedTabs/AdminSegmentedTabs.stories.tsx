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
import { useState, type ComponentProps } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
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
 * 3px primary underline; icons monochrome. When the tabs do not fit, the
 * trailing ones move behind „Mehr (n)“ — the bar never wraps, truncates or
 * scrolls, and the selected tab always stays in it.
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

const narrow =
    (width: number): Decorator =>
    (Story) =>
        (
            <div style={{ width }}>
                <Story />
            </div>
        );

/**
 * The bar and its „Mehr“ button, from inside a story canvas. Waits for the web
 * font first: the bar measures its tabs again once it arrives.
 */
const barParts = async (canvasElement: HTMLElement) => {
    await canvasElement.ownerDocument.fonts.ready;
    // Two frames: the re-measure after the font is a render of its own.
    for (let frame = 0; frame < 2; frame += 1) {
        // eslint-disable-next-line no-await-in-loop -- one frame after the other
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });
    }
    const canvas = within(canvasElement);
    const tablist = canvas.getByRole('tablist');
    return {
        canvas,
        tablist,
        bar: tablist.parentElement as HTMLElement,
        more: canvas.getByRole('button', { name: /^Mehr \(\d+\)$/ }),
        page: within(canvasElement.ownerDocument.body),
    };
};

/**
 * Narrow bar (720px, like the canvas): the seven settings tabs keep their full
 * labels; the ones that do not fit sit behind a trailing „Mehr (n)“. Nothing
 * scrolls, nothing wraps, the page never scrolls sideways.
 */
export const NarrowWithMore: Story = {
    decorators: [narrow(720)],
    play: async ({ canvasElement }) => {
        const { canvas, tablist, bar, more } = await barParts(canvasElement);
        const tabs = canvas.getAllByRole('tab');
        await expect(tabs.length).toBeGreaterThan(1);
        await expect(tabs.length).toBeLessThan(SETTINGS_TABS.length);
        await expect(more).toHaveTextContent(`Mehr (${SETTINGS_TABS.length - tabs.length})`);
        // The leading tabs stay, in order.
        await expect(tabs.map((tab) => tab.textContent)).toEqual(
            SETTINGS_TABS.slice(0, tabs.length).map((item) => item.label),
        );

        // „Mehr“ opens a menu; it is not a tab and not inside the tablist.
        await expect(more).toHaveAttribute('aria-haspopup', 'menu');
        await expect(more).toHaveAttribute('aria-expanded', 'false');
        await expect(tablist).not.toContainElement(more);

        // No scrolling: the tablist shows all its visible tabs, „Mehr“ ends flush with the bar.
        await expect(tablist.scrollWidth).toBeLessThanOrEqual(tablist.clientWidth + 1);
        await expect(more.getBoundingClientRect().right).toBeLessThanOrEqual(bar.getBoundingClientRect().right + 1);
        await expect(more.getBoundingClientRect().right).toBeGreaterThan(bar.getBoundingClientRect().right - 2);
        await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(
            canvasElement.ownerDocument.documentElement.clientWidth,
        );
    },
};

/**
 * The selected tab never hides behind „Mehr“: Funktionszugriff, the last of
 * seven, takes the place of the last tab that fit and keeps its position at
 * the end of the row.
 */
export const NarrowActiveSwappedIn: Story = {
    args: {
        activeId: 'permissions',
    },
    decorators: [narrow(720)],
    play: async ({ canvasElement }) => {
        const { canvas, tablist, more } = await barParts(canvasElement);
        const active = canvas.getByRole('tab', { selected: true });
        await expect(active).toHaveTextContent('Funktionszugriff');
        const tabs = canvas.getAllByRole('tab');
        await expect(tabs[tabs.length - 1]).toBe(active);
        await expect(active.getBoundingClientRect().right).toBeLessThanOrEqual(
            tablist.getBoundingClientRect().right + 1,
        );
        await expect(more).toHaveTextContent(`Mehr (${SETTINGS_TABS.length - tabs.length})`);
    },
};

const StatefulTabs = (args: ComponentProps<typeof AdminSegmentedTabs>) => {
    const [active, setActive] = useState(args.activeId);
    return <AdminSegmentedTabs {...args} activeId={active} onChange={setActive} />;
};

/**
 * Keyboard: ↓ (or Enter/Space) opens the menu on its first entry, ↓/↑ move,
 * Esc closes it and focus returns to „Mehr“. Choosing an entry selects that
 * tab, which then moves into the bar.
 */
export const MoreMenuKeyboard: Story = {
    render: (args) => <StatefulTabs {...args} />,
    decorators: [narrow(720)],
    play: async ({ canvasElement, step, userEvent }) => {
        const { canvas, more, page } = await barParts(canvasElement);
        const hiddenCount = SETTINGS_TABS.length - canvas.getAllByRole('tab').length;
        const hidden = SETTINGS_TABS.slice(SETTINGS_TABS.length - hiddenCount);

        await step('↓ opens the menu on its first entry', async () => {
            more.focus();
            await userEvent.keyboard('{ArrowDown}');
            const menu = await page.findByRole('menu', { name: 'Weitere Unterbereiche' });
            await expect(more).toHaveAttribute('aria-expanded', 'true');
            await expect(
                within(menu)
                    .getAllByRole('menuitem')
                    .map((item) => item.textContent),
            ).toEqual(hidden.map((item) => item.label));
            await waitFor(() => expect(within(menu).getByRole('menuitem', { name: hidden[0].label })).toHaveFocus());
            await userEvent.keyboard('{ArrowDown}');
            await expect(within(menu).getByRole('menuitem', { name: hidden[1].label })).toHaveFocus();
        });

        await step('Esc closes it and focus returns to „Mehr“', async () => {
            await userEvent.keyboard('{Escape}');
            await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
            await expect(more).toHaveFocus();
            await expect(more).toHaveAttribute('aria-expanded', 'false');
        });

        await step('Enter opens it; choosing an entry selects that tab in the bar', async () => {
            await userEvent.keyboard('{Enter}');
            const menu = await page.findByRole('menu');
            const last = hidden[hidden.length - 1];
            await waitFor(() => expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus());
            await userEvent.keyboard('{End}{Enter}');
            await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
            await waitFor(() => expect(canvas.getByRole('tab', { selected: true })).toHaveTextContent(last.label));
            await expect(canvas.getByRole('button', { name: `Mehr (${hiddenCount})` })).toBeVisible();
        });
    },
};
