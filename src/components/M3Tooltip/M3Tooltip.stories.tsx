/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- fixtures: a tooltip on non-interactive text is exactly what is under test */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FilterChip } from '../FilterChip';
import { M3Tooltip } from './index';

const meta = {
    title: 'Atoms/M3Tooltip',
    component: M3Tooltip,
    parameters: { layout: 'centered' },
    args: {
        text: 'Diese Einladung wurde durch ein erneutes Versenden ersetzt — es gilt die neuere Einladung.',
        children: <span tabIndex={0}>Ersetzt</span>,
    },
} satisfies Meta<typeof M3Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover or tab to the trigger; Escape dismisses (WCAG 2.2 SC 1.4.13). */
export const PlainTooltip: Story = {};

export const BelowTheTrigger: Story = { args: { placement: 'bottom' } };

/** How the invite board uses it: the status vocabulary explains itself (C3). */
export const OnAFilterChip: StoryObj = {
    render: () => (
        <FilterChip
            label="Ersetzt"
            tooltip="Diese Einladung wurde durch ein erneutes Versenden ersetzt — es gilt die neuere Einladung."
        />
    ),
};

/** Empty text is a no-op: the trigger renders untouched, no bubble, no aria. */
export const WithoutText: Story = { args: { text: '' } };
