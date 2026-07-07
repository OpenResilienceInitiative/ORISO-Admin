import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, ConfigProvider, Input, Select, Space, Switch, Table, Tag, Tabs, type ThemeConfig } from 'antd';

import { buildAdminAntdTheme } from './antdM3Theme';

/**
 * Side-by-side proof that the M3 token bridge recolours every antd component
 * from the source palette, without touching any component. Left column uses the
 * legacy hard-coded blue theme; right column uses {@link buildAdminAntdTheme}.
 */
const LEGACY_BLUE_THEME: ThemeConfig = {
    token: { colorPrimary: '#273270', colorLink: '#273270', borderRadius: 4 },
};

const selectOptions = [
    { value: 'illness', label: 'Illness' },
    { value: 'advice', label: 'Advice needed' },
    { value: 'legal', label: 'Legal violation' },
];

const tableColumns = [
    { title: 'Agency', dataIndex: 'name', key: 'name' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color="processing">{v}</Tag> },
];

const tableData = [
    { key: '1', name: 'Nearby 1:1', status: 'active' },
    { key: '2', name: 'Live 1.1', status: 'draft' },
];

const Sampler = () => (
    <Space direction="vertical" size="middle" style={{ width: 280 }}>
        <Space>
            <Button type="primary">Speichern</Button>
            <Button>Abbrechen</Button>
        </Space>
        <Select defaultValue="illness" options={selectOptions} style={{ width: '100%' }} />
        <Input placeholder="Suche…" />
        <Space>
            <Switch defaultChecked />
            <Tag color="error">Legal violation</Tag>
            <Tag>Holiday</Tag>
        </Space>
        <Tabs
            items={[
                { key: 'a', label: 'Erscheinungsbild' },
                { key: 'b', label: 'Rechtliches' },
                { key: 'c', label: 'Berechtigungen' },
            ]}
        />
        <Card size="small" title="Case takeover">
            <Table columns={tableColumns} dataSource={tableData} pagination={false} size="small" />
        </Card>
    </Space>
);

const Column = ({ title, theme }: { title: string; theme: ThemeConfig }) => (
    <div style={{ flex: '0 0 auto' }}>
        <h3 style={{ font: "500 14px/20px 'Inter', sans-serif", marginBottom: 12 }}>{title}</h3>
        <ConfigProvider theme={theme}>
            <div style={{ padding: 16, background: '#fcf9f9', borderRadius: 16 }}>
                <Sampler />
            </div>
        </ConfigProvider>
    </div>
);

const meta: Meta = {
    title: 'Foundations/Admin Theme Bridge',
    parameters: { layout: 'fullscreen' },
};

export default meta;

export const BeforeAfter: StoryObj = {
    render: () => (
        <div style={{ display: 'flex', gap: 48, padding: 32, alignItems: 'flex-start' }}>
            <Column title="Vorher — hard-coded blue (#273270)" theme={LEGACY_BLUE_THEME} />
            <Column title="Nachher — M3 bridge (#A5000A)" theme={buildAdminAntdTheme()} />
        </div>
    ),
};
