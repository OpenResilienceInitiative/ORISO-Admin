import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Languages } from './index';
import {
    appearanceHandlers,
    asLockedForOrganisationAdmin,
    atPhoneWidth,
    inTheRaster,
    withAppearanceData,
} from '../appearanceStoryHarness.matrix';
import { expectReadOnlyTile, PLATFORM_RELEASE_HINT } from '../../../../CardEditable/readOnlyTileStory.matrix';

const meta = {
    title: 'Settings/Einstellungen/Erscheinungsbild/Languages',
    id: 'organisms-tenants-appearance-languages',
    component: Languages,
    args: { tenantId: '1' },
    parameters: { layout: 'padded', msw: { handlers: appearanceHandlers } },
    decorators: [(Story, { parameters }) => inTheRaster(Story, 1, parameters.rasterWidth), withAppearanceData],
} satisfies Meta<typeof Languages>;

export default meta;
type Story = StoryObj<typeof meta>;

const BASE_NAME = /^(Deutsch|German)\s*,\s*(Basissprache, immer aktiv|base language, always on)$/;

/** German, the base language, leads the list and is filled; the others are outlined. */
export const InTheRaster: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByText(/^(Deutsch|German)$/)).toBeVisible());
        const base = canvas.getByText(/^(Deutsch|German)$/);
        // Said, not only shown: screen readers hear that this one is the base language.
        await expect(base).toHaveTextContent(/Basissprache, immer aktiv|base language, always on/);
        const other = canvas.getByText(/^(Englisch|English)$/);
        await expect(base.parentElement?.firstElementChild).toBe(base);
        await expect(getComputedStyle(base).backgroundColor).not.toBe(getComputedStyle(other).backgroundColor);
    },
};

/** Editing: German stays checked, cannot be unchecked, and shows a lock. */
export const Editing: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByRole('button', { name: /bearbeiten|edit/i })).toBeVisible());
        await userEvent.click(canvas.getByRole('button', { name: /bearbeiten|edit/i }));
        const base = await canvas.findByRole('checkbox', { name: BASE_NAME });
        await expect(base).toBeChecked();
        await expect(base).toBeDisabled();
        await expect(base.closest('label')?.querySelector('[data-testid="LockOutlinedIcon"]')).not.toBeNull();
    },
};

export const ReadOnly: Story = {
    args: { readOnly: true },
    decorators: [asLockedForOrganisationAdmin],
    play: async ({ canvasElement }) => expectReadOnlyTile(canvasElement, PLATFORM_RELEASE_HINT),
};

export const PhoneReadOnly: Story = {
    ...atPhoneWidth,
    args: { readOnly: true },
    decorators: [asLockedForOrganisationAdmin],
    play: async ({ canvasElement }) => expectReadOnlyTile(canvasElement, PLATFORM_RELEASE_HINT),
};
