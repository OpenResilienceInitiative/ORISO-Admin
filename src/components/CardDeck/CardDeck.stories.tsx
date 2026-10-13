import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, within } from 'storybook/test';
import { Card } from '../Card';
import { CardDeck } from './index';

const meta = {
    title: 'Molecules/CardDeck',
    component: CardDeck,
    parameters: { layout: 'padded' },
    args: {
        ariaLabel: 'Kartenübersicht',
        previousLabel: 'Zurück',
        nextLabel: 'Weiter',
    },
} satisfies Meta<typeof CardDeck>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A single card never shows the overflow footer. */
export const SingleCard: Story = {
    render: (args) => (
        <div style={{ maxWidth: 480 }}>
            <CardDeck {...args}>
                <CardDeck.Item>
                    <Card titleKey="Karte 1">Einzelne Karte, kein Overflow.</Card>
                </CardDeck.Item>
            </CardDeck>
        </div>
    ),
};

/**
 * A single deck item may hold more than one card (e.g. the agency add form stacks
 * "Allgemeine Informationen" and "Sichtbarkeit in der Registrierung" in one item).
 * They must stack vertically and keep full width — never share the row and crush
 * each other on a narrow screen. Set the viewport to mobile to check.
 */
export const MultipleCardsPerItem: Story = {
    render: (args) => (
        <div style={{ maxWidth: 400 }}>
            <CardDeck {...args}>
                <CardDeck.Item>
                    <Card titleKey="Allgemeine Informationen">Name, PLZ, Stadt …</Card>
                    <Card titleKey="Sichtbarkeit in der Registrierung">Berater:innen hinzufügen …</Card>
                </CardDeck.Item>
            </CardDeck>
        </div>
    ),
};

/**
 * Several cards overflow the visible width, so the SideScrollerFooter appears with
 * prev/next arrows and one position dot per card (#568): the active dots mark the
 * visible cards, so off-screen cards stay discoverable.
 */
export const OverflowingCards: Story = {
    render: (args) => (
        <div style={{ maxWidth: 900 }}>
            <CardDeck {...args}>
                {[1, 2, 3, 4].map((n) => (
                    <CardDeck.Item key={n}>
                        <Card titleKey={`Karte ${n}`}>Inhalt der Karte {n}.</Card>
                    </CardDeck.Item>
                ))}
            </CardDeck>
        </div>
    ),
};

/**
 * With room for less than two cards the deck falls back to the vertical stack
 * instead of hiding every card but the first behind a horizontal scroller (#568).
 */
export const StackedFallback: Story = {
    render: (args) => (
        <div style={{ maxWidth: 480 }}>
            <CardDeck {...args}>
                {[1, 2, 3].map((n) => (
                    <CardDeck.Item key={n}>
                        <Card titleKey={`Karte ${n}`}>Inhalt der Karte {n}.</Card>
                    </CardDeck.Item>
                ))}
            </CardDeck>
        </div>
    ),
};

const columnsOf = (canvasElement: HTMLElement) =>
    new Set(
        Array.from(canvasElement.querySelectorAll('[data-admin-card-deck-item]')).map(
            (item) => (item as HTMLElement).offsetLeft,
        ),
    ).size;

const WrapDeck = ({ width, args }: { width: number; args: React.ComponentProps<typeof CardDeck> }) => (
    <div style={{ width }} data-testid="wrap-frame">
        <CardDeck {...args} layout="wrap">
            {['Datenschutz', 'Impressum', 'Auftragsverarbeitung', 'Schalter'].map((title) => (
                <CardDeck.Item key={title}>
                    <Card titleKey={title}>Inhalt von {title}.</Card>
                </CardDeck.Item>
            ))}
        </CardDeck>
    </div>
);

/** #1195: a narrow page shows one card per row and never scrolls sideways. */
export const WrapNarrow: Story = {
    render: (args) => <WrapDeck width={360} args={args} />,
    play: async ({ canvasElement }) => {
        await expect(columnsOf(canvasElement)).toBe(1);
        const frame = within(canvasElement).getByTestId('wrap-frame');
        await expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
    },
};

/** #1195: a medium page shows two cards per row. */
export const WrapMedium: Story = {
    render: (args) => <WrapDeck width={900} args={args} />,
    play: async ({ canvasElement }) => {
        await expect(columnsOf(canvasElement)).toBe(2);
    },
};

/** #1195: a very wide page shows three cards per row. */
export const WrapWide: Story = {
    render: (args) => <WrapDeck width={1400} args={args} />,
    play: async ({ canvasElement }) => {
        await expect(columnsOf(canvasElement)).toBe(3);
    },
};
