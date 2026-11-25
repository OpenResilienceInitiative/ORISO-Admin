import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatTile } from './StatTile';

/**
 * Small summary stat tile for the strip above a data table. With `onClick` it
 * becomes a filter toggle (`aria-pressed`); the selected fill mirrors the
 * selected `FilterChip`. The error tone renders the count in the magenta
 * error role.
 */
const meta = {
    title: 'Molecules/StatTile',
    component: StatTile,
    parameters: { layout: 'padded' },
    args: { label: 'Eingeladen', value: 12 },
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Plain, non-interactive count. */
export const Static: Story = {};

/** Magenta count for the „Braucht Aktion" tile. */
export const ErrorTone: Story = { args: { label: 'Braucht Aktion', value: 3, tone: 'error' } };

/** A quiet breakdown line under the label: which raw statuses make up the count. */
export const WithBreakdown: Story = {
    args: { label: 'Vorbereitet', value: 3, supportingText: '2 Draft · 1 Wartet', onClick: () => {} },
};

/** Disabled filter tile: greyed out, never hidden. */
export const Disabled: Story = { args: { disabled: true, onClick: () => {} } };

const BUCKETS = [
    { key: 'prepared', label: 'Vorbereitet', value: 3, supportingText: '2 Draft · 1 Wartet' },
    { key: 'invited', label: 'Eingeladen', value: 12, supportingText: '12 Gesendet' },
    { key: 'accountCreated', label: 'Konto angelegt', value: 5, supportingText: '5 Angenommen' },
    { key: 'done', label: 'Fertig', value: 21, supportingText: '21 Angenommen' },
    {
        key: 'needsAction',
        label: 'Braucht Aktion',
        value: 3,
        supportingText: '2 Abgelaufen · 1 Ersetzt',
        tone: 'error' as const,
    },
];

const FilterStrip = () => {
    const [active, setActive] = useState<string | null>('invited');

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {BUCKETS.map((bucket) => (
                <StatTile
                    key={bucket.key}
                    label={bucket.label}
                    value={bucket.value}
                    supportingText={bucket.supportingText}
                    tone={bucket.tone}
                    active={active === bucket.key}
                    onClick={() => setActive((current) => (current === bucket.key ? null : bucket.key))}
                />
            ))}
        </div>
    );
};

/** The five-phase strip of the invite board acting as a single-select filter. */
export const SummaryStrip: Story = { render: () => <FilterStrip /> };
