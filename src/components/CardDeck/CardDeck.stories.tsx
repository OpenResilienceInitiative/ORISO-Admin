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
