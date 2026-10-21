import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider, Input, InputNumber, Select, theme as antdTheme } from 'antd';
import deDE from 'antd/es/locale/de_DE';
import enGB from 'antd/es/locale/en_GB';
import { useTranslation } from 'react-i18next';

import { buildAdminAntdTheme } from '../theme/antdM3Theme';
import { AppliedTokenInspection } from '../theme/AppliedTokenInspector';
import type { InspectionContext } from '../theme/appliedTokenInspection';
import { inspectionStoryContext, prepareInspectionStory } from '../theme/inspectionStoryContext';

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => {
    const { token } = antdTheme.useToken();
    return (
        <div style={{ width: 220, maxWidth: '100%' }}>
            <div style={{ fontSize: token.fontSizeSM, color: 'var(--m3-on-surface)', marginBottom: token.marginXXS }}>
                {label}
            </div>
            {children}
        </div>
    );
};
const Row = ({ title, children }: { title: string; children: React.ReactNode }) => {
    const { token } = antdTheme.useToken();
    return (
        <div>
            <h3 style={{ fontSize: token.fontSize, margin: `0 0 ${token.marginXS}px`, color: 'var(--m3-on-surface)' }}>
                {title}
            </h3>
            <div style={{ display: 'flex', gap: token.marginLG, flexWrap: 'wrap' }}>{children}</div>
        </div>
    );
};
const Workspace = ({
    context,
    children,
    inspect = false,
}: {
    context: InspectionContext;
    children: React.ReactNode;
    inspect?: boolean;
}) => {
    const [root, setRoot] = React.useState<HTMLDivElement | null>(null);
    const config = React.useMemo(
        () => buildAdminAntdTheme({ seeds: { accentDark: context.primaryColor }, scheme: context.scheme }),
        [context.primaryColor, context.scheme],
    );
    const canonical = antdTheme.getDesignToken(config);
    return (
        <ConfigProvider theme={config} locale={context.locale === 'de' ? deDE : enGB}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: canonical.sizeXXL,
                    padding: canonical.paddingLG,
                    minHeight: '100vh',
                    minWidth: 0,
                    background: 'var(--admin-workspace-background)',
                }}
            >
                <div
                    ref={setRoot}
                    data-token-inspection-workspace
                    style={{ display: 'flex', flexDirection: 'column', gap: canonical.sizeXXL, minWidth: 0 }}
                >
                    {children}
                </div>
                {inspect && <AppliedTokenInspection root={root} context={context} reference="field" />}
            </div>
        </ConfigProvider>
    );
};
const Fields = ({ context, tonal = false }: { context: InspectionContext; tonal?: boolean }) => {
    const { t } = useTranslation();
    const options = [
        { value: 'illness', label: t('tokenInspection.illness') },
        { value: 'advice', label: t('tokenInspection.advice') },
        { value: 'legal', label: t('tokenInspection.legal') },
    ];
    if (tonal)
        return (
            <Workspace context={context}>
                <Row title={t('tokenInspection.tonal')}>
                    <div style={{ width: 260, maxWidth: '100%' }}>
                        <Select
                            aria-label={t('tokenInspection.topic')}
                            open
                            defaultValue="advice"
                            options={options}
                            style={{ width: '100%' }}
                            getPopupContainer={(node) => node.parentElement ?? document.body}
                        />
                    </div>
                </Row>
                <div style={{ height: 160 }} />
            </Workspace>
        );
    return (
        <Workspace context={context} inspect>
            <Row title="Input">
                <Cell label={t('tokenInspection.default')}>
                    <Input data-token-inspection-input aria-label={t('search')} placeholder={t('search')} />
                </Cell>
                <Cell label={t('tokenInspection.filled')}>
                    <Input aria-label={t('tokenInspection.filled')} defaultValue={t('tokenInspection.exampleAgency')} />
                </Cell>
                <Cell label={t('tokenInspection.focus')}>
                    <Input aria-label={t('tokenInspection.focus')} autoFocus placeholder={t('tokenInspection.focus')} />
                </Cell>
                <Cell label={t('tokenInspection.disabled')}>
                    <Input
                        aria-label={t('tokenInspection.disabled')}
                        disabled
                        defaultValue={t('tokenInspection.readonly')}
                    />
                </Cell>
            </Row>
            <Row title="Select">
                <Cell label={t('tokenInspection.default')}>
                    <Select
                        aria-label={t('tokenInspection.topic')}
                        placeholder={t('tokenInspection.topic')}
                        options={options}
                        style={{ width: '100%' }}
                    />
                </Cell>
                <Cell label={t('tokenInspection.filled')}>
                    <Select
                        aria-label={t('tokenInspection.selectedTopic')}
                        defaultValue="illness"
                        options={options}
                        style={{ width: '100%' }}
                    />
                </Cell>
                <Cell label={t('tokenInspection.disabled')}>
                    <Select
                        aria-label={t('tokenInspection.disabledTopic')}
                        aria-disabled
                        disabled
                        defaultValue="advice"
                        options={options}
                        style={{ width: '100%' }}
                    />
                </Cell>
            </Row>
            <Row title="InputNumber">
                <Cell label={t('tokenInspection.default')}>
                    <InputNumber aria-label={t('tokenInspection.number')} placeholder="0" style={{ width: '100%' }} />
                </Cell>
                <Cell label={t('tokenInspection.filled')}>
                    <InputNumber
                        aria-label={t('tokenInspection.filledNumber')}
                        defaultValue={25}
                        style={{ width: '100%' }}
                    />
                </Cell>
                <Cell label={t('tokenInspection.disabled')}>
                    <InputNumber
                        aria-label={t('tokenInspection.disabledNumber')}
                        disabled
                        defaultValue={5}
                        style={{ width: '100%' }}
                    />
                </Cell>
            </Row>
        </Workspace>
    );
};
const meta: Meta = { title: 'Foundations/Field Tokens', parameters: { layout: 'fullscreen' } };
export default meta;

/** Existing field specimens, now alongside independent expected/applied evidence. */
export const FieldAnatomy: StoryObj = {
    beforeEach: ({ args }) => prepareInspectionStory(inspectionStoryContext(args)),
    render: (args) => <Fields context={inspectionStoryContext(args)} />,
};
/** Open dropdown with its original selected tonal state. */
export const TonalSelection: StoryObj = {
    beforeEach: ({ args }) => prepareInspectionStory(inspectionStoryContext(args)),
    render: (args) => <Fields context={inspectionStoryContext(args)} tonal />,
};
