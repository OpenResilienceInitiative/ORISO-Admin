import { useEffect, useState } from 'react';
import InfoIcon from '@mui/icons-material/Info';
import LockIcon from '@mui/icons-material/Lock';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves for TypeScript and Vite
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ReactComponent as LockOpenRightFilledIcon } from '../../resources/img/svg/oriso/lock_open_right_filled_20px.svg';
import { NavGlyph } from '../NavGlyph';
import { M3FabMenu, type M3FabMenuItem, type M3FabMenuProps } from './M3FabMenu';

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

// Tone per action (#992): "activate" is primary, "deactivate" and the info
// entry are neutral — whatever the feature is currently set to.
const policyItems: M3FabMenuItem[] = [
    { key: 'enabled-enforced', label: 'Aktivierung (Vorgabe)', icon: <LockIcon />, tone: 'primary' },
    { key: 'disabled-enforced', label: 'Deaktivierung (Vorgabe)', icon: <LockIcon />, tone: 'neutral' },
    {
        key: 'enabled-suggested',
        label: 'Aktivierung (anpassbar)',
        icon: <LockOpenRightFilledIcon aria-hidden />,
        tone: 'primary',
    },
    {
        key: 'disabled-suggested',
        label: 'Deaktivierung (anpassbar)',
        icon: <LockOpenRightFilledIcon aria-hidden />,
        tone: 'neutral',
    },
    { key: 'info', label: 'Weitere Informationen', icon: <InfoIcon />, tone: 'neutral' },
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

const ActionPlacementFrame = ({ edge, tone = 'primary' }: { edge: 'top' | 'bottom'; tone?: 'primary' | 'neutral' }) => (
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
            tone={tone}
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

const expectActionTones = async (canvasElement: HTMLElement) => {
    const canvas = within(canvasElement);
    // Drop the focus state layer (a color-mix on the tone) before measuring.
    (document.activeElement as HTMLElement | null)?.blur();
    const primary = 'rgb(165, 0, 10)';
    const neutral = 'rgb(76, 85, 95)';
    const backgroundOf = (name: string) =>
        window.getComputedStyle(canvas.getByRole('button', { name })).backgroundColor;
    await Promise.all([
        ...['Aktivierung (Vorgabe)', 'Aktivierung (anpassbar)'].map((name) => expect(backgroundOf(name)).toBe(primary)),
        ...['Deaktivierung (Vorgabe)', 'Deaktivierung (anpassbar)', 'Weitere Informationen'].map((name) =>
            expect(backgroundOf(name)).toBe(neutral),
        ),
    ]);
};

/** Feature currently ON: the FAB is primary, but "deactivate" pills stay neutral (#992). */
export const ActionTonesFollowTheActionWhileOn: Story = {
    args: { open: true },
    render: () => <ActionPlacementFrame edge="bottom" tone="primary" />,
    play: async ({ canvasElement }) => {
        await expectActionTones(canvasElement);
        const fab = within(canvasElement).getByRole('button', { name: 'Policy-Auswahl schließen' });
        await expect(window.getComputedStyle(fab).backgroundColor).toBe('rgb(165, 0, 10)');
    },
};

/** Feature currently OFF: the FAB is neutral, but "activate" pills stay primary (#992). */
export const ActionTonesFollowTheActionWhileOff: Story = {
    args: { open: true },
    render: () => <ActionPlacementFrame edge="bottom" tone="neutral" />,
    play: async ({ canvasElement }) => {
        await expectActionTones(canvasElement);
        const fab = within(canvasElement).getByRole('button', { name: 'Policy-Auswahl schließen' });
        await expect(window.getComputedStyle(fab).backgroundColor).toBe('rgb(76, 85, 95)');
    },
};

const consentItems: M3FabMenuItem[] = [
    {
        key: 'opt-in',
        label: 'Zustimmung Opt-In (anpassbar)',
        description: 'Die ratsuchende Person wird vorher gefragt. Der Zugriff beginnt erst mit ihrer Zustimmung.',
        icon: <LockOpenRightFilledIcon aria-hidden />,
        tone: 'primary',
    },
    {
        key: 'opt-out',
        label: 'Zustimmung Opt-Out (anpassbar)',
        description:
            'Stillschweigend: Der Zugriff beginnt sofort, die ratsuchende Person wird informiert und kann widersprechen.',
        icon: <LockOpenRightFilledIcon aria-hidden />,
        tone: 'neutral',
    },
    { key: 'info', label: 'Weitere Informationen', icon: <InfoIcon />, tone: 'neutral' },
];

/** FE#1725: pills with a supporting sentence (case-handover consent); the sentence is the description. */
export const ActionWithDescriptions: Story = {
    args: { open: true },
    render: () => (
        <PhoneFrame
            variant="action"
            items={consentItems}
            activeKey="opt-in"
            open
            openLabel="Policy-Auswahl öffnen"
            closeLabel="Policy-Auswahl schließen"
            onOpenChange={() => undefined}
        />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const optOut = await canvas.findByRole('button', { name: 'Zustimmung Opt-Out (anpassbar)' });
        await expect(optOut).toHaveAccessibleDescription(/sofort.*widersprechen/);
        await expect(canvas.getByText(/sofort, die ratsuchende Person/)).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Weitere Informationen' })).not.toHaveAttribute(
            'aria-describedby',
        );
    },
};

/** Long policy descriptions stay inside the scrolling settings deck and remain keyboard reachable. */
export const ActionInScrollContainer: Story = {
    args: { open: true },
    render: () => (
        <div
            data-testid="scroll-deck"
            style={{
                position: 'fixed',
                top: 48,
                bottom: 48,
                left: 'min(200px, 4vw)',
                width: 'min(260px, calc(100vw - 32px))',
                overflowX: 'hidden',
                overflowY: 'auto',
                background: 'var(--schemes-background, #f3eeee)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '80px 20px 24px' }}>
                <M3FabMenu
                    variant="action"
                    items={Array.from({ length: 10 }, (_, index) => ({
                        key: `${index}`,
                        label: `Option ${index + 1}`,
                        description: 'Eine längere Erklärung bleibt lesbar und über die Tastatur erreichbar.',
                    }))}
                    open
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                    onOpenChange={() => undefined}
                />
            </div>
            <div style={{ height: 1200 }} aria-hidden="true" />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const deck = within(canvasElement).getByTestId('scroll-deck');
        const stack = canvasElement.querySelector<HTMLElement>('[data-admin-fab-menu-stack]')!;
        const first = within(canvasElement).getByRole('button', { name: 'Option 1' });
        await waitFor(() => {
            expect(stack.getBoundingClientRect().bottom).toBeLessThanOrEqual(deck.getBoundingClientRect().bottom - 7);
            expect(stack.getBoundingClientRect().left).toBeGreaterThanOrEqual(deck.getBoundingClientRect().left + 5);
            expect(stack.getBoundingClientRect().right).toBeLessThanOrEqual(deck.getBoundingClientRect().right - 5);
            expect(stack.scrollHeight).toBeGreaterThan(stack.clientHeight);
            expect(getComputedStyle(stack).scrollbarWidth).not.toBe('none');
            expect(stack.querySelector('[data-admin-fab-scroll-hint]')).not.toBeNull();
        });
        // Scroll the actual ancestor: placement must follow the trigger without
        // letting the stack escape the independently scrolling settings deck.
        // The FAB moves 40px up, so the downward cap must grow by those 40px;
        // a stale placement would keep the old cap and still pass a bounds check.
        const capBefore = parseFloat(stack.style.maxHeight);
        expect(capBefore).toBeGreaterThan(0);
        deck.scrollTop = 40;
        deck.dispatchEvent(new Event('scroll'));
        await waitFor(() => {
            expect(parseFloat(stack.style.maxHeight)).toBeCloseTo(capBefore + 40, 0);
            const deckInset = deck.getBoundingClientRect().bottom - stack.getBoundingClientRect().bottom;
            expect(deckInset).toBeGreaterThanOrEqual(7);
            expect(deckInset).toBeLessThanOrEqual(9);
            expect(deck.scrollTop).toBe(40);
        });
        first.focus();
        for (let index = 0; index < 9; index += 1) {
            // Each Tab must complete before the next one moves focus.
            // eslint-disable-next-line no-await-in-loop
            await userEvent.tab();
        }
        const last = within(canvasElement).getByRole('button', { name: 'Option 10' });
        await expect(last).toHaveFocus();
        // Allow floating placement and nested scroll observers to settle before measuring.
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 300);
        });
        await waitFor(() => {
            expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(stack.getBoundingClientRect().bottom + 1);
            expect(last.getBoundingClientRect().right).toBeLessThanOrEqual(stack.getBoundingClientRect().right + 1);
            expect(last.scrollWidth).toBeLessThanOrEqual(last.clientWidth + 1);
            expect(stack.querySelector('[data-admin-fab-scroll-hint]')).toBeNull();
        });
    },
};

