import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect } from 'storybook/test';
import { AppSettingsPage } from '.';
import { wholeTabHandlers, wholeTabBeforeEach, wholeTabDecorators } from '../wholeTabStory.matrix';

const meta = {
    title: 'Settings/Einstellungen/Funktionalitäten/Ganze Seite',
    component: AppSettingsPage,
    parameters: { layout: 'fullscreen', msw: { handlers: wholeTabHandlers } },
    beforeEach: wholeTabBeforeEach,
    decorators: wholeTabDecorators,
} satisfies Meta<typeof AppSettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;
export const TenantAdmin: Story = {
    play: async ({ canvas }) => {
        await expect(await canvas.findByText(/Sonstige Funktionen|Other features/i)).toBeVisible();
    },
};
