import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect } from 'storybook/test';
import { PermissionsSettingsPage } from '.';
import { wholeTabHandlers, wholeTabBeforeEach, wholeTabDecorators } from '../wholeTabStory.matrix';

const meta = {
    title: 'Settings/Einstellungen/Funktionszugriff/Ganze Seite',
    component: PermissionsSettingsPage,
    parameters: { layout: 'fullscreen', msw: { handlers: wholeTabHandlers } },
    beforeEach: wholeTabBeforeEach,
    decorators: wholeTabDecorators,
} satisfies Meta<typeof PermissionsSettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;
export const TenantAdmin: Story = {
    play: async ({ canvas }) => {
        await expect(await canvas.findByText('Konto der ratsuchenden Person')).toBeVisible();
    },
};
