import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor } from 'storybook/test';
import { LogFilterBar } from '.';

/** Holds a search and one select, like the deletion and inactive-account logs do. */
const Stateful = ({ initialRole = '' }: { initialRole?: string }) => {
    const [search, setSearch] = useState('');
    const [role, setRole] = useState(initialRole);
    return (
        <LogFilterBar
            search={{ label: 'Nach ID suchen', value: search, onChange: setSearch, onSearch: setSearch }}
            activeCount={(role ? 1 : 0) + (search ? 1 : 0)}
            onReset={() => {
                setSearch('');
                setRole('');
            }}
        >
            <select aria-label="Rolle" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">Alle</option>
                <option value="ASKER">Ratsuchende</option>
                <option value="CONSULTANT">Beratende</option>
            </select>
        </LogFilterBar>
    );
};

/** The one filter bar of every log page (Admin#1510): ID search, a "Filter" button, one reset. */
const meta = {
    title: 'Organisms/Pages/Logs/LogFilterBar',
    component: Stateful,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Stateful>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing set: search and button, no reset. */
export const NothingSet: Story = {
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.queryByRole('button', { name: 'Filter zurücksetzen' })).toBeNull();
        await userEvent.click(canvas.getByRole('button', { name: /^Filter/ }));
        await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Rolle' }), 'CONSULTANT');
        await expect(canvas.getByRole('button', { name: /^Filter(?! zurück)/ })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        await expect(canvas.getByRole('button', { name: 'Filter zurücksetzen' })).toBeVisible();
    },
};

/** A role is set: the reset appears and clears it. */
export const WithActiveFilter: Story = {
    args: { initialRole: 'ASKER' },
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Filter zurücksetzen' }));
        await waitFor(() => expect(canvas.queryByRole('button', { name: 'Filter zurücksetzen' })).toBeNull());
    },
};
