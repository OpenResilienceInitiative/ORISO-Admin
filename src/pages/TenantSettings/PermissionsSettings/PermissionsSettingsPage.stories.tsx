import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-extraneous-dependencies -- story fixture
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, userEvent, within } from 'storybook/test';
import { PermissionsSettingsPage } from '.';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth } from '../../../utils/storybook/adminStoryDecorators';
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
        await expect(
            await canvas.findByText(/Konto der ratsuchenden Person|The advice seeker.s account/i),
        ).toBeVisible();
    },
};

/** The platform admin's page (`/admin/settings/permissions`): the presets for every Träger. */
export const PlatformAdmin: Story = {
    beforeEach: () => {
        wholeTabBeforeEach();
        setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0);
    },
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/tenantadmin/controls', () =>
                    HttpResponse.json({ allowedPermissionToggles: {}, permissionPolicies: {} }),
                ),
                http.put('*/service/tenantadmin/controls', async ({ request }) =>
                    HttpResponse.json(await request.json()),
                ),
                ...wholeTabHandlers,
            ],
        },
    },
    play: async ({ canvas }) => {
        await expect(await canvas.findByTestId('chat-type-card-liveChat', {}, { timeout: 8000 })).toBeVisible();
    },
};

/**
 * Supervision, a section of the Mail-Beratung tile (Frank, 2026-11-25); "Konfigurieren" opens what the
 * supervision chat itself offers, each with "Anpassbar"/"Vorgabe". Changes apply on "Speichern" only.
 */
export const SupervisionDialog: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const mail = await canvas.findByTestId('chat-type-card-oneOnOne', {}, { timeout: 8000 });
        // Folded at first, like case sharing.
        await userEvent.click(within(mail).getByRole('button', { name: /^Supervision$/ }));
        const section = within(mail).getByTestId('supervision-section');
        await userEvent.click(within(section).getByRole('button', { name: /Konfigurieren|Configure/ }));
        const body = within(canvasElement.ownerDocument.body);
        const dialog = await body.findByRole('dialog');
        await expect(
            dialog.querySelector('[data-feature-policy="featureVideoCallsSupervisionChatsEnabled"]'),
        ).not.toBeNull();
        await expect(within(dialog).getByRole('button', { name: /Speichern|Save/ })).toBeEnabled();
    },
};
