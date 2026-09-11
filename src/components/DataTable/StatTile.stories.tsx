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

/** Magenta count for the problem bucket. */
export const ErrorTone: Story = { args: { label: 'Abgelaufen / Problem', value: 3, tone: 'error' } };

/** Disabled filter tile: greyed out, never hidden. */
export const Disabled: Story = { args: { disabled: true, onClick: () => {} } };

const BUCKETS = [
    { key: 'invited', label: 'Eingeladen', value: 12 },
    { key: 'inProgress', label: 'In Bearbeitung', value: 5 },
    { key: 'completed', label: 'Abgeschlossen', value: 21 },
    { key: 'problem', label: 'Abgelaufen / Problem', value: 3, tone: 'error' as const },
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
                    tone={bucket.tone}
                    active={active === bucket.key}
                    onClick={() => setActive((current) => (current === bucket.key ? null : bucket.key))}
                />
            ))}
        </div>
    );
};

/** The four-bucket summary strip acting as a single-select filter. */
export const SummaryStrip: Story = { render: () => <FilterStrip /> };
