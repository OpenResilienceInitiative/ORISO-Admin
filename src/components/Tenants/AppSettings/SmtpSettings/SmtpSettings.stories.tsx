import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { SmtpSettings } from './index';

const storedTenant = {
    id: 42,
    name: 'Example tenant',
    settings: {
        smtpMode: 'OWN',
        smtp: {
            enabled: true,
            host: 'smtp.tenant.example',
            port: 587,
            secure: false,
            username: 'example-smtp-user',
            passwordSet: true,
            from: 'sender@tenant.example',
            emailThemeColor: '#145080',
        },
    },
    theming: {},
    content: { impressum: {}, privacy: {}, termsAndConditions: {}, claim: {} },
};

const StoredSettingsExample = () => {
    const { setManualSettings } = useAppConfigContext();
    useEffect(() => setManualSettings({ globalFeatureSystemNotificationEmailsEnabled: true }), [setManualSettings]);
    return <SmtpSettings tenantId="42" />;
};

const handlers = (mode: 'OWN' | 'PLATFORM' = 'OWN') => [
    http.get('*/service/tenantadmin/42', () =>
        HttpResponse.json({ ...storedTenant, settings: { ...storedTenant.settings, smtpMode: mode } }),
    ),
    http.put('*/service/tenantadmin/42', () => new HttpResponse(null, { status: 204 })),
    http.post('*/service/tenant/42/smtp-test-deliveries', async ({ request }) => {
        await expect(await request.text()).toBe('');
        return new HttpResponse(null, { status: 204 });
    }),
];

const meta = {
    title: 'Organisms/Tenants/Settings/Smtp',
    component: SmtpSettings,
    args: { tenantId: '42' },
    render: () => <StoredSettingsExample />,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof SmtpSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SavedOwnServer: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const testButton = await canvas.findByRole('button', {
            name: /Testmail an mich senden|Send a test email to me/i,
        });
        await waitFor(() => expect(testButton).toBeEnabled());
        await userEvent.click(canvas.getByRole('button', { name: /Bearbeiten|Edit/i }));
        const host = canvas.getByLabelText(/SMTP Host/i);
        await userEvent.clear(host);
        await userEvent.type(host, 'unsaved.smtp.example');
        await userEvent.click(testButton);
        await expect(
            await within(canvasElement.ownerDocument.body).findByText(
                /Der E-Mail-Server hat die Testmail angenommen|The email server accepted the test message/i,
            ),
        ).toBeInTheDocument();
        await expect(host).toHaveValue('unsaved.smtp.example');
    },
};

export const PlatformHasNoOwnServerTest: Story = {
    parameters: { msw: { handlers: handlers('PLATFORM') } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const testButton = await canvas.findByRole('button', {
            name: /Testmail an mich senden|Send a test email to me/i,
        });
        await expect(testButton).toBeDisabled();
        await waitFor(() => expect(canvas.getByLabelText(/SMTP Host/i)).toHaveValue('smtp.tenant.example'));
        await userEvent.click(canvas.getByRole('button', { name: /Bearbeiten|Edit/i }));
        await userEvent.click(
            canvas.getByRole('radio', { name: /Eigenen E-Mail-Server verwenden|Use own email server/i }),
        );
        await expect(testButton).toBeDisabled();
    },
};

export const UnusualTransportConfirmation: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(async () =>
            expect(await canvas.findByLabelText(/SMTP Host/i)).toHaveValue('smtp.tenant.example'),
        );
        await userEvent.click(canvas.getByRole('button', { name: /Bearbeiten|Edit/i }));
        const port = canvas.getByRole('spinbutton', { name: /SMTP Port/i });
        await userEvent.clear(port);
        await userEvent.type(port, '2525');
        await userEvent.click(canvas.getByRole('button', { name: /Speichern|Save/i }));
        const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog');
        await waitFor(() =>
            expect(within(dialog).getByRole('button', { name: /Trotzdem speichern|Save anyway/i })).toBeVisible(),
        );
    },
};
