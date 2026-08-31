import type { Meta, StoryObj } from '@storybook/react-vite';
import { SideScrollerButton, SideScrollerFooter } from './index';

const FIGMA_HEADER_RAIL = 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1285-80496';

const meta = {
    title: 'Molecules/SideScrollerFooter',
    component: SideScrollerFooter,
    parameters: {
        layout: 'padded',
        design: { type: 'figma', url: FIGMA_HEADER_RAIL },
    },
    args: {
        ariaLabel: 'Karten-Navigation',
        previousLabel: 'Zurück',
        nextLabel: 'Weiter',
        onScrollBackward: () => {},
        onScrollForward: () => {},
    },
} satisfies Meta<typeof SideScrollerFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BothDisabled: Story = {
    args: {
        canScrollBackward: false,
        canScrollForward: false,
    },
};

export const ForwardOnly: Story = {
    args: {
        canScrollBackward: false,
        canScrollForward: true,
    },
};

export const BothActive: Story = {
    args: {
        canScrollBackward: true,
        canScrollForward: true,
    },
};

/**
 * The shape the arrows take in the page header (Figma 1285-80496): two
 * edge-anchored half-pills flanking the tab row — the left one flush against
 * the sidebar, the right one flush against the viewport edge. This replaces the
 * sticky footer under the cards, where the arrows used to collide with the
 * cards' own footer actions ("Veröffentlichen", "Entwurf bearbeiten") and toasts.
 */
export const HeaderRail: Story = {
    parameters: { layout: 'fullscreen' },
    args: {
        canScrollBackward: false,
        canScrollForward: true,
    },
    render: () => (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '23px 64px 20px',
                background: '#e4e2e2',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    zIndex: 1,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pointerEvents: 'none',
                }}
            >
                <SideScrollerButton
                    direction="backward"
                    edgeAnchored
                    enabled={false}
                    label="Vorherige Karte anzeigen"
                    onClick={() => {}}
                />
                <SideScrollerButton
                    direction="forward"
                    edgeAnchored
                    enabled
                    label="Weitere Karte anzeigen"
                    onClick={() => {}}
                />
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
                {['Globale Konfigurationen', 'Erscheinungsbild', 'Rechtliches', 'Email Server'].map((tab, index) => (
                    <span
                        key={tab}
                        style={{
                            display: 'inline-flex',
                            minHeight: 76,
                            alignItems: 'center',
                            padding: '24px 38px',
                            background: index === 0 ? '#4c555f' : '#646d78',
                            borderRadius: index === 0 ? 38 : 12,
                            color: '#e7effc',
                            fontSize: 20,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {tab}
                    </span>
                ))}
            </div>
        </div>
    ),
};
