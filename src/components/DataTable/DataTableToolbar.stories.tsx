import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FilterChip } from '../FilterChip';
import { M3Button } from '../M3Button';
import { DataTableToolbar } from './DataTableToolbar';

/**
 * Slot-based toolbar row above a `DataTable`: filter chips lead, search
 * follows, actions sit at the far end. Purely structural — slots bring their
 * own components (here: `FilterChip` and `M3Button`).
 */
const meta = {
    title: 'Molecules/DataTable/Toolbar',
    component: DataTableToolbar,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof DataTableToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const STATUSES = ['Gesendet', 'Angenommen', 'Abgelaufen'];

const ToolbarExample = () => {
    const [selected, setSelected] = useState<string | null>('Gesendet');

    return (
        <DataTableToolbar
            filters={STATUSES.map((status) => (
                <FilterChip
                    key={status}
                    label={status}
                    selected={selected === status}
                    onChange={(next) => setSelected(next ? status : null)}
                />
            ))}
            actions={<M3Button variant="outlined">CSV exportieren</M3Button>}
        />
    );
};

/** Single-select status chips plus a right-aligned action. */
export const ChipsAndActions: Story = { render: () => <ToolbarExample /> };

/** Chips only — the slots collapse without reserving space. */
export const FiltersOnly: Story = {
    render: () => (
        <DataTableToolbar
            filters={STATUSES.map((status) => (
                <FilterChip key={status} label={status} />
            ))}
        />
    ),
};
