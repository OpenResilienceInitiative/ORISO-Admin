import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, within } from 'storybook/test';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import i18n from '../../../../i18n';
import { TraegerLicenceSenderSettings } from './index';

/**
 * Licence and sender of a Träger, in the tab "Weitere" of the Träger page (Frank, 2026-11-20): moved
 * from Stammdaten, with their own save. Only a platform admin changes the licence.
 */
const tenant = {
    id: 7,
    name: 'Caritas Süd',
    legalName: 'Caritasverband für die Erzdiözese Süd e.V.',
    contactEmail: 'beratung@caritas-sued.de',
    contactPhone: '+49 89 1234-0',
    licensing: { allowedNumberOfUsers: 40 },
    settings: {},
};

const meta = {
    title: 'Settings/Einstellungen/Weitere/TraegerLicenceSenderSettings',
    id: 'organisms-appsettings-traegerlicencesendersettings',
    component: TraegerLicenceSenderSettings,
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                http.get('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
                http.put('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
                http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: 7, settings: {} })),
                http.get('*/service/tenant/:id', () => HttpResponse.json({ id: 7, settings: {} })),
            ],
        },
    },
    args: { tenantId: '7' },
} satisfies Meta<typeof TraegerLicenceSenderSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

const licenceLabel = () =>
    new RegExp(String(i18n.t('tenants.add.form.allowedConsultantsLicense.placeholder')).replace('*', ''));

/** The platform admin: licence and sender, both editable after "Bearbeiten". */
export const PlatformAdmin: Story = {
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0);
            return withAdminProviders(Story);
        },
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByDisplayValue('40', {}, { timeout: 8000 });
        await expect(canvas.getByRole('group', { name: String(i18n.t('tenants.form.section.licence')) })).toBeVisible();
        await expect(canvas.getByRole('group', { name: String(i18n.t('tenants.form.section.sender')) })).toBeVisible();
    },
};

/** A Träger admin on the Träger page: the licence is read-only and says who sets it. */
export const TraegerAdmin: Story = {
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin], 7);
            return withAdminProviders(Story);
        },
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByDisplayValue('40', {}, { timeout: 8000 });
        await expect(
            canvas.getByText(String(i18n.t('tenants.appSettings.licenceSender.licenceReadOnly'))),
        ).toBeVisible();
        await expect(canvas.getByLabelText(licenceLabel())).toBeDisabled();
    },
};
