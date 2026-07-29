import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmailPreviewFrame } from './EmailPreviewFrame';

// The fixtures are the backend's own output — see `fixtures/MANIFEST.txt` and
// `scripts/email-fixtures/README.md`. They are imported raw and rendered untouched.
import invitePlatformDe from './fixtures/invite-platform-de.html?raw';
import invitePlatformEn from './fixtures/invite-platform-en.html?raw';
import inviteTenantLogoDe from './fixtures/invite-tenant-logo-de.html?raw';
import inviteLongContentDe from './fixtures/invite-long-content-de.html?raw';
import inviteShortContentDe from './fixtures/invite-short-content-de.html?raw';
import notificationNoCtaDe from './fixtures/notification-no-cta-de.html?raw';

/**
 * # Branded e-mail layout
 *
 * The canonical HTML layout of every ORISO account-invite mail
 * (ORISO-UserService#914, backend PR #915). **This repository owns none of that markup.** The
 * backend renders it once (`BrandedEmailLayoutRenderer` + `email/layout/*` resources) and the
 * Admin only ever displays the result — here from checked-in fixtures, in the app from the live
 * preview endpoint.
 *
 * ## Where the fixtures come from
 *
 * `src/components/EmailPreview/fixtures/*.html` are verbatim `html` fields of
 * `GET /useradmin/invite-email-templates/preview` responses. Nothing is hand-written or
 * hand-edited: a story that disagrees with production means the fixture is stale, never that the
 * two implementations drifted — there is only one implementation.
 *
 * ## Refreshing them
 *
 * Against a running UserService:
 *
 * ```bash
 * curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: 1" \
 *   "$USERSERVICE/service/useradmin/invite-email-templates/preview" \
 *   | jq -r .html > src/components/EmailPreview/fixtures/invite-platform-de.html
 * ```
 *
 * Vary the state by appending a query string — `?tenant_id=<id with a logo>`, `?language=en`,
 * `?templateId=<long body>` — and `&` for any further parameter.
 * Full recipe, including how the fixtures in this branch were produced before the endpoint was
 * deployed anywhere, in `scripts/email-fixtures/README.md`.
 *
 * ## A11y note
 *
 * The document inside the frame is *documentation of an e-mail*, not app UI — it is authored for
 * Outlook's table renderer, not for the browser, and this repo cannot change it. axe therefore
 * does not descend into the frames on these stories (`iframes: false`); the a11y contract that
 * applies here is the Admin chrome around the frame.
 */
const meta = {
    title: 'Organisms/EmailPreview/BrandedEmailLayout',
    component: EmailPreviewFrame,
    parameters: {
        layout: 'padded',
        // The frame content is a sandboxed, opaque-origin mail document owned by the backend.
        a11y: { options: { iframes: false } },
    },
    args: {
        title: 'Branded invite e-mail',
        height: 720,
    },
} satisfies Meta<typeof EmailPreviewFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Platform branding, German frame. This is the endpoint's zero-parameter response — the built-in
 * sample invite. No tenant logo is configured, so the header falls back to the **text wordmark**
 * tinted with the accent colour.
 *
 * Fixture: `invite-platform-de.html` — `GET …/preview?language=de`.
 */
export const PlatformWordmark: Story = {
    args: { html: invitePlatformDe },
};

/**
 * Tenant branding: `theming.logo` is an absolute https URL, so the header renders the **logo**
 * instead of the wordmark, and `theming.primaryColor` (`#f8e71c`) drives the top bar and the
 * button. Note the contrast guard — the yellow button gets near-black label text, not white.
 *
 * The fixture's logo host (`cdn.example.org`) is a sample host and does not resolve, so the
 * `alt` text renders in its place. That is deliberately what a recipient sees before they allow
 * remote images: this story documents the header *slot* and its alt fallback. To see a real
 * tenant logo, use the live preview on `/admin/theme-settings/smtp`.
 *
 * Fixture: `invite-tenant-logo-de.html` — `GET …/preview?tenant_id=7&language=de`.
 */
export const TenantLogo: Story = {
    args: { html: inviteTenantLogoDe },
};

/**
 * Long authored content: headings, an ordered and an unordered list, a blockquote and a bare URL
 * that the backend linkifies (#913). Shows that the card grows with the content and that the
 * call-to-action stays below the body rather than floating.
 *
 * Fixture: `invite-long-content-de.html` — `GET …/preview?templateId=5`.
 */
export const LongContent: Story = {
    args: { html: inviteLongContentDe, height: 1100 },
};

/**
 * A one-line body — the shortest realistic invite. The frame, the button and the footer keep
 * their proportions instead of collapsing.
 *
 * Fixture: `invite-short-content-de.html` — `GET …/preview?templateId=6`.
 */
export const ShortContent: Story = {
    args: { html: inviteShortContentDe, height: 560 },
};

/**
 * English frame wording: `lang="en"`, "Accept invitation", "Imprint"/"Privacy" and the English
 * automated-message footer. Only the *frame* is localised — the body itself is authored per
 * language in the template rows, which is why the sample body stays German here.
 *
 * Fixture: `invite-platform-en.html` — `GET …/preview?language=en`.
 */
export const EnglishFrame: Story = {
    args: { html: invitePlatformEn },
};

/**
 * **Call-to-action present** (the invite default) versus **absent**. `BrandedEmailLayoutRenderer`
 * drops the whole button block *and* the "copy this link" fallback line when there is no primary
 * action, which is the shape used by informational mails
 * (`InviteMailDispatchService#send` without an action URL).
 *
 * The preview endpoint always carries an invite link, so this state cannot be curl'ed today — the
 * fixture was produced through the same renderer via the dispatcher's no-action path (see
 * `scripts/email-fixtures/README.md`). If the endpoint later grows a flag for it, regenerate this
 * fixture from the endpoint like the others.
 *
 * Fixture: `notification-no-cta-de.html`.
 */
export const CallToActionAbsent: Story = {
    args: { html: notificationNoCtaDe, height: 520 },
};

/** The same invite with the call-to-action — side-by-side counterpart of `CallToActionAbsent`. */
export const CallToActionPresent: Story = {
    args: { html: inviteShortContentDe, height: 560 },
};

/**
 * 390px viewport — the narrowest common phone. The layout's single `max-width: 620px` media query
 * widens the 600px card to 100% and reduces the horizontal padding; the copy-paste fallback URL
 * wraps instead of forcing horizontal scroll.
 *
 * Fixture: `invite-platform-de.html` (same document, narrower frame).
 */
export const MobileFrame390: Story = {
    args: { html: invitePlatformDe, width: 390, height: 760 },
};
