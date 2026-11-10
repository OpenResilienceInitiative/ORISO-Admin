import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { popupsOf } from '../../test/storyPopups';
import EditableTable from './EditableTable';
import StatusIcons from './StatusIcons';

const data = [
    { key: '1', name: 'Anna Muster', email: 'anna@example.org' },
    { key: '2', name: 'Ben Beispiel', email: 'ben@example.org' },
];

const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'E-Mail', dataIndex: 'email', key: 'email' },
];

const meta = {
    title: 'Organisms/EditableTable',
    component: EditableTable,
    parameters: { layout: 'padded' },
    args: {
        source: data,
        columns,
        isLoading: false,
        page: 1,
        allowedNumberOfUsers: 9999,
        handleBtnAdd: () => {},
        handlePagination: () => {},
        isDeleteModalVisible: false,
        handleOnDelete: () => {},
        handleDeleteModalCancel: () => {},
        handleDeleteModalTitle: 'Eintrag löschen',
        handleDeleteModalText: 'Möchten Sie diesen Eintrag wirklich löschen?',
    },
} satisfies Meta<typeof EditableTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSearch: Story = {
    args: {
        hasSearch: true,
        handleOnSearch: () => {},
        handleOnSearchClear: () => {},
    },
};

/** The inline delete-confirmation modal, always mounted, toggled via isDeleteModalVisible. */
export const DeleteConfirmation: Story = {
    args: {
        isDeleteModalVisible: true,
    },
};

export const Loading: Story = {
    args: {
        isLoading: true,
    },
};

/**
 * O4: a row's status is a small icon; hovering or focusing it opens a tooltip with the explanation. A tooltip is
 * on-demand help for one icon, not an event: it opens next to the icon and never raises a pop-up.
 */
export const StatusTooltipOnRow: Story = {
    args: {
        source: [
            { key: '1', name: 'Anna Muster', email: 'anna@example.org', status: 'ACTIVE' },
            { key: '2', name: 'Ben Beispiel', email: 'ben@example.org', status: 'ERROR' },
        ],
        columns: [
            ...columns,
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (status: 'ACTIVE' | 'ERROR') => <StatusIcons status={status} />,
            },
        ],
    },
    play: async ({ canvasElement }) => {
        const row = within(canvasElement).getByText('Ben Beispiel').closest('tr') as HTMLElement;
        const icon = row.querySelector('.statusIconWrapper .anticon') as HTMLElement;
        await userEvent.hover(icon);
        const tooltip = await within(canvasElement.ownerDocument.body).findByRole('tooltip');
        await expect(tooltip).toHaveTextContent('Es ist ein Fehler aufgetreten.');
        await expect(popupsOf(canvasElement)).toHaveLength(0);
    },
};
