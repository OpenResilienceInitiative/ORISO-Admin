import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
    Button,
    Card,
    ConfigProvider,
    Input,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Tabs,
    theme as antdTheme,
    type ThemeConfig,
} from 'antd';
import deDE from 'antd/es/locale/de_DE';
import enGB from 'antd/es/locale/en_GB';
import { useTranslation } from 'react-i18next';

import { buildAdminAntdTheme } from './antdM3Theme';
import { AppliedTokenInspection } from './AppliedTokenInspector';
import type { InspectionContext } from './appliedTokenInspection';
import { inspectionStoryContext, prepareInspectionStory } from './inspectionStoryContext';

// Deliberately retain the historical comparison, not a second live theme engine.
const LEGACY_BLUE_THEME: ThemeConfig = { token: { colorPrimary: '#273270', colorLink: '#273270', borderRadius: 4 } };
type SamplerRecord = { key: string; name: string; status: string };
const Sampler = () => {
    const { t } = useTranslation();
    return (
        <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 280 }}>
            <Space>
                <Button type="primary">{t('save')}</Button>
                <Button>{t('cancel')}</Button>
            </Space>
            <Select
                aria-label={t('tokenInspection.topic')}
                defaultValue="illness"
                options={[
                    { value: 'illness', label: t('tokenInspection.illness') },
                    { value: 'advice', label: t('tokenInspection.advice') },
                    { value: 'legal', label: t('tokenInspection.legal') },
                ]}
                style={{ width: '100%' }}
            />
            <Input aria-label={t('search')} placeholder={t('search')} />
            <Space>
                <Switch aria-label={t('tokenInspection.enabled')} defaultChecked />
                <Tag color="error">{t('tokenInspection.legal')}</Tag>
                <Tag>{t('tokenInspection.holiday')}</Tag>
            </Space>
            <Tabs
                items={[
                    { key: 'a', label: t('tokenInspection.appearance') },
                    { key: 'b', label: t('tokenInspection.legalTab') },
                    { key: 'c', label: t('tokenInspection.permissions') },
                ]}
            />
            <Card size="small" title={t('tokenInspection.takeover')}>
                <Table<SamplerRecord>
                    columns={[
                        { title: t('tokenInspection.agency'), dataIndex: 'name', key: 'name' },
                        {
                            title: 'Status',
                            dataIndex: 'status',
                            key: 'status',
                            render: (value: string) => <Tag color="processing">{value}</Tag>,
                        },
                    ]}
                    dataSource={[
                        { key: '1', name: 'Nearby 1:1', status: t('tokenInspection.active') },
                        { key: '2', name: 'Live 1.1', status: t('tokenInspection.draft') },
                    ]}
                    pagination={false}
                    size="small"
                />
            </Card>
        </Space>
    );
};
const Column = ({ title, theme, current = false }: { title: string; theme: ThemeConfig; current?: boolean }) => (
    <div style={{ flex: '1 1 280px', minWidth: 0 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--m3-on-surface)' }}>{title}</h3>
        <ConfigProvider theme={theme}>
            <div
                data-token-inspection-bridge={current ? '' : undefined}
                style={{ padding: 16, background: current ? 'var(--m3-surface)' : '#fcf9f9', borderRadius: 16 }}
            >
                <Sampler />
            </div>
        </ConfigProvider>
    </div>
);
const Bridge = ({ context }: { context: InspectionContext }) => {
    const { t } = useTranslation();
    const [root, setRoot] = React.useState<HTMLDivElement | null>(null);
    const config = React.useMemo(
        () => buildAdminAntdTheme({ seeds: { accentDark: context.primaryColor }, scheme: context.scheme }),
        [context.primaryColor, context.scheme],
    );
    const canonical = antdTheme.getDesignToken(config);
    return (
        <ConfigProvider locale={context.locale === 'de' ? deDE : enGB} theme={config}>
            <div style={{ padding: canonical.paddingLG, background: 'var(--admin-workspace-background)', minWidth: 0 }}>
                <div
                    ref={setRoot}
                    style={{ display: 'flex', flexWrap: 'wrap', gap: canonical.sizeXXL, alignItems: 'flex-start' }}
                >
                    <Column title={`${t('tokenInspection.before')} (#273270)`} theme={LEGACY_BLUE_THEME} />
                    <Column title={`${t('tokenInspection.after')} (${context.primaryColor})`} theme={config} current />
                </div>
                <AppliedTokenInspection root={root} context={context} reference="bridge" />
            </div>
        </ConfigProvider>
    );
};
const meta: Meta = { title: 'Foundations/Admin Theme Bridge', parameters: { layout: 'fullscreen' } };
export default meta;
export const BeforeAfter: StoryObj = {
    beforeEach: ({ args }) => prepareInspectionStory(inspectionStoryContext(args)),
    render: (args) => <Bridge context={inspectionStoryContext(args)} />,
};
