import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, within } from 'storybook/test';
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

// The platform admin also loads the superadmin-only cards. `dpia` must precede TENANT_ADMIN,
// whose `:id` would otherwise answer it with a tenant.
const platformAdminHandlers = [
    http.get('*/service/tenantadmin/dpia', () => HttpResponse.json({})),
    http.get('*/service/tenantadmin/translation/keys', () => HttpResponse.json({})),
    http.get('*/service/tenantadmin/controls/account-inactivity', () =>
        HttpResponse.json({ askerMonths: 24, consultantMonths: 24, otherMonths: 24, revision: 0 }),
    ),
    http.get('*/service/tenantadmin/controls/chat-recovery', () =>
        HttpResponse.json({ asker: 'LOGIN_PASSWORD', consultant: 'RECOVERY_KEY', revision: 0 }),
    ),
    http.get('*/service/users/admin/temporary-account-settings', () =>
        HttpResponse.json({
            callDeleteAfterMinutes: 15,
            callMaxLifetimeHours: 24,
            chatInactivityDays: 30,
            hidePasswordField: false,
            messageRetention: 'GUEST_DECIDES',
            revision: 0,
        }),
    ),
    http.get('*/service/useradmin/statistics/settings', () =>
        HttpResponse.json({
            revision: 0,
            settings: [
                {
                    key: 'agencyMinimumCounsellors',
                    value: '5',
                    defaultValue: '5',
                    options: ['2', '3', '4', '5', '6', '7', '8', '9', '10'],
                    effectiveFrom: '2026-10-20T08:00',
                    changedBy: null,
                },
                {
                    key: 'messageCountTracking',
                    value: 'ENABLED',
                    defaultValue: 'ENABLED',
                    options: ['ENABLED', 'DISABLED'],
                    effectiveFrom: null,
                    changedBy: null,
                },
            ],
        }),
    ),
    ...okHandlers({ featureAnonymousChatEnabled: true }),
];

const oneTopicSwitchName = /genau einen Fachbereich/;

const meta = {
    title: 'Settings/Einstellungen/Globale Konfigurationen/GlobalLoginSettings',
    id: 'organisms-pages-settings-globalloginsettings',
    component: GlobalLoginSettingsPage,
    parameters: { layout: 'fullscreen' },
    // Tenant-scoped admin (not super-admin) so the superadmin-only translation-keys
    // request is not fired; the API-keys card renders visible-but-disabled.
    beforeEach: () => setStoryAuth([UserRole.TenantAdmin, UserRole.SingleTenantAdmin], 1),
    decorators: [(Story) => withAdminProviders(Story)],
} satisfies Meta<typeof GlobalLoginSettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const withContentWidth = (width: number) => (Story: React.ComponentType) =>
    (
        <div data-testid={`global-settings-width-${width}`} style={{ width, maxWidth: '100%' }}>
            <Story />
        </div>
    );

const assertProviderControlsFit = (canvasElement: HTMLElement) => {
    const providers = canvasElement.querySelectorAll<HTMLElement>('[class*="provider_"]');
    expect(providers).toHaveLength(2);

    providers.forEach((provider) => {
        const field = provider.querySelector<HTMLElement>('.MuiFormControl-root');
        const buttons = provider.querySelectorAll<HTMLButtonElement>('button');
        const button = buttons[buttons.length - 1];
        expect(field).toBeVisible();
        expect(button).toBeVisible();

        const providerRect = provider.getBoundingClientRect();
        const fieldRect = field!.getBoundingClientRect();
        const buttonRect = button!.getBoundingClientRect();
        expect(fieldRect.left).toBeGreaterThanOrEqual(providerRect.left);
        expect(fieldRect.right).toBeLessThanOrEqual(providerRect.right + 1);
        expect(fieldRect.width).toBeGreaterThan(providerRect.width * 0.7);
        expect(buttonRect.right).toBeLessThanOrEqual(providerRect.right + 1);
    });
};

const assertRasterColumns = async (canvasElement: HTMLElement, expected: number) => {
    await waitFor(() => {
        expect(canvasElement.querySelector('[data-admin-card-grid]')).toBeTruthy();
        expect(canvasElement.querySelectorAll('[class*="provider_"]')).toHaveLength(2);
    });

    const grid = canvasElement.querySelector<HTMLElement>('[data-admin-card-grid]')!;
    expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(expected);
    assertProviderControlsFit(canvasElement);
};

/** Tenant loaded with the anonymous-chat feature enabled. */
export const Filled: Story = {
    parameters: { msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) } },
};

/** Tenant loaded with default (empty) settings — toggles off. */
export const Empty: Story = {
    parameters: { msw: { handlers: okHandlers({}) } },
};

// Every card sits in its own <section>; the login card next to it has its own edit button.
const oneTopicCard = (oneTopicSwitch: HTMLElement) =>
    within(oneTopicSwitch.closest('[data-admin-card-grid-item]') as HTMLElement);

/** Platform admin: the platform-only cards render, and the one-topic-per-agency switch is editable. */
export const PlatformAdmin: Story = {
    beforeEach: () => setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0),
    parameters: { msw: { handlers: platformAdminHandlers } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Eine Beratungsstelle hat genau einen Fachbereich')).toBeVisible();
        const oneTopicSwitch = canvas.getByRole('switch', { name: oneTopicSwitchName });
        await expect(oneTopicCard(oneTopicSwitch).getByRole('button', { name: /edit|bearbeiten/i })).toBeVisible();
    },
};

/** Tenant admin: the platform-wide one-topic switch is visible but disabled (ORISO rule: never hidden). */
export const TenantAdmin: Story = {
    parameters: { msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const oneTopicSwitch = await canvas.findByRole('switch', { name: oneTopicSwitchName });
        await expect(oneTopicSwitch).toBeDisabled();
        await expect(oneTopicCard(oneTopicSwitch).queryByRole('button', { name: /edit|bearbeiten/i })).toBeNull();
    },
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

/** Wide content: three columns of tiles. */
export const ResponsiveWide: Story = {
    decorators: [withContentWidth(1164)],
    parameters: {
        msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) },
        viewport: { defaultViewport: 'laptop' },
    },
    play: ({ canvasElement }) => assertRasterColumns(canvasElement, 3),
};

/** Regression: the columns follow the admin content area, not the 1100px browser viewport. */
export const ResponsiveIntermediateContent: Story = {
    decorators: [withContentWidth(880)],
    parameters: {
        msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) },
        viewport: { defaultViewport: 'responsive1100' },
    },
    play: ({ canvasElement }) => assertRasterColumns(canvasElement, 2),
};

/** At the compact breakpoint provider metadata stacks without clipping its field or action. */
export const Responsive640: Story = {
    decorators: [withContentWidth(640)],
    parameters: {
        msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) },
        viewport: { defaultViewport: 'responsive640' },
    },
    play: ({ canvasElement }) => assertRasterColumns(canvasElement, 1),
};

/** Narrow phone content keeps the same reading order and usable full-width provider controls. */
export const ResponsiveNarrow: Story = {
    decorators: [withContentWidth(360)],
    parameters: {
        msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) },
        viewport: { defaultViewport: 'phoneSmall' },
    },
    play: ({ canvasElement }) => assertRasterColumns(canvasElement, 1),
};
