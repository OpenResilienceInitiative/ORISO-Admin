import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn } from 'storybook/test';
import { ScopeContextBar } from './ScopeContextBar';

/** The active Träger/BST filter above the table, with one button to drop it. */
const meta = {
    title: 'Molecules/UserTable/ScopeContextBar',
    component: ScopeContextBar,
    parameters: { layout: 'padded' },
    args: {
        kind: 'tenant',
        id: 12,
        name: 'Caritasverband für das Erzbistum Berlin e. V.',
        address: 'Tübinger Straße 5, 10115 Berlin',
        count: '14 Beratende',
        onClear: fn(),
    },
} satisfies Meta<typeof ScopeContextBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tenant: Story = {
    play: async ({ args, canvas, userEvent }) => {
        const bar = canvas.getByRole('region');
        await expect(bar).toHaveTextContent('Caritasverband für das Erzbistum Berlin e. V.');
        await expect(bar).toHaveTextContent('12');
        await expect(bar).toHaveTextContent('14 Beratende');
        await userEvent.click(canvas.getByRole('button', { name: /Alle Träger zeigen|Show all providers/ }));
        await expect(args.onClear).toHaveBeenCalledOnce();
    },
};

export const Agency: Story = {
    args: { kind: 'agency', id: 3407, name: 'Suchtberatung Mitte', address: undefined, count: '3 Beratende' },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: /Alle Beratungsstellen zeigen|Show all agencies/ }));
        await expect(args.onClear).toHaveBeenCalledOnce();
    },
};
