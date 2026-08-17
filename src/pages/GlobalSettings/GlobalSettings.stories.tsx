import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import { expect, waitFor } from 'storybook/test';
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

const assertResponsiveComposition = async (canvasElement: HTMLElement, expected: 'split' | 'stacked') => {
    await waitFor(() => {
        expect(canvasElement.querySelector('[class*="globalConfigGrid_"]')).toBeTruthy();
        expect(canvasElement.querySelectorAll('[class*="provider_"]')).toHaveLength(2);
    });

    const compactColumn = canvasElement.querySelector<HTMLElement>('[class*="compactCardColumn_"]')!;
    const documentCard = canvasElement.querySelector<HTMLElement>('[class*="documentMasterDataCardSlot_"]')!;
    const compactRect = compactColumn.getBoundingClientRect();
    const documentRect = documentCard.getBoundingClientRect();

    if (expected === 'split') {
        expect(documentRect.left).toBeGreaterThan(compactRect.right);
    } else {
        expect(Math.abs(documentRect.left - compactRect.left)).toBeLessThanOrEqual(1);
        expect(documentRect.top).toBeGreaterThanOrEqual(compactRect.bottom);
    }

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

/** Wide content: compact settings stay beside the document master-data card. */
export const ResponsiveWide: Story = {
    decorators: [withContentWidth(1164)],
    parameters: {
        msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) },
        viewport: { defaultViewport: 'laptop' },
    },
    play: ({ canvasElement }) => assertResponsiveComposition(canvasElement, 'split'),
};

/** Regression: a narrow admin content area stacks even while the browser viewport is 1100px wide. */
export const ResponsiveIntermediateContent: Story = {
    decorators: [withContentWidth(880)],
    parameters: {
        msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) },
        viewport: { defaultViewport: 'responsive1100' },
    },
    play: ({ canvasElement }) => assertResponsiveComposition(canvasElement, 'stacked'),
};

/** At the compact breakpoint provider metadata stacks without clipping its field or action. */
export const Responsive640: Story = {
    decorators: [withContentWidth(640)],
    parameters: {
        msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) },
        viewport: { defaultViewport: 'responsive640' },
    },
    play: ({ canvasElement }) => assertResponsiveComposition(canvasElement, 'stacked'),
};

/** Narrow phone content keeps the same reading order and usable full-width provider controls. */
export const ResponsiveNarrow: Story = {
    decorators: [withContentWidth(360)],
    parameters: {
        msw: { handlers: okHandlers({ featureAnonymousChatEnabled: true }) },
        viewport: { defaultViewport: 'phoneSmall' },
    },
    play: ({ canvasElement }) => assertResponsiveComposition(canvasElement, 'stacked'),
};