const LENGTHEN_EVENT = 'm3-fab-story-lengthen-description';
const ChangingDescriptionFrame = () => {
    const [long, setLong] = useState(false);
    // Out-of-band trigger: a click inside the page would close the menu.
    useEffect(() => {
        const lengthen = () => setLong(true);
        window.addEventListener(LENGTHEN_EVENT, lengthen);
        return () => window.removeEventListener(LENGTHEN_EVENT, lengthen);
    }, []);
    return (
        <div
            data-testid="changing-deck"
            style={{ position: 'fixed', top: 48, height: 420, left: 16, width: 300, overflow: 'auto' }}
        >
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 16px 0' }}>
                <M3FabMenu
                    variant="action"
                    items={Array.from({ length: 8 }, (_, index) => ({
                        key: `${index}`,
                        label: `Option ${index + 1}`,
                        description:
                            long && index === 7
                                ? 'Diese Erklärung ist jetzt deutlich länger und braucht mehrere Zeilen, ' +
                                  'damit die letzte Auswahl wieder unter den sichtbaren Rand rutscht.'
                                : 'Kurz.',
                    }))}
                    open
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                    onOpenChange={() => undefined}
                />
            </div>
            <div style={{ height: 800 }} aria-hidden="true" />
        </div>
    );
};

