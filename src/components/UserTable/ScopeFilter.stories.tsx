import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn, waitFor, within } from 'storybook/test';
import { ScopeFilter, type ScopeFilterProps } from './ScopeFilter';

const CENTRES = [
    { id: '101', name: 'Beratungsstelle Nord', detail: '20095 Hamburg' },
    { id: '102', name: 'Jugendberatung Mitte', detail: '10115 Berlin' },
    { id: '103', name: 'Suchtberatung Süd', detail: '80331 München' },
];

const Controlled = (props: ScopeFilterProps) => {
    const [value, setValue] = useState(props.value);
    return (
        <div style={{ width: 320 }}>
            <ScopeFilter
                {...props}
                value={value}
                onChange={(next) => {
                    setValue(next);
                    props.onChange(next);
                }}
            />
        </div>
    );
};

/** Searchable Träger or BST picker for the users toolbar; the centre picker takes several. */
const meta = {
    title: 'Molecules/UserTable/ScopeFilter',
    component: ScopeFilter,
    parameters: { layout: 'padded' },
    render: (args) => <Controlled {...args} />,
    args: { kind: 'agency', multiple: true, options: CENTRES, value: [], onChange: fn() },
} satisfies Meta<typeof ScopeFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Centres: Story = {
    play: async ({ args, canvasElement, userEvent }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const input = canvas.getByRole('combobox', { name: 'Beratungsstelle' });
        await userEvent.type(input, 'sucht');
        const options = await body.findAllByRole('option');
        await expect(options).toHaveLength(1);
        await userEvent.click(options[0]);
        await expect(args.onChange).toHaveBeenLastCalledWith(['103']);

        await userEvent.type(input, 'nord');
        await userEvent.click(await body.findByRole('option', { name: /Beratungsstelle Nord/ }));
        await expect(args.onChange).toHaveBeenLastCalledWith(['103', '101']);
    },
};

export const Tenant: Story = {
    args: {
        kind: 'tenant',
        multiple: false,
        options: [
            { id: '3', name: 'Caritas Hamburg' },
            { id: '7', name: 'Diakonie Berlin' },
        ],
    },
    play: async ({ args, canvasElement, userEvent }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole('combobox', { name: 'Träger' }));
        await userEvent.click(await body.findByRole('option', { name: /Diakonie Berlin/ }));
        await expect(args.onChange).toHaveBeenLastCalledWith(['7']);
        await waitFor(() => expect(canvas.getByRole('combobox', { name: 'Träger' })).toHaveValue('Diakonie Berlin'));
    },
};

/** One centre only: nothing to choose, so the picker stays visible but disabled. */
export const NothingToChoose: Story = {
    args: { options: CENTRES.slice(0, 1), disabled: true },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('combobox', { name: 'Beratungsstelle' })).toBeDisabled();
    },
};
