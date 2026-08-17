import { useState } from 'react';
import InfoIcon from '@mui/icons-material/Info';
import LockIcon from '@mui/icons-material/Lock';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves for TypeScript and Vite
import { expect, waitFor, within } from 'storybook/test';
import { ReactComponent as LockOpenRightFilledIcon } from '../../resources/img/svg/oriso/lock_open_right_filled_20px.svg';
import { NavGlyph } from '../NavGlyph';
import { M3FabMenu, type M3FabMenuProps } from './M3FabMenu';

const items = [
    { key: 'settings', label: 'Einstellungen', icon: <NavGlyph name="displaySettings" />, to: '/admin/settings' },
    { key: 'tenants', label: 'Träger', icon: <NavGlyph name="tenants" />, to: '/admin/tenants' },
    { key: 'agencies', label: 'Beratungstellen', icon: <NavGlyph name="counseling" />, to: '/admin/agencies' },
    { key: 'users', label: 'Nutzende', icon: <NavGlyph name="users" />, to: '/admin/users' },
    { key: 'statistics', label: 'Stastiken', icon: <NavGlyph name="statistics" />, to: '/admin/statistics' },
    { key: 'links', label: 'Links', icon: <NavGlyph name="links" />, to: '/admin/links' },
];

const footerItems = [
    { key: 'profile', label: 'Konto', icon: <NavGlyph name="profile" />, to: '/admin/profile' },
    { key: 'logout', label: 'Abmelden', icon: <NavGlyph name="logout" /> },
];

const policyItems = [
    { key: 'enabled-enforced', label: 'Aktivierung erzwungen', icon: <LockIcon /> },
    { key: 'disabled-enforced', label: 'Deaktivierung erzwungen', icon: <LockIcon /> },
    {
        key: 'enabled-suggested',
        label: 'Aktivierung (anpassbar)',
        icon: <LockOpenRightFilledIcon aria-hidden />,
    },
    {
        key: 'disabled-suggested',
        label: 'Deaktivierung (anpassbar)',
        icon: <LockOpenRightFilledIcon aria-hidden />,
    },
    { key: 'info', label: 'Weitere Informationen', icon: <InfoIcon /> },
];

/**
 * Renders the menu where it lives: bottom-left of a phone-sized surface, so the
 * stack's growth direction and the 6px inset are visible in the story rather
 * than only in the app.
 */
const PhoneFrame = (props: M3FabMenuProps) => {
    const [open, setOpen] = useState(props.open);

    return (
        <div
            style={{
                display: 'flex',
                width: 390,
                height: 650,
                alignItems: 'flex-end',
                padding: 6,
                background: 'var(--schemes-background, #f3eeee)',
                boxSizing: 'border-box',
            }}
        >
            <M3FabMenu {...props} open={open} onOpenChange={setOpen} />
        </div>
    );
};

const ActionPlacementFrame = ({ edge }: { edge: 'top' | 'bottom' }) => (
    <div
        style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: edge === 'top' ? 'flex-start' : 'flex-end',
            padding: 'var(--spacing-sm)',
            background: 'var(--schemes-background)',
            boxSizing: 'border-box',
        }}
    >
        <M3FabMenu
            items={policyItems}
            activeKey="enabled-suggested"
            open
            openLabel="Policy-Auswahl öffnen"
            closeLabel="Policy-Auswahl schließen"
            variant="action"
            tone="primary"
            onOpenChange={() => undefined}
        />
    </div>
);

const expectPlacement = async (canvasElement: HTMLElement, direction: 'up' | 'down') => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: 'Policy-Auswahl schließen' });
    const stack = canvasElement.querySelector<HTMLElement>('[data-admin-fab-menu-stack]');
    await expect(stack).not.toBeNull();

    await waitFor(() => {
        const stackRect = stack!.getBoundingClientRect();
        const toggleRect = toggle.getBoundingClientRect();
        if (direction === 'down') {
            expect(stackRect.top).toBeGreaterThan(toggleRect.bottom);
        } else {
            expect(stackRect.bottom).toBeLessThan(toggleRect.top);
        }
    });
};

const meta = {
    title: 'Molecules/M3FabMenu',
    component: M3FabMenu,
    parameters: {
        // The frame is the phone; any harness padding would shift every
        // measurement taken against the Figma node.
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/RTUi1rcrEWECXz8rNFmj7Q/Design-System-M3_ORISO?node-id=61636-7431',
        },
    },
    render: (args) => <PhoneFrame {...args} />,
    args: {
        items,
        activeKey: 'settings',
        openLabel: 'Menü öffnen',
        closeLabel: 'Menü schließen',
        onOpenChange: () => undefined,
    },
} satisfies Meta<typeof M3FabMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Resting state: the FAB carries the icon of the page you are on. */
export const Closed: Story = {
    args: { open: false },
};

/** Figma 1683:39454 — destinations stacked above the close button. */
export const Open: Story = {
    args: { open: true },
};

/** Account and sign-out below the divider (Q2, decided 2026-08-07). */
export const OpenWithAccount: Story = {
    args: { open: true, footerItems },
};

/** The active destination is further down the list, not the first entry. */
export const OpenDeepInTheList: Story = {
    args: { open: true, activeKey: 'statistics', footerItems },
};

/** Five policy actions near the top edge expand down into the available space. */
export const ActionNearTopOpensDownward: Story = {
    args: { open: true },
    render: () => <ActionPlacementFrame edge="top" />,
    play: async ({ canvasElement }) => {
        await expectPlacement(canvasElement, 'down');
    },
};

/** The same five actions near the bottom edge flip above the FAB before collision. */
export const ActionNearBottomOpensUpward: Story = {
    args: { open: true },
    render: () => <ActionPlacementFrame edge="bottom" />,
    play: async ({ canvasElement }) => {
        await expectPlacement(canvasElement, 'up');
    },
};
