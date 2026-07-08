import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchInput } from './SearchInput';

const meta = {
    title: 'Molecules/SearchInput',
    component: SearchInput,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div style={{ maxWidth: 360 }}>
                <Story />
            </div>
        ),
    ],
    args: {
        ariaLabel: 'Suche',
    },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty state: only the search-submit button is shown. */
export const SearchButton: Story = {
    args: {
        value: '',
    },
};

/** Filled state: the button switches to a clear (X) action. */
export const ClearButton: Story = {
    args: {
        value: 'Musterstadt',
    },
};
