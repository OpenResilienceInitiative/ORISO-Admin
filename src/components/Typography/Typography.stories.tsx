import type { Meta, StoryObj } from '@storybook/react-vite';
import { Typography, type TypographyVariant } from './index';

const meta: Meta = {
    title: 'Foundations/Typography',
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=900-7044',
        },
    },
};

export default meta;

const SPECS: Array<{ variant: TypographyVariant; spec: string; sample: string }> = [
    { variant: 'headline-small', spec: 'Inter 24/32 · 400', sample: 'Advisor Account Data' },
    { variant: 'title-medium', spec: 'Inter 16/24 · 500 · +0.15', sample: 'Section title' },
    { variant: 'title-small', spec: 'Roboto 14/20 · 500 · +0.1', sample: 'Tab label' },
    { variant: 'body-large', spec: 'Inter 16/24 · 400 · +0.5', sample: 'Body large paragraph text.' },
    { variant: 'body-medium', spec: 'Inter 14/20 · 400 · +0.25', sample: 'Body medium — the admin default.' },
    { variant: 'body-medium-emphasized', spec: 'Inter 14/20 · 500 · +0.25', sample: 'Body medium emphasized.' },
    { variant: 'body-small', spec: 'Inter 12/16 · 400 · +0.4', sample: 'Helper / caption text.' },
    { variant: 'label-large', spec: 'Inter 14/20 · 500 · +0.1', sample: 'BUTTON / LABEL' },
];

export const Scale: StoryObj = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 8 }}>
            {SPECS.map(({ variant, spec, sample }) => (
                <div
                    key={variant}
                    style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'baseline', gap: 24 }}
                >
                    <div>
                        <code style={{ fontSize: 12, color: 'var(--m3-primary, #a5000a)' }}>{variant}</code>
                        <div style={{ fontSize: 11, color: '#8a8d8e' }}>{spec}</div>
                    </div>
                    <Typography variant={variant}>{sample}</Typography>
                </div>
            ))}
        </div>
    ),
};