/** A longer description that pushes the last option below the fold brings the scroll cue back. */
export const ScrollCueFollowsContentChange: Story = {
    args: { open: true },
    render: () => <ChangingDescriptionFrame />,
    play: async ({ canvasElement }) => {
        const stack = canvasElement.querySelector<HTMLElement>('[data-admin-fab-menu-stack]')!;
        await waitFor(() => expect(stack.scrollHeight).toBeGreaterThan(stack.clientHeight));
        // Scroll the capped stack to its end: nothing is hidden, so no cue.
        stack.scrollTop = stack.scrollHeight;
        stack.dispatchEvent(new Event('scroll'));
        await waitFor(() => expect(stack.querySelector('[data-admin-fab-scroll-hint]')).toBeNull());
        const capped = stack.getBoundingClientRect().height;

        // Same item count, same capped stack size, only the text changes.
        window.dispatchEvent(new Event(LENGTHEN_EVENT));
        await waitFor(() => {
            expect(stack.getBoundingClientRect().height).toBeCloseTo(capped, 0);
            expect(stack.querySelector('[data-admin-fab-scroll-hint]')).not.toBeNull();
        });
    },
};

const LeavingTriggerFrame = () => {
    const [open, setOpen] = useState(true);
    return (
        <div
            data-testid="leaving-deck"
            style={{ position: 'fixed', top: 100, height: 300, left: 16, width: 300, overflow: 'auto' }}
        >
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '200px 16px 0' }}>
                <M3FabMenu
                    variant="action"
                    items={[{ key: 'one', label: 'Option 1' }]}
                    open={open}
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                    onOpenChange={setOpen}
                />
            </div>
            <div style={{ height: 800 }} aria-hidden="true" />
        </div>
    );
};

