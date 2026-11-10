import type { Meta, StoryObj } from '@storybook/react-vite';
import { DashboardEmptyState } from './DashboardEmptyState';
import { ReactComponent as ConversationsIcon } from '../../resources/img/svg/statistics-dashboard/conversations.svg';
import trackingIllustration from '../../resources/img/tile-help/statistics/tracking.webp';

const meta = {
    title: 'Molecules/DashboardEmptyState',
    component: DashboardEmptyState,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Friendly full-width empty state for dashboards and list pages. Explains ONCE why a view is empty and what will fill it, so the widgets below can stay quiet (muted dash + hint) instead of repeating "Keine Daten" per card. Optional CTA for the most useful next step.',
            },
        },
    },
} satisfies Meta<typeof DashboardEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

// The statistics dashboard flavour: icon, explanation and a CTA towards the
// action that produces the first data (inviting counsellors).
export const WithAction: Story = {
    args: {
        icon: <ConversationsIcon />,
        title: 'Ihr Dashboard füllt sich mit der ersten Beratung',
        description: 'Sobald Anfragen eingehen, sehen Sie hier Gespräche, Themen und Auslastung auf einen Blick.',
        action: { label: 'Beratende verwalten', onClick: () => {} },
    },
};

// Minimal flavour without icon and CTA — for embedding into tighter layouts.
export const TextOnly: Story = {
    args: {
        title: 'Noch keine Einträge',
        description: 'Dieser Bereich füllt sich, sobald die ersten Daten vorliegen.',
    },
};

// Narrow viewport: the hero must stay comfortable at 375px (mobile dashboard).
export const Mobile: Story = {
    args: WithAction.args,
    decorators: [
        (Story) => (
            <div style={{ width: 375 }}>
                <Story />
            </div>
        ),
    ],
};

const STATISTICS_HIGHLIGHTS = [
    { title: 'Verlauf über Zeit', text: 'Anfragen und Gespräche pro Woche, mit Vorjahresvergleich.' },
    { title: 'Träger im Vergleich', text: 'Auslastung je Träger – nur wenn jeder Wert groß genug ist.' },
    { title: 'Themen', text: 'Welche Themen am häufigsten angefragt werden.' },
];

// Statistics preview (ORISO-Admin#1374): line-art left, what will appear here right.
export const WithIllustrationAndHighlights: Story = {
    args: {
        illustration: trackingIllustration,
        title: 'Das sehen Sie hier, sobald genug Daten da sind',
        highlights: STATISTICS_HIGHLIGHTS,
    },
};

// Same, while nothing has happened yet: the CTA leads to the step that produces data.
export const WithIllustrationAndAction: Story = {
    args: {
        illustration: trackingIllustration,
        title: 'Ihr Dashboard füllt sich mit der ersten Beratung',
        highlights: STATISTICS_HIGHLIGHTS,
        action: { label: 'Beratende verwalten', onClick: () => {} },
    },
};
