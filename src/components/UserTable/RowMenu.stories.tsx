import type { Meta, StoryObj } from '@storybook/react-vite';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn, waitFor, within } from 'storybook/test';
import { RowMenu } from './RowMenu';

const onEdit = fn();
const onCopy = fn();
const onDelete = fn();

/** ⋯ menu for a table row on tablet widths, where the icon buttons do not fit. */
const meta = {
    title: 'Molecules/UserTable/RowMenu',
    component: RowMenu,
    parameters: { layout: 'centered' },
    args: {
        ariaLabel: 'Weitere Aktionen für Maria Huber',
        items: [
            { key: 'edit', label: 'Bearbeiten', icon: <EditOutlinedIcon />, onSelect: onEdit },
            { key: 'copy', label: 'E-Mail kopieren', icon: <ContentCopyOutlinedIcon />, onSelect: onCopy },
            { key: 'delete', label: 'Löschen', icon: <DeleteOutlinedIcon />, tone: 'error', onSelect: onDelete },
        ],
    },
} satisfies Meta<typeof RowMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvas, canvasElement, userEvent }) => {
        const body = within(canvasElement.ownerDocument.body);
        const trigger = canvas.getByRole('button', { name: 'Weitere Aktionen für Maria Huber' });
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(trigger);
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect(await body.findAllByRole('menuitem')).toHaveLength(3);

        await userEvent.click(body.getByRole('menuitem', { name: 'Löschen' }));
        await expect(onDelete).toHaveBeenCalledOnce();
        await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
        await expect(trigger).toHaveFocus();
    },
};

/** An action the admin may not run stays in the menu, disabled. */
export const DisabledItem: Story = {
    args: {
        items: [
            { key: 'edit', label: 'Bearbeiten', icon: <EditOutlinedIcon />, onSelect: onEdit },
            {
                key: 'delete',
                label: 'Löschen',
                icon: <DeleteOutlinedIcon />,
                tone: 'error',
                disabled: true,
                onSelect: onDelete,
            },
        ],
    },
    play: async ({ canvas, canvasElement, userEvent }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole('button'));
        await expect(await body.findByRole('menuitem', { name: 'Löschen' })).toHaveAttribute('aria-disabled', 'true');
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
    },
};
