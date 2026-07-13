import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListingTable } from './ListingTable';

interface Row {
    key: string;
    name: string;
    email: string;
    status: string;
}

const data: Row[] = [
    { key: '1', name: 'Anna Muster', email: 'anna@example.org', status: 'Aktiv' },
    { key: '2', name: 'Ben Beispiel', email: 'ben@example.org', status: 'Gesperrt' },
    { key: '3', name: 'Clara Demo', email: 'clara@example.org', status: 'Aktiv' },
];

const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'E-Mail', dataIndex: 'email', key: 'email' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
];

const meta = {
    title: 'Organisms/ListingTable',
    component: ListingTable,
    parameters: { layout: 'padded' },
    args: {
        columns,
        dataSource: data,
        pagination: false,
        scroll: { y: 'auto' },
    },
} satisfies Meta<typeof ListingTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filled: Story = {};

export const Empty: Story = {
    args: {
        dataSource: [],
    },
};

export const Loading: Story = {
    args: {
        loading: true,
    },
};
