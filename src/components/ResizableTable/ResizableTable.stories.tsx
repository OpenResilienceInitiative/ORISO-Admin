import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Tag } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnProps } from 'antd/lib/table';
import StatusIcons from '../EditableTable/StatusIcons';
import type { Status } from '../../types/status';
import { ResizeTable } from './index';

/**
 * `ResizeTable` (`ResizableTable`) is the primary admin **listing** table: an antd `Table`
 * wrapper that adds draggable column-resizing (`ResizableTitle` header cell), a normalized
 * loading spinner (300ms delay) and the shared sticky-scroll defaults. It backs the
 * Agencies, Tenants, Topics and User-management listings.
 *
 * The stories below mirror a real admin listing (columns from the Agency list: id, name,
 * city, status, online, row actions) so the Storybook example matches production usage.
 * Drag a column header's right edge to resize it.
 */

interface AgencyRow {
    id: number;
    name: string;
    city: string;
    offline: boolean;
    status: Status;
}

const rows: AgencyRow[] = [
    { id: 101, name: 'Beratungsstelle Nord', city: 'Hamburg', offline: false, status: 'ACTIVE' },
    { id: 102, name: 'Jugendberatung Mitte', city: 'Berlin', offline: true, status: 'INACTIVE' },
    { id: 103, name: 'Familienhilfe West', city: 'Köln', offline: false, status: 'CREATED' },
    { id: 104, name: 'Suchtberatung Süd', city: 'München', offline: false, status: 'IN_DELETION' },
    { id: 105, name: 'Schuldnerberatung Ost', city: 'Dresden', offline: true, status: 'IN_PROGRESS' },
];

const columns: Array<ColumnProps<AgencyRow>> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: true, ellipsis: true },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 220, sorter: true, ellipsis: true },
    { title: 'Stadt', dataIndex: 'city', key: 'city', width: 140, ellipsis: true },
    {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 90,
        render: (status: Status) => <StatusIcons status={status} />,
    },
    {
        title: 'Online',
        dataIndex: 'offline',
        key: 'offline',
        width: 120,
        render: (offline: boolean) =>
            offline ? <Tag color="default">Offline</Tag> : <Tag color="success">Online</Tag>,
    },
    {
        title: '',
        key: 'edit',
        width: 120,
        fixed: 'right',
        render: () => (
            <div className="tableActionWrapper" style={{ display: 'flex', gap: 8 }}>
                <Button type="text" icon={<EditOutlined />} aria-label="Bearbeiten" />
                <Button type="text" danger icon={<DeleteOutlined />} aria-label="Löschen" />
            </div>
        ),
    },
];

const meta = {
    title: 'Organisms/ResizableTable',
    component: ResizeTable,
    parameters: { layout: 'padded' },
    args: {
        rowKey: 'id',
        columns,
        dataSource: rows,
        scroll: { y: 'auto' },
        pagination: {
            total: 42,
            current: 1,
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30'],
        },
    },
} satisfies Meta<typeof ResizeTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A realistic agency listing: sortable columns, status icons, an online tag and row actions. */
export const AgencyListing: Story = {};

/** Loading state — the wrapper normalizes `loading` to a spinner with a 300ms delay. */
export const Loading: Story = {
    args: { loading: true },
};

/** Empty state with a localized empty message (as the listings pass via `locale.emptyText`). */
export const Empty: Story = {
    args: {
        dataSource: [],
        locale: { emptyText: 'Keine Einträge gefunden' },
        pagination: false,
    },
};

/** Minimal two-column table to focus on the drag-to-resize header behavior. */
export const MinimalResizable: Story = {
    args: {
        columns: [
            { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
            { title: 'Stadt', dataIndex: 'city', key: 'city', width: 260 },
        ],
        pagination: false,
    },
};
