import { useMemo, useState } from 'react';
import { BankOutlined, FilterOutlined, MailOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListingTable } from '../ListingTable';
import { FilterMultiselect } from './FilterMultiselect';
import { FilterSelect, type FilterOption } from './FilterSelect';
import { TableFilterBar } from './TableFilterBar';
import styles from './styles.module.scss';

// The link-listing page filter (Figma nodes 1165-18110 "no items selected" and
// 1165-17028 "items selected"): the TableFilterBar composed for the invites/links
// table, over a listing of invite links.
const meta = {
    title: 'Organisms/TableFilterBar/LinkPage',
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'The `TableFilterBar` composed for the link-listing page (invites/links), with the tenant, e-mail-template and status filters plus the expanding recipient search, over a `ListingTable`.',
            },
        },
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const TENANTS: FilterOption[] = [
    { label: 'Musterstadt', value: 'musterstadt' },
    { label: 'Beispielhausen', value: 'beispielhausen' },
    { label: 'Demo-Mandant', value: 'demo' },
];

const TEMPLATES: FilterOption[] = [
    { label: 'Greeting text Eng', value: 'greeting-eng' },
    { label: 'Carrier invite (Nord)', value: 'carrier-nord' },
    { label: 'Test invitation template', value: 'test' },
];

const STATUSES: FilterOption[] = [
    { label: 'Eingeladen', value: 'invited' },
    { label: 'Zugestellt', value: 'delivered' },
    { label: 'Geöffnet', value: 'opened' },
    { label: 'Fehlgeschlagen', value: 'failed' },
];

interface LinkRow {
    key: string;
    email: string;
    tenant: string;
    template: string;
    status: string;
}

const ROWS: LinkRow[] = [
    { key: '1', email: 'anna@example.org', tenant: 'musterstadt', template: 'greeting-eng', status: 'invited' },
    { key: '2', email: 'ben@example.org', tenant: 'beispielhausen', template: 'carrier-nord', status: 'opened' },
    { key: '3', email: 'clara@example.org', tenant: 'demo', template: 'test', status: 'delivered' },
    { key: '4', email: 'dana@example.org', tenant: 'beispielhausen', template: 'greeting-eng', status: 'failed' },
    { key: '5', email: 'erik@example.org', tenant: 'musterstadt', template: 'greeting-eng', status: 'invited' },
];

const STATUS_TAG_COLOR: Record<string, string> = {
    invited: 'default',
    delivered: 'green',
    opened: 'blue',
    failed: 'red',
};

const labelOf = (options: FilterOption[], value: string) =>
    options.find((option) => option.value === value)?.label ?? value;

interface LinkPageState {
    query: string;
    tenant: string | null;
    template: string | null;
    status: string[];
}

const LinkPage = ({ initial, searchExpanded }: { initial?: Partial<LinkPageState>; searchExpanded?: boolean }) => {
    const [state, setState] = useState<LinkPageState>({
        query: '',
        tenant: null,
        template: null,
        status: [],
        ...initial,
    });

    const rows = useMemo(
        () =>
            ROWS.filter(
                (row) =>
                    (!state.query || row.email.toLowerCase().includes(state.query.toLowerCase())) &&
                    (!state.tenant || row.tenant === state.tenant) &&
                    (!state.template || row.template === state.template) &&
                    (state.status.length === 0 || state.status.includes(row.status)),
            ),
        [state],
    );

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Einladungslinks</h2>
                <Button type="primary" icon={<PlusOutlined />}>
                    Neuer Link
                </Button>
            </div>
            <TableFilterBar
                ariaLabel="Einladungslinks filtern"
                defaultSearchExpanded={searchExpanded}
                searchPlaceholder="Empfänger suchen …"
                searchAriaLabel="Empfänger suchen"
                searchValue={state.query}
                onSearchChange={(query) => setState((prev) => ({ ...prev, query }))}
            >
                <FilterSelect
                    label="Mandant"
                    icon={<BankOutlined />}
                    options={TENANTS}
                    value={state.tenant}
                    onChange={(tenant) => setState((prev) => ({ ...prev, tenant }))}
                />
                <FilterSelect
                    label="E-Mail-Vorlage"
                    icon={<MailOutlined />}
                    options={TEMPLATES}
                    value={state.template}
                    onChange={(template) => setState((prev) => ({ ...prev, template }))}
                />
                <FilterMultiselect
                    label="Status"
                    icon={<FilterOutlined />}
                    options={STATUSES}
                    value={state.status}
                    onChange={(status) => setState((prev) => ({ ...prev, status }))}
                />
            </TableFilterBar>
            <ListingTable
                columns={[
                    { title: 'Empfänger', dataIndex: 'email', key: 'email' },
                    {
                        title: 'Mandant',
                        dataIndex: 'tenant',
                        key: 'tenant',
                        render: (value: string) => labelOf(TENANTS, value),
                    },
                    {
                        title: 'E-Mail-Vorlage',
                        dataIndex: 'template',
                        key: 'template',
                        render: (value: string) => labelOf(TEMPLATES, value),
                    },
                    {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (value: string) => (
                            <Tag color={STATUS_TAG_COLOR[value]}>{labelOf(STATUSES, value)}</Tag>
                        ),
                    },
                ]}
                dataSource={rows}
                pagination={false}
                scroll={{ y: 'auto' }}
            />
        </div>
    );
};

/** No items selected: every filter shows its placeholder, search collapsed, full list. */
export const NoSelection: Story = {
    render: () => <LinkPage />,
};

/** Items selected: tenant + statuses applied and the recipient search in use. */
export const ItemsSelected: Story = {
    render: () => (
        <LinkPage searchExpanded initial={{ tenant: 'beispielhausen', status: ['invited', 'opened'], query: '' }} />
    ),
};