/** Scrolling the trigger out of its deck closes the menu instead of leaving a clipped stack behind. */
export const ClosesWhenTriggerLeavesDeck: Story = {
    args: { open: true },
    render: () => <LeavingTriggerFrame />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const deck = canvas.getByTestId('leaving-deck');
        await canvas.findByRole('button', { name: 'Option 1' });
        // The FAB sits 200px into the deck; scroll it above the deck's top edge.
        deck.scrollTop = 300;
        deck.dispatchEvent(new Event('scroll'));
        await waitFor(() => expect(canvas.queryByRole('button', { name: 'Option 1' })).toBeNull());
        // Closing must not scroll the deck back to the trigger.
        await expect(deck.scrollTop).toBe(300);
        await expect(canvas.getByRole('button', { name: 'Menü öffnen' })).not.toHaveFocus();
    },
};

/** A description with an unbroken URL wraps inside a 180px deck instead of overflowing its pill. */
export const LongTokenDescriptionInNarrowDeck: Story = {
    args: { open: true },
    render: () => (
        <div
            data-testid="token-deck"
            style={{ position: 'fixed', top: 80, bottom: 80, left: 'min(200px, 4vw)', width: 180, overflow: 'auto' }}
        >
            <div style={{ minHeight: 350, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <M3FabMenu
                    variant="action"
                    items={[
                        {
                            key: 'url',
                            label: 'Datenschutz',
                            description: 'https://beratung.example.org/datenschutzerklaerung-fuer-ratsuchende-2026',
                        },
                    ]}
                    open
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                    onOpenChange={() => undefined}
                />
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        const deck = within(canvasElement).getByTestId('token-deck');
        const item = await within(canvasElement).findByRole('button', { name: 'Datenschutz' });
        await waitFor(() => {
            const description = item.querySelector<HTMLElement>('[id$="-description"]')!;
            expect(description.scrollWidth).toBeLessThanOrEqual(description.clientWidth + 1);
            expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1);
            expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(deck.getBoundingClientRect().right - 5);
            expect(deck.scrollWidth).toBeLessThanOrEqual(deck.clientWidth);
        });
    },
};

/** A long translated label without a description still fits a narrow clipping deck. */
export const LabelOnlyInNarrowScrollContainer: Story = {
    args: { open: true },
    render: () => (
        <div
            data-testid="narrow-deck"
            style={{ position: 'fixed', top: 80, bottom: 80, left: 'min(200px, 4vw)', width: 180, overflow: 'auto' }}
        >
            <div style={{ minHeight: 350, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <M3FabMenu
                    variant="action"
                    items={[{ key: 'long', label: 'Uzun çevirilerde erişim ve izin seçenekleri', icon: <LockIcon /> }]}
                    open
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                    onOpenChange={() => undefined}
                />
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        const deck = within(canvasElement).getByTestId('narrow-deck');
        const item = within(canvasElement).getByRole('button', { name: 'Uzun çevirilerde erişim ve izin seçenekleri' });
        await waitFor(() => {
            const deckRect = deck.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();
            const iconRect = item.querySelector('svg')!.getBoundingClientRect();
            expect(itemRect.left).toBeGreaterThanOrEqual(deckRect.left + 5);
            expect(itemRect.right).toBeLessThanOrEqual(deckRect.right - 5);
            expect(iconRect.left).toBeGreaterThanOrEqual(itemRect.left);
            expect(iconRect.right).toBeLessThanOrEqual(itemRect.right);
            expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth);
            expect(item.scrollHeight).toBeLessThanOrEqual(item.clientHeight);
            // Width should be used for readable words, not a one-character column.
            expect(itemRect.height).toBeLessThanOrEqual(160);
        });
    },
};

const ScrollPositionFrame = () => {
    const [open, setOpen] = useState(false);
    return (
        <div
            data-testid="position-deck"
            style={{ position: 'fixed', top: 0, left: 0, width: 360, height: 300, overflow: 'auto' }}
        >
            <div style={{ height: 600 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 16 }}>
                <M3FabMenu
                    variant="action"
                    items={Array.from({ length: 6 }, (_, index) => ({
                        key: `${index}`,
                        label: `Option ${index + 1}`,
                        description: 'Eine längere Erklärung zur Auswahl.',
                    }))}
                    open={open}
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                    onOpenChange={setOpen}
                />
            </div>
            <div style={{ height: 600 }} />
        </div>
    );
};

/** Opening and focusing the first choice must not scroll the surrounding page. */
export const FocusDoesNotScrollDeck: Story = {
    args: { open: false },
    render: () => <ScrollPositionFrame />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const deck = canvas.getByTestId('position-deck');
        deck.scrollTop = 470;
        const before = deck.scrollTop;
        await userEvent.click(canvas.getByRole('button', { name: 'Menü öffnen' }));
        const first = await canvas.findByRole('button', { name: 'Option 1' });
        await waitFor(() => expect(first).toHaveFocus());
        await expect(deck.scrollTop).toBe(before);
        await userEvent.keyboard('{Escape}');
        await expect(canvas.getByRole('button', { name: 'Menü öffnen' })).toHaveFocus();
    },
};

const StickyHeaderFrame = () => {
    const [open, setOpen] = useState(false);
    return (
        <div
            data-testid="sticky-deck"
            style={{ position: 'fixed', top: 0, left: 0, width: 360, height: 400, overflow: 'auto' }}
        >
            <div
                data-admin-page-header
                style={{ position: 'sticky', top: 0, height: 80, zIndex: 900, background: 'white' }}
            >
                Fixed page header
            </div>
            <div style={{ height: 260 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 16 }}>
                <M3FabMenu
                    variant="action"
                    items={Array.from({ length: 6 }, (_, index) => ({
                        key: `${index}`,
                        label: `Option ${index + 1}`,
                        description: 'Eine längere Erklärung zur Auswahl.',
                    }))}
                    open={open}
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                    onOpenChange={setOpen}
                />
            </div>
            <div style={{ height: 800 }} />
        </div>
    );
};

/** A page's sticky header must not cover menu choices. */
export const ActionBelowStickyHeader: Story = {
    args: { open: false },
    render: () => <StickyHeaderFrame />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const deck = canvas.getByTestId('sticky-deck');
        deck.scrollTop = 120;
        await userEvent.click(canvas.getByRole('button', { name: 'Menü öffnen' }));
        const header = canvasElement.querySelector<HTMLElement>('[data-admin-page-header]')!;
        const stack = canvasElement.querySelector<HTMLElement>('[data-admin-fab-menu-stack]')!;
        await waitFor(() => {
            expect(stack.getBoundingClientRect().top).toBeGreaterThanOrEqual(header.getBoundingClientRect().bottom + 7);
        });
        await expect(canvas.getByRole('button', { name: 'Option 1' })).toHaveFocus();
    },
};

