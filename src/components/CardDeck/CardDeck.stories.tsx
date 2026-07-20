import type { Meta, StoryObj } from '@storybook/react-vite';
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

/** Several cards overflow the visible width, so the SideScrollerFooter with prev/next arrows appears. */
export const OverflowingCards: Story = {
    render: (args) => (
        <div style={{ maxWidth: 480 }}>
            <CardDeck {...args}>
                {[1, 2, 3, 4].map((n) => (
                    <CardDeck.Item key={n}>
                        <div style={{ width: 260 }}>
                            <Card titleKey={`Karte ${n}`}>Inhalt der Karte {n}.</Card>
                        </div>
                    </CardDeck.Item>
                ))}
            </CardDeck>
        </div>
    ),
};
