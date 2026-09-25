import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { GlobalSmtpSettingsPage } from '.';

const summaryUrl = '*/service/users/system-notification-emails/platform-settings';
const userUrl = '*/service/users/data';

const meta = {
    title: 'Organisms/Pages/Settings/PlatformSmtp',
    component: GlobalSmtpSettingsPage,
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
    parameters: {
        msw: {
            handlers: [
                http.get(userUrl, () => HttpResponse.json({ email: 'admin@example.org' })),
                http.get(summaryUrl, () =>
                    HttpResponse.json({
                        host: 'smtp.platform.example',
                        port: 587,
                        secure: true,
                        from: 'mail@platform.example',
                        configured: true,
                        credentialsPresent: true,
                    }),
                ),
            ],
        },
    },
};

export const Unavailable: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(userUrl, () => HttpResponse.json({ email: 'admin@example.org' })),
                http.get(summaryUrl, () => new HttpResponse(null, { status: 503 })),
            ],
        },
    },
};
