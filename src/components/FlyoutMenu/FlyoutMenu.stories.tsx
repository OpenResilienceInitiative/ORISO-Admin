import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { FlyoutMenu } from './FlyoutMenu';

// Ported from ORISO-Frontend (#310) so both layers share the menu look & behaviour:
// ellipsis trigger, positioned flyout, 0.25s fade, outside-click close, item hover.
const meta = {
    title: 'Molecules/FlyoutMenu',
    component: FlyoutMenu,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'The shared menu component (ported from the ORISO-Frontend Storybook): a trigger button toggling a positioned flyout panel that renders its children as menu items, with the design-system Elevation-3 shadow and hover states.',
            },
        },
    },
} satisfies Meta<typeof FlyoutMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = (
    <>
        <button type="button">Bearbeiten</button>
        <button type="button">Archivieren</button>
        <button type="button">Löschen</button>
    </>
);

export const Closed: Story = {
    args: { isOpen: false, position: 'right' },
    render: (args) => <FlyoutMenu {...args}>{items}</FlyoutMenu>,
};

export const Open: Story = {
    args: { isOpen: true, position: 'right' },
    render: (args) => <FlyoutMenu {...args}>{items}</FlyoutMenu>,
};

/** Clicking the trigger opens the flyout; clicking outside closes it again. */
export const ToggleInteraction: Story = {
    args: { position: 'right' },
    render: (args) => <FlyoutMenu {...args}>{items}</FlyoutMenu>,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole('button', { name: 'Menü' });

        await userEvent.click(trigger);
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect(canvas.getByRole('button', { name: 'Löschen' })).toBeVisible();

        await userEvent.click(document.body);
        await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    },
};
