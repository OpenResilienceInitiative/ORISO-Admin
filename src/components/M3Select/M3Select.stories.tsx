import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook's exports map resolves for TypeScript and Vite.
import { expect, fireEvent, userEvent, within } from 'storybook/test';
import { M3Select } from './index';

const meta = {
    title: 'Molecules/M3Select',
    component: M3Select,
    args: {
        'aria-label': 'Language',
        defaultValue: 'de',
        options: [
            { value: 'de', label: 'Deutsch' },
            { value: 'en', label: 'English' },
        ],
        style: { width: 200 },
    },
} satisfies Meta<typeof M3Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const expectCenteredArrow = async (canvasElement: HTMLElement) => {
    const input = within(canvasElement).getByRole('combobox', { name: 'Language' });
    const select = input.closest('.ant-select');
    const arrow = select?.querySelector('.ant-select-arrow');
    if (!select || !arrow) throw new Error('Select arrow is missing');
    const center = ({ top, height }: DOMRect) => top + height / 2;
    await expect(Math.abs(center(select.getBoundingClientRect()) - center(arrow.getBoundingClientRect()))).toBeLessThan(
        1,
    );
};

export const Standard: Story = {
    play: async ({ canvasElement }) => {
        await expectCenteredArrow(canvasElement);
        await userEvent.tab();
        await expect(within(canvasElement).getByRole('combobox', { name: 'Language' })).toHaveFocus();
        const input = within(canvasElement).getByRole('combobox', { name: 'Language' });
        await userEvent.keyboard('{Enter}');
        await expect(input).toHaveAttribute('aria-expanded', 'true');
        // rc-select 14 still reads the legacy numeric key code inside the option list.
        await fireEvent.keyDown(input, { key: 'ArrowDown', which: 40, keyCode: 40 });
        await fireEvent.keyDown(input, { key: 'Enter', which: 13, keyCode: 13 });
        await fireEvent.keyUp(input, { key: 'Enter', which: 13, keyCode: 13 });
        await expect(canvasElement.querySelector('.ant-select-selection-item')).toHaveTextContent('English');
        await userEvent.keyboard('{Enter}');
        await fireEvent.keyDown(input, { key: 'Escape', which: 27, keyCode: 27 });
        await expect(input).toHaveAttribute('aria-expanded', 'false');
    },
};

export const Compact: Story = {
    args: { size: 'small', allowClear: true },
    play: async ({ canvasElement }) => {
        await expectCenteredArrow(canvasElement);
    },
};

export const Loading: Story = {
    args: { loading: true, allowClear: true },
    play: async ({ canvasElement }) => {
        const select = within(canvasElement).getByRole('combobox', { name: 'Language' });
        await userEvent.hover(select);
        await expect(canvasElement.querySelector('.ant-select-arrow-loading .anticon-loading')).toBeVisible();
        await expect(canvasElement.querySelector('.ant-select-clear')).not.toBeInTheDocument();
    },
};
