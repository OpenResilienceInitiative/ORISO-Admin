import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { GlobalLoginSettingsPage } from '.';

// The page hits several tenant endpoints (public tenant, tenant-by-id, tenant-admin).
// ALL authenticated (`skipAuth: false`) calls must be mocked: an unmocked one reaches the
// real backend, 401s, and fetchData force-logs-out — which navigates the story away.
const TENANT_PUBLIC = '*/service/tenant/public/*';
const TENANT_BY_ID = '*/service/tenant/:id';
const TENANT_ADMIN = '*/service/tenantadmin/:id';

const tenant = (settings: Record<string, unknown>) => ({
    id: 1,
    name: 'Demo-Mandant',
    subdomain: 'demo',
    settings,
    licensing: { allowedNumberOfUsers: 50 },
});

const okHandlers = (settings: Record<string, unknown>) => [
    http.get(TENANT_PUBLIC, () => HttpResponse.json(tenant(settings))),
    http.get(TENANT_BY_ID, () => HttpResponse.json(tenant(settings))),
    http.get(TENANT_ADMIN, () => HttpResponse.json(tenant(settings))),
];

const meta = {
    title: 'Organisms/Pages/Settings/GlobalLoginSettings',
    component: GlobalLoginSettingsPage,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            // Tenant-scoped admin (not super-admin) so the superadmin-only translation-keys
            // request is not fired; the API-keys card renders visible-but-disabled.
            setStoryAuth([UserRole.TenantAdmin, UserRole.SingleTenantAdmin], 1);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof GlobalLoginSettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tenant loaded with the anonymous-chat feature enabled. */
export const Filled: Story = {
    parameters: { msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) } },
};

/** Tenant loaded with default (empty) settings — toggles off. */
export const Empty: Story = {
    parameters: { msw: { handlers: okHandlers({}) } },
};

/** Tenant request in flight — the editable card renders its loading state. */
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [
                // Only the tenant data hangs; tenant-admin still answers so it cannot 401 → logout.
                http.get(TENANT_PUBLIC, async () => {
                    await delay('infinite');
                    return HttpResponse.json(tenant({}));
                }),
                http.get(TENANT_BY_ID, async () => {
                    await delay('infinite');
                    return HttpResponse.json(tenant({}));
                }),
                http.get(TENANT_ADMIN, () => HttpResponse.json(tenant({}))),
            ],
        },
    },
};

/**
 * Backend failure (500). `useTenantData` catches the error and falls back to empty settings,
 * so — unlike the table pages — the Settings form degrades to its empty state rather than a
 * dedicated error UI. Kept for parity with the other sections' Error stories.
 */
export const Error: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(TENANT_PUBLIC, () => new HttpResponse(null, { status: 500 })),
                http.get(TENANT_BY_ID, () => new HttpResponse(null, { status: 500 })),
                http.get(TENANT_ADMIN, () => new HttpResponse(null, { status: 500 })),
            ],
        },
    },
};
