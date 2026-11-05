import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect } from 'storybook/test';
import { LegalSettingsPage } from '.';
import { wholeTabHandlers, wholeTabBeforeEach, wholeTabDecorators } from '../wholeTabStory.matrix';

const meta = {
    title: 'Settings/Einstellungen/Rechtliches/Ganze Seite',
    component: LegalSettingsPage,
    parameters: { layout: 'fullscreen', msw: { handlers: wholeTabHandlers } },
    beforeEach: wholeTabBeforeEach,
    decorators: wholeTabDecorators,
} satisfies Meta<typeof LegalSettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;
export const TenantAdmin: Story = {
    play: async ({ canvas }) => {
        await expect(await canvas.findByText(/^(Impressum|Legal notice)$/i)).toBeVisible();
    },
};
