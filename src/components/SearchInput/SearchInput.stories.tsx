import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { SearchInput } from './SearchInput';

// The shared search bar (antd input + a submit/clear affordance) used across the
// admin — conversation lists, the tenant/agency filter, the statistic dashboard.
// It is controlled when a `value` prop is passed and self-managing otherwise;
// `handleOnSearch` fires debounced-on-change (and on Enter), `onValueChange`
// fires on every keystroke.
const meta = {
    title: 'Molecules/SearchInput',
    component: SearchInput,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Reusable search bar: a rounded input with a trailing button that submits while empty and clears once text is entered. Controlled via `value` + `onValueChange`, or uncontrolled (internal state). Debounces `handleOnSearch` by ~1s and only fires it past `minSearchLength` (default 3).',
            },
        },
    },
    args: {
        ariaLabel: 'Suche',
        handleOnSearch: fn(),
        handleOnSearchClear: fn(),
        onValueChange: fn(),
    },
    decorators: [
        (Story) => (
            <div style={{ maxWidth: 360 }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty state: the trailing button is the search (magnifier) action. */
export const Empty: Story = {
    args: { value: '' },
};

/** Filled state: the trailing button switches to a clear (X) action. */
export const Filled: Story = {
    args: { value: 'Musterstadt' },
};

/** A caller-supplied placeholder overrides the default `search-placeholder` copy. */
export const CustomPlaceholder: Story = {
    args: { value: '', placeholder: 'Kennzahl suchen …' },
};

// Uncontrolled: the field manages its own value, so typing here works end-to-end.
const UncontrolledSearch = () => {
    const [lastSearch, setLastSearch] = useState('');
    return (
        <div>
            <SearchInput
                ariaLabel="Suche"
                minSearchLength={1}
                handleOnSearch={setLastSearch}
                handleOnSearchClear={() => setLastSearch('')}
            />
            <p style={{ marginTop: 12, color: '#666' }}>Letzte Suche: {lastSearch || '—'}</p>
        </div>
    );
};

/**
 * Interaction: typing reveals the clear button and (past `minSearchLength`)
 * runs the debounced search; clicking the button empties the field.
 */
export const TypeAndClear: Story = {
    render: () => <UncontrolledSearch />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox', { name: 'Suche' });

        await userEvent.type(input, 'Musterstadt');
        await expect(input).toHaveValue('Musterstadt');

        // Past the (1s) debounce the search runs with the typed query.
        await waitFor(() => expect(canvas.getByText('Letzte Suche: Musterstadt')).toBeInTheDocument(), {
            timeout: 2000,
        });

        // The trailing button now clears the field (the input has a single button).
        await userEvent.click(canvas.getByRole('button'));
        await expect(input).toHaveValue('');
    },
};
