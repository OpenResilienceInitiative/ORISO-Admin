import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider, Input, InputNumber, Select } from 'antd';

import { buildAdminAntdTheme } from '../theme/antdM3Theme';

/**
 * Field anatomy sheet for the `--admin-field-*` token rework (#313): field
 * surfaces sit one step lighter than the workspace background with a subtle
 * outline, focus draws a primary-coloured outline, and selected options are
 * "illuminated" with the light primary-container tonal. Everything below is
 * raw antd inheriting {@link buildAdminAntdTheme} — no component styling.
 */

const FIELD_TOKENS = [
    ['--admin-field-surface', '#fcf9f9', 'field surface (lighter than workspace)'],
    ['--admin-field-outline', '#c4c7c8', 'resting outline (outline-variant tier)'],
    ['--admin-field-surface-hover', '#f6f3f3', 'hover surface'],
    ['--admin-field-selected-surface', '#ffdad5', 'selected/active tonal surface'],
    ['--admin-field-selected-text', '#930008', 'selected/active text'],
] as const;

const selectOptions = [
    { value: 'illness', label: 'Illness' },
    { value: 'advice', label: 'Advice needed' },
    { value: 'legal', label: 'Legal violation' },
];

const cellStyle: React.CSSProperties = { width: 220 };
const labelStyle: React.CSSProperties = {
    font: "500 12px/16px 'Inter', sans-serif",
    color: '#444748',
    marginBottom: 4,
};

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={cellStyle}>
        <div style={labelStyle}>{label}</div>
        {children}
    </div>
);

const Row = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
        <h3 style={{ font: "500 14px/20px 'Inter', sans-serif", margin: '0 0 8px' }}>{title}</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>{children}</div>
    </div>
);

/** Fields rendered on the real workspace background so the "one step lighter" surface is visible. */
const Workspace = ({ children }: { children: React.ReactNode }) => (
    <ConfigProvider theme={buildAdminAntdTheme()}>
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 32,
                padding: 32,
                minHeight: '100vh',
                background: 'var(--admin-workspace-background, #e4e2e2)',
            }}
        >
            {children}
        </div>
    </ConfigProvider>
);

const meta: Meta = {
    title: 'Foundations/Field Tokens',
    parameters: { layout: 'fullscreen' },
};

export default meta;

export const FieldAnatomy: StoryObj = {
    render: () => (
        <Workspace>
            <Row title="Input">
                <Cell label="Default (hover to preview hover surface)">
                    <Input placeholder="Suche…" />
                </Cell>
                <Cell label="Filled">
                    <Input defaultValue="Beratungsstelle Mitte" />
                </Cell>
                <Cell label="Focus (primary outline)">
                    <Input autoFocus placeholder="Fokussiert…" />
                </Cell>
                <Cell label="Disabled">
                    <Input disabled defaultValue="Nicht änderbar" />
                </Cell>
            </Row>
            <Row title="Select">
                <Cell label="Default">
                    <Select placeholder="Thema wählen…" options={selectOptions} style={{ width: '100%' }} />
                </Cell>
                <Cell label="Filled">
                    <Select defaultValue="illness" options={selectOptions} style={{ width: '100%' }} />
                </Cell>
                <Cell label="Disabled">
                    <Select disabled defaultValue="advice" options={selectOptions} style={{ width: '100%' }} />
                </Cell>
            </Row>
            <Row title="InputNumber">
                <Cell label="Default">
                    <InputNumber placeholder="0" style={{ width: '100%' }} />
                </Cell>
                <Cell label="Filled">
                    <InputNumber defaultValue={25} style={{ width: '100%' }} />
                </Cell>
                <Cell label="Disabled">
                    <InputNumber disabled defaultValue={5} style={{ width: '100%' }} />
                </Cell>
            </Row>
            <Row title="Token values (seed #A5000A)">
                {FIELD_TOKENS.map(([name, value, description]) => (
                    <Cell key={name} label={description}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 4,
                                    background: value,
                                    border: '1px solid #c4c7c8',
                                }}
                            />
                            <code style={{ fontSize: 12 }}>
                                {name}: {value}
                            </code>
                        </div>
                    </Cell>
                ))}
            </Row>
        </Workspace>
    ),
};

/** Open dropdown with a selected item so the tonal ("illuminated") selection is reviewable. */
export const TonalSelection: StoryObj = {
    render: () => (
        <Workspace>
            <Row title="Select — open, with tonal selected item">
                <div style={{ width: 260 }}>
                    <Select
                        open
                        defaultValue="advice"
                        options={selectOptions}
                        style={{ width: '100%' }}
                        getPopupContainer={(node) => node.parentElement ?? document.body}
                    />
                </div>
            </Row>
            <div style={{ height: 160 }} />
        </Workspace>
    ),
};
