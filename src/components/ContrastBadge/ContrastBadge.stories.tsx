import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContrastBadge, ContrastNotice } from './index';

const meta = {
    title: 'Atoms/ContrastBadge',
    component: ContrastBadge,
    parameters: { layout: 'padded' },
    args: { color: '#a5000a' },
} satisfies Meta<typeof ContrastBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ≥ 7 : 1 against the text drawn on the colour (white here). */
export const AAA: Story = {};

/** 4.5–7 : 1. */
export const AA: Story = { args: { color: '#d32f2f' } };

/** Below 4.5 : 1 — warning style, spelled out in words. */
export const TooWeak: Story = { args: { color: '#808080' } };

/** One line under a colour list naming every colour below 4.5 : 1. */
export const Notice: Story = {
    render: () => (
        <ContrastNotice
            colors={[
                { name: 'Dunkle Akzentfarbe', color: '#a5000a' },
                { name: 'Fehlerzustand', color: '#808080' },
            ]}
        />
    ),
};
