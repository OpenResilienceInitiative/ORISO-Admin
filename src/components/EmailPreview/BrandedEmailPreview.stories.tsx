import type { Meta, StoryObj } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export
import { expect, within } from 'storybook/test';
import type { InviteEmailPreviewDTO } from '../../api/accountInvites/accountInvites';
import { BrandedEmailPreviewView } from './BrandedEmailPreviewView';
import { BrandedEmailPreview } from './BrandedEmailPreview';

import invitePlatformDe from './fixtures/invite-platform-de.html?raw';
import inviteTenantLogoDe from './fixtures/invite-tenant-logo-de.html?raw';

const preview = (html: string, subject: string): InviteEmailPreviewDTO => ({
    templateId: null,
    templateName: null,
    kind: 'TENANT_INVITE',
    language: 'de',
    subject,
    html,
    plainText: 'ORISO\n=====',
    sampleAcceptUrl: 'https://admin.example.org/admin/tenant-onboarding/SAMPLE-PREVIEW-TOKEN',
});

const PLATFORM = preview(invitePlatformDe, 'Ihre Einladung zu ORISO');
const TENANT = preview(inviteTenantLogoDe, 'Ihre Einladung zu ORISO');

/**
 * The preview panel on the e-mail settings page (`/admin/theme-settings/smtp`).
 *
 * The panel is Admin chrome — card, states, hints — around a frame that shows the backend's
 * rendered mail unchanged. These stories pin the states the panel owns; the layout states of the
 * mail itself live in `Organisms/EmailPreview/BrandedEmailLayout`.
 *
 * The HTML in these stories comes from the same checked-in backend fixtures
 * (`fixtures/*.html`, see `scripts/email-fixtures/README.md`).
 */
const meta = {
    title: 'Organisms/EmailPreview/BrandedEmailPreview',
    component: BrandedEmailPreviewView,
    parameters: {
        layout: 'padded',
        // The frame holds the backend's mail document, not app UI — see BrandedEmailLayout.stories.
        a11y: { options: { iframes: false } },
    },
    args: {
        preview: PLATFORM,
        isLoading: false,
        isError: false,
        onRetry: () => {},
    },
} satisfies Meta<typeof BrandedEmailPreviewView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Platform branding (super-admin view): no tenant is selected, so no branding hint is shown. */
export const PlatformBranding: Story = {};

/** The server selected an image. Fixtures do not prove remote image reachability. */
export const TenantBranding: Story = {
    args: {
        preview: {
            ...TENANT,
            branding: {
                brandName: 'Tenant organisation',
                logoUrl: 'https://app.example.org/service/tenant/public/branding/7/logo',
                accentColor: '#246b45',
                primaryColor: '#0f3b8f',
                logoRendering: 'IMAGE',
            },
        },
    },
};

/** The server selected a text wordmark; the panel reports that outcome without guessing why. */
export const NoTenantLogo: Story = {
    args: {
        preview: {
            ...PLATFORM,
            branding: {
                brandName: 'Configured organisation',
                logoUrl: null,
                accentColor: '#246b45',
                primaryColor: '#0f3b8f',
                logoRendering: 'TEXT_WORDMARK',
            },
        },
    },
};

/** Older response: no selected outcome is known, so the panel shows no speculative warning. */
export const LogoNotUsableInEmail: Story = {};

/** While the render request is in flight. */
export const Loading: Story = {
    args: { preview: null, isLoading: true },
};

/**
 * The render failed. The panel shows an inline error with a retry rather than a global toast —
 * a settings page must not lose its context to a transport hiccup.
 */
export const LoadError: Story = {
    args: { preview: null, isError: true },
};

/** The request succeeded but carried nothing renderable. */
export const Empty: Story = {
    args: { preview: null },
};

const PREVIEW_ENDPOINT = '*/service/useradmin/invite-email-templates/preview';

/**
 * The wired container against a mocked backend — proves the query, the parameters and the frame
 * work end to end, not just the presentational shell.
 *
 * The handler answers only a request that carries the parameters this scenario claims to cover:
 * the frame `language`, and no `tenant_id` (this is the platform/super-admin scope). Anything else
 * gets a 400, so the story turns into the error state the moment the container stops sending them
 * — a handler that returned `PLATFORM` unconditionally would have proven nothing.
 */
export const Connected: StoryObj<typeof BrandedEmailPreview> = {
    render: () => <BrandedEmailPreview />,
    parameters: {
        a11y: { options: { iframes: false } },
        msw: {
            handlers: [
                http.get(PREVIEW_ENDPOINT, async ({ request }) => {
                    const params = new URL(request.url).searchParams;
                    const language = params.get('language');
                    if (!language || !['de', 'en'].includes(language) || params.has('tenant_id')) {
                        return HttpResponse.json(
                            { error: `unexpected preview parameters: ${params.toString() || '<none>'}` },
                            { status: 400 },
                        );
                    }
                    await delay(300);
                    return HttpResponse.json(PLATFORM);
                }),
            ],
        },
    },
};

/** The wired container when the endpoint fails — the inline error and retry come from the query. */
export const ConnectedError: StoryObj<typeof BrandedEmailPreview> = {
    render: () => <BrandedEmailPreview />,
    parameters: {
        a11y: { options: { iframes: false } },
        msw: {
            handlers: [http.get(PREVIEW_ENDPOINT, () => new HttpResponse(null, { status: 500 }))],
        },
    },
};

// Each connected scenario gets its own cache; a previous story must not supply its response.
const PreviewScenario = ({ tenantId }: { tenantId?: number }) => {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return (
        <QueryClientProvider client={client}>
            <BrandedEmailPreview tenantId={tenantId} />
        </QueryClientProvider>
    );
};

const actualOutcomeStory = (wordmark: boolean): StoryObj<typeof BrandedEmailPreview> => ({
    render: () => <PreviewScenario tenantId={7} />,
    parameters: {
        msw: {
            handlers: [
                http.get(PREVIEW_ENDPOINT, ({ request }) => {
                    const query = new URL(request.url).searchParams;
                    if (query.get('tenant_id') !== '7' || !['de', 'en'].includes(query.get('language') ?? ''))
                        return new HttpResponse(null, { status: 400 });
                    return HttpResponse.json({
                        ...TENANT,
                        branding: {
                            brandName: 'Fresh organisation',
                            logoUrl: wordmark ? null : 'https://app.example.org/service/tenant/public/branding/7/logo',
                            accentColor: '#246b45',
                            primaryColor: '#0f3b8f',
                            logoRendering: wordmark ? 'TEXT_WORDMARK' : 'IMAGE',
                        },
                    });
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Fresh organisation')).toBeVisible();
        await expect(await canvas.findByTestId('branded-email-preview-frame')).toHaveAttribute('srcdoc', TENANT.html);
        if (wordmark) await expect(await canvas.findByRole('alert')).toBeVisible();
        else await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    },
});

export const ConnectedActualImage = actualOutcomeStory(false);
export const ConnectedActualWordmark = actualOutcomeStory(true);
export const ConnectedLegacyUnknown: StoryObj<typeof BrandedEmailPreview> = {
    render: () => <PreviewScenario tenantId={7} />,
    parameters: { msw: { handlers: [http.get(PREVIEW_ENDPOINT, () => HttpResponse.json(TENANT))] } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByTestId('branded-email-preview-frame')).toHaveAttribute('srcdoc', TENANT.html);
        await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    },
};
