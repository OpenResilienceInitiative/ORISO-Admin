import type { Meta, StoryObj } from '@storybook/react-vite';
import EditableTable from './EditableTable';

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