const MobileNavigationFrame = () => {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: 360, height: 400, overflow: 'hidden' }}>
            <div style={{ height: 80 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 16 }}>
                <M3FabMenu
                    variant="action"
                    items={Array.from({ length: 6 }, (_, index) => ({
                        key: `${index}`,
                        label: `Option ${index + 1}`,
                        description: 'Eine längere Erklärung zur Auswahl.',
                    }))}
                    open={open}
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                    onOpenChange={setOpen}
                />
            </div>
            <div
                data-admin-mobile-nav
                style={{ position: 'absolute', top: 320, height: 80, width: '100%', background: 'white' }}
            >
                Mobile navigation
            </div>
        </div>
    );
};

/** A downward menu must stop before the floating mobile navigation. */
export const ActionAboveMobileNavigation: Story = {
    args: { open: false },
    render: () => <MobileNavigationFrame />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Menü öffnen' }));
        const nav = canvasElement.querySelector<HTMLElement>('[data-admin-mobile-nav]')!;
        const stack = canvasElement.querySelector<HTMLElement>('[data-admin-fab-menu-stack]')!;
        await waitFor(() => {
            expect(stack.getBoundingClientRect().bottom).toBeLessThanOrEqual(nav.getBoundingClientRect().top - 7);
        });
        await expect(canvas.getByRole('button', { name: 'Option 1' })).toHaveFocus();
    },
};
