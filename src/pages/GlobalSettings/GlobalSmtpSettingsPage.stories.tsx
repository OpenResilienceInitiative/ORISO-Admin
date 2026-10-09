import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { useAppConfigContext } from '../../context/useAppConfig';
import { GlobalSmtpSettingsPage } from '.';

const summaryUrl = '*/service/users/system-notification-emails/platform-settings';
const userUrl = '*/service/users/data';
const savedSettings = {
    globalFeatureSystemNotificationEmailsEnabled: true,
    globalSmtpEnabled: true,
    globalSmtpHost: 'smtp.platform.example',
    globalSmtpPort: '587',
    globalSmtpSecure: true,
    globalSmtpFrom: 'mail@platform.example',
};

const SavedSettingsExample = () => {
    const { setManualSettings } = useAppConfigContext();
    useEffect(() => setManualSettings(savedSettings), [setManualSettings]);
    return <GlobalSmtpSettingsPage />;
};

const savedSettingsHandlers = (pendingAfterSave = false) => {
    let current = { ...savedSettings };
    let revision = 1;
    let appliedRevision = 1;
    return [
        http.get(userUrl, () => HttpResponse.json({ email: 'admin@example.org' })),
        http.get(summaryUrl, () =>
            HttpResponse.json({
                host: current.globalSmtpHost,
                port: Number(current.globalSmtpPort),
                secure: current.globalSmtpSecure,
                from: current.globalSmtpFrom,
                configured: true,
                credentialsPresent: true,
            }),
        ),
        http.get('*/service/settingsadmin/smtp-sync-status', () =>
            HttpResponse.json({
                revision,
                appliedRevision,
                status: revision === appliedRevision ? 'APPLIED' : 'SMTP_SYNC_PENDING',
            }),
        ),
        http.patch('*/service/settingsadmin', async ({ request }) => {
            const changes = (await request.json()) as Partial<typeof savedSettings>;
            current = { ...current, ...changes };
            revision += 1;
            if (!pendingAfterSave) appliedRevision = revision;
            return new HttpResponse(null, {
                status: 204,
                headers: {
                    'X-Smtp-Sync-Status': pendingAfterSave ? 'SMTP_SYNC_PENDING' : 'APPLIED',
                    'X-Smtp-Revision': String(revision),
                },
            });
        }),
        http.get('*/service/settings', () =>
            HttpResponse.json(
                Object.fromEntries(
                    Object.entries(current)
                        .filter(([name]) => name !== 'globalSmtpUsername' && name !== 'globalSmtpPassword')
                        .map(([name, value]) => [name, { value }]),
                ),
            ),
        ),
        http.post('*/service/users/system-notification-emails/test', () => new HttpResponse(null, { status: 204 })),
    ];
};

const meta = {
    title: 'Organisms/Pages/Settings/PlatformSmtp',
    component: GlobalSmtpSettingsPage,
    render: () => <SavedSettingsExample />,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof GlobalSmtpSettingsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Configured: Story = {
    parameters: { msw: { handlers: savedSettingsHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const testButton = await canvas.findByRole('button', { name: 'Test-E-Mail senden' });
        await waitFor(() => expect(testButton).toBeEnabled());
        await userEvent.click(canvas.getByRole('button', { name: 'Bearbeiten' }));
        const host = canvas.getByLabelText('SMTP Host');
        await userEvent.clear(host);
        await userEvent.type(host, 'smtp.changed.example');
        await expect(testButton).toBeDisabled();
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern' }));
        await waitFor(() => expect(testButton).toBeEnabled());
        await expect(canvas.getByText('smtp.changed.example')).toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Bearbeiten' }));
        const port = canvas.getByRole('spinbutton', { name: 'SMTP Port' });
        await userEvent.clear(port);
        await userEvent.type(port, '587');
        await expect(testButton).toBeEnabled();
        await userEvent.click(testButton);
        await expect(
            await within(canvasElement.ownerDocument.body).findByText(
                'Test-E-Mail wurde an admin@example.org gesendet.',
            ),
        ).toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Abbrechen' }));

        const password = canvas.getByLabelText('SMTP Passwort');
        const helpText = canvasElement.ownerDocument.getElementById(password.getAttribute('aria-describedby') || '');
        if (!helpText) throw new Error('The write-only password explanation must be associated with its field.');
        const senderLabel = canvas.getByText('Absender E-Mail', { selector: 'label' });
        await expect(helpText.getBoundingClientRect().bottom).toBeLessThanOrEqual(
            senderLabel.getBoundingClientRect().top,
        );
    },
};

export const Unavailable: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(userUrl, () => HttpResponse.json({ email: 'admin@example.org' })),
                http.get(summaryUrl, () =>
                    HttpResponse.json({ message: 'Platform SMTP Admin Settings are unavailable' }, { status: 502 }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('alert')).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Test-E-Mail senden' })).toBeDisabled();
    },
};

export const PendingAfterSave: Story = {
    parameters: { msw: { handlers: savedSettingsHandlers(true) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('smtp.platform.example');
        await userEvent.click(canvas.getByRole('button', { name: /Bearbeiten|Edit/ }));
        const host = canvas.getByLabelText(/SMTP Host/i);
        await userEvent.clear(host);
        await userEvent.type(host, 'smtp.changed.example');
        await userEvent.click(canvas.getByRole('button', { name: /Speichern|Save/ }));
        await expect(
            await within(canvasElement.ownerDocument.body).findByText(
                /Saved\. The new mail settings will be applied within about 5 minutes\.|Gespeichert\. Die neuen Mail-Einstellungen werden innerhalb von etwa 5 Minuten übernommen\./,
            ),
        ).toBeInTheDocument();
        await expect(
            await canvas.findByText(
                /applied to Keycloak mail within about 5 minutes|innerhalb von etwa 5 Minuten für Keycloak/,
            ),
        ).toBeInTheDocument();
        await waitFor(() =>
            expect(canvas.getByRole('button', { name: /Test-E-Mail senden|Send test email/ })).toBeEnabled(),
        );
    },
};
