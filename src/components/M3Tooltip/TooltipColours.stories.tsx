/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- fixtures: a tooltip on non-interactive text */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from 'antd';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath
import { expect, userEvent, waitFor, within } from 'storybook/test';
import StatusIcons from '../EditableTable/StatusIcons';
import { M3Tooltip } from './index';

const meta = {
    title: 'Atoms/Tooltip colours',
    parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const expectSolidBlack = async (bubble: Element) => {
    await waitFor(() => expect(getComputedStyle(bubble).backgroundColor).toBe('rgb(0, 0, 0)'));
    await expect(getComputedStyle(bubble).color).toBe('rgb(255, 255, 255)');
};

const openedAntdBubble = (canvasElement: HTMLElement) =>
    waitFor(() => {
        const bubble = canvasElement.ownerDocument.body.querySelector('.ant-tooltip-inner');
        if (!bubble) throw new Error('no antd tooltip yet');
        return bubble;
    });

/** The antd tooltip takes its colours from the shared Admin theme. */
export const AntdTooltip: Story = {
    render: () => (
        <Tooltip open title="Erklärung">
            <span>Auslöser</span>
        </Tooltip>
    ),
    play: async ({ canvasElement }) => expectSolidBlack(await openedAntdBubble(canvasElement)),
};

/** A status icon keeps its colour; its tooltip does not take it over. */
export const StatusIconTooltip: Story = {
    render: () => <StatusIcons status="ERROR" />,
    play: async ({ canvasElement }) => {
        const icon = within(canvasElement).getByRole('img');
        await expect(getComputedStyle(icon).color).toBe('rgb(204, 0, 0)');
        await userEvent.hover(icon);
        await expectSolidBlack(await openedAntdBubble(canvasElement));
    },
};

export const AdminTooltip: Story = {
    render: () => (
        <M3Tooltip text="Erklärung">
            <span tabIndex={0}>Auslöser</span>
        </M3Tooltip>
    ),
    play: async ({ canvasElement }) => {
        within(canvasElement).getByText('Auslöser').focus();
        await expectSolidBlack(await within(canvasElement.ownerDocument.body).findByRole('tooltip'));
    },
};
