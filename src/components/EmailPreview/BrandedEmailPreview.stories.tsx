import type { Meta, StoryObj } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';
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
    sampleAcceptUrl: 'https://admin.oriso.org/admin/tenant-onboarding/SAMPLE-PREVIEW-TOKEN',
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

/** A tenant with a usable remote logo — the mail shows the logo, the panel stays quiet. */
export const TenantBranding: Story = {
    args: { preview: TENANT, logoFallbackReason: null },
};

/** Tenant without any logo: the mail falls back to the wordmark and the panel says why. */
export const NoTenantLogo: Story = {
    args: { logoFallbackReason: 'NO_LOGO' },
};

/**
 * Tenant with a base64/`data:` logo. It exists, but Gmail and Outlook block embedded image data,
 * so the backend deliberately degrades to the wordmark — the panel explains that specific case
 * instead of leaving it looking like a missing upload.
 */
export const LogoNotUsableInEmail: Story = {
    args: { logoFallbackReason: 'LOGO_NOT_REMOTE' },
};

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
 */
export const Connected: StoryObj<typeof BrandedEmailPreview> = {
    render: () => <BrandedEmailPreview />,
    parameters: {
        a11y: { options: { iframes: false } },
        msw: {
            handlers: [
                http.get(PREVIEW_ENDPOINT, async () => {
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
