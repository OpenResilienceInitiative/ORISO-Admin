import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect } from 'storybook/test';
import { GeneralSettingsPage } from '.';
import {
    appearanceHandlers,
    withAppearanceData,
} from '../../../components/Tenants/GeneralSettings/components/appearanceStoryHarness.matrix';
import { setStoryAuth } from '../../../utils/storybook/adminStoryDecorators';
import { UserRole } from '../../../enums/UserRole';

const meta = {
    title: 'Settings/Einstellungen/Erscheinungsbild/Ganze Seite',
    component: GeneralSettingsPage,
    args: { section: 'appearance' },
    parameters: { layout: 'fullscreen', msw: { handlers: appearanceHandlers } },
    beforeEach: () => setStoryAuth([UserRole.TenantAdmin], 1),
    decorators: [withAppearanceData],
} satisfies Meta<typeof GeneralSettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Appearance: Story = {
    play: async ({ canvas }) => {
        await expect(await canvas.findByText('Individuelle Bilder')).toBeVisible();
    },
};
