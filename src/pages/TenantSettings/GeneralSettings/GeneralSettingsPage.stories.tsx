import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect } from 'storybook/test';
import { GeneralSettingsPage } from '.';
import {
    appearanceHandlers,
    withAppearanceData,
} from '../../../components/Tenants/GeneralSettings/components/appearanceStoryHarness.matrix';
import { setStoryAuth } from '../../../utils/storybook/adminStoryDecorators';
import { contactPersonReadHandlers } from '../../../utils/storybook/contactPersonStoryHandlers';
import { UserRole } from '../../../enums/UserRole';

const meta = {
    title: 'Settings/Einstellungen/Stammdaten & Mehr/Ganze Seite',
    component: GeneralSettingsPage,
    args: { section: 'masterData' },
    // The Träger admin's master data shows the Träger default contact person tile (ORISO-Admin#1534).
    parameters: { layout: 'fullscreen', msw: { handlers: [...contactPersonReadHandlers(), ...appearanceHandlers] } },
    beforeEach: () => setStoryAuth([UserRole.TenantAdmin], 1),
    decorators: [withAppearanceData],
} satisfies Meta<typeof GeneralSettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;
export const MasterData: Story = {
    play: async ({ canvas }) => {
        await expect(await canvas.findByText(/Benennung und Slogan|Name and slogan/i)).toBeVisible();
        await expect(
            await canvas.findByText(/Standard-Ansprechperson|Default contact person for all counselling centres/i),
        ).toBeVisible();
    },
};
