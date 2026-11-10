import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { LogoAndFavicon } from './index';
import {
    appearanceHandlers,
    appearanceHandlersFor,
    asLockedForOrganisationAdmin,
    atPhoneWidth,
    brandedTenant,
    inTheRaster,
    withAppearanceData,
    withAppearanceTenant,
} from '../appearanceStoryHarness.matrix';
import { expectReadOnlyTile, PLATFORM_RELEASE_HINT } from '../../../../CardEditable/readOnlyTileStory.matrix';

const meta = {
    title: 'Settings/Einstellungen/Erscheinungsbild/LogoAndFavicon',
    id: 'organisms-tenants-appearance-logoandfavicon',
    component: LogoAndFavicon,
    args: { tenantId: '1' },
    parameters: { layout: 'padded', msw: { handlers: appearanceHandlers } },
    decorators: [(Story, { parameters }) => inTheRaster(Story, 3, parameters.rasterWidth), withAppearanceData],
} satisfies Meta<typeof LogoAndFavicon>;

export default meta;
type Story = StoryObj<typeof meta>;

const withImages = {
    parameters: { msw: { handlers: appearanceHandlersFor(brandedTenant) } },
    decorators: [withAppearanceTenant(brandedTenant)],
};

/** One row per image: what it is, how big, where it appears and what may be uploaded. */
const expectImageRows = async (canvasElement: HTMLElement) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByText('512 × 512 px')[0]).toBeVisible());
    await expect(
        canvas.getByText(
            /^(Anmelde- und Registrierungsseite · JPG oder PNG bis 500 KB|Login and registration screens · JPG or PNG up to 500 KB)$/,
        ),
    ).toBeVisible();
    await expect(
        canvas.getByText(/^(Browser-Tab · JPG, PNG oder ICO bis 500 KB|Browser tab · JPG, PNG or ICO up to 500 KB)$/),
    ).toBeVisible();
    await expect(canvas.getByText(/^(Ersetzt das Logo|Replaces the logo)/)).toBeVisible();
    await expect(canvas.getByText('32 × 32 px')).toBeVisible();
};

const startEditing = async (canvasElement: HTMLElement) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole('button', { name: /bearbeiten|edit/i })).toBeVisible());
    await userEvent.click(canvas.getByRole('button', { name: /bearbeiten|edit/i }));
};

/** Nothing uploaded yet: each row says so, and read mode offers no file picker. */
export const InTheRaster: Story = {
    play: async ({ canvasElement }) => {
        await expectImageRows(canvasElement);
        await expect(within(canvasElement).getAllByText(/Noch nicht hinterlegt|Not set yet/).length).toBeGreaterThan(1);
        await expect(canvasElement.querySelector('input[type="file"]')).toBeNull();
    },
};

/** Logo, favicon and association logo uploaded: the rows show them, the favicon at its real 32 px. */
export const WithImages: Story = {
    ...withImages,
    play: async ({ canvasElement }) => {
        await expectImageRows(canvasElement);
        const favicon = within(canvasElement).getByRole('img', { name: 'Favicon' });
        await expect(favicon.getBoundingClientRect().width).toBe(32);
        await expect(within(canvasElement).queryByText(/Noch nicht hinterlegt|Not set yet/)).toBeNull();
    },
};

/** Editing, nothing uploaded: one "hinzufügen" action per row. */
export const EditingEmpty: Story = {
    play: async ({ canvasElement }) => {
        await startEditing(canvasElement);
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByRole('button', { name: /Logo hinzufügen|Add Logo/ })).toBeVisible());
        await expect(canvas.getByRole('button', { name: /Favicon hinzufügen|Add Favicon/ })).toBeVisible();
    },
};

/** Editing with images: "ersetzen" instead, through the same file checks as before. */
export const EditingWithImages: Story = {
    ...withImages,
    play: async ({ canvasElement }) => {
        await startEditing(canvasElement);
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByRole('button', { name: /Logo ersetzen|Replace Logo/ })).toBeVisible());
        await expect(canvas.getByRole('button', { name: /Favicon ersetzen|Replace Favicon/ })).toBeVisible();
        await expect(canvasElement.querySelector('input[type="file"][accept*=".ico"]')).not.toBeNull();
    },
};

/** An organisation admin without the platform's release: chip, dashed outline, and who can release it. */
export const ReadOnly: Story = {
    ...withImages,
    args: { readOnly: true },
    decorators: [...withImages.decorators, asLockedForOrganisationAdmin],
    play: async ({ canvasElement }) => {
        await expectReadOnlyTile(canvasElement, PLATFORM_RELEASE_HINT);
        await expect(canvasElement.querySelector('input[type="file"]')).toBeNull();
    },
};

/** At 390 px the action moves under the text instead of squeezing it; nothing scrolls sideways. */
export const PhoneEditing: Story = {
    ...withImages,
    ...atPhoneWidth,
    play: async ({ canvasElement }) => {
        await startEditing(canvasElement);
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByRole('button', { name: /Logo ersetzen|Replace Logo/ })).toBeVisible());
        const action = canvas.getByRole('button', { name: /Logo ersetzen|Replace Logo/ });
        const size = canvas.getAllByText('512 × 512 px')[0];
        await expect(action.getBoundingClientRect().top).toBeGreaterThan(size.getBoundingClientRect().bottom);
        const tile = action.closest<HTMLElement>('form');
        await expect((tile as HTMLElement).scrollWidth).toBeLessThanOrEqual((tile as HTMLElement).clientWidth);
    },
};
