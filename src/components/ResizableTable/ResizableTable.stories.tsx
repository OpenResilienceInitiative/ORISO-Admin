import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResizeTable } from './index';

interface Row {
    key: string;
    name: string;
    email: string;
}

const data: Row[] = [
    { key: '1', name: 'Anna Muster', email: 'anna@example.org' },
    { key: '2', name: 'Ben Beispiel', email: 'ben@example.org' },
];

const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'E-Mail', dataIndex: 'email', key: 'email', width: 260 },
];

const meta = {
    title: 'Organisms/ResizableTable',
    component: ResizeTable,
    parameters: { layout: 'padded' },
    args: {
        columns,
        dataSource: data,
        pagination: false,
        scroll: { y: 'auto' },
    },
} satisfies Meta<typeof ResizeTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drag a column's right edge to resize it — the column-resize behavior that sets this table apart from ListingTable. */
export const Default: Story = {};
