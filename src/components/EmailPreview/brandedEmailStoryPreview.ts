import type { InviteEmailPreviewDTO } from '../../api/accountInvites/accountInvites';

// Verbatim backend output (see scripts/email-fixtures/README.md). This particular
// fixture is the one whose sample accept URL has the counsellor shape
// (`https://admin.example.org/admin/counsellor-onboarding/SAMPLE-PREVIEW-TOKEN`), which
// is exactly the shape `DPA_FORWARD` renders with: `InviteEmailPreviewService.targetRoleFor`
// maps TENANT_INVITE to tenant onboarding and *everything else* — COUNSELLOR_INVITE and
// DPA_FORWARD alike — to the COUNSELLOR role, whose link is the Admin counsellor
// onboarding route (`InviteAcceptUrlBuilder`).
import brandedFrameDe from './fixtures/invite-long-content-de.html?raw';

/**
 * Offline stand-in for the backend's mail renderer, for Storybook only.
 *
 * Stories must not talk to `POST /service/useradmin/invite-email-templates/preview`:
 * without a handler the request falls through MSW's `onUnhandledRequest: 'bypass'`,
 * hits the Storybook origin, and `EmailKitPreview` renders its "preview could not be
 * rendered" state — so every story that wants to *show* a mail shows an error box
 * instead.
 *
 * The rule from `scripts/email-fixtures/README.md` still holds: the mail frame is
 * owned by ORISO-UserService (`InviteFrameMailRenderer` + the `einladung-freitext`
 * template, the ORISO e-mail frame) and is never authored in this repository. This helper therefore does not build a frame —
 * it takes a checked-in verbatim response and substitutes only the three cells the
 * backend itself substitutes per mail: preheader, subject and content. Header,
 * call-to-action, link hint and **footer** come through untouched, which is what makes
 * the footer in these stories the real house footer (brand name, Datenschutz ·
 * Impressum, "Diese E-Mail gehört zu Ihrer Einladung …") rather than a drawing of
 * one.
 *
 * It is not a second renderer and must not grow into one: if a story needs a frame
 * this fixture cannot show, refresh the fixtures against a running UserService using
 * the recipe in that README instead of extending the substitution here.
 */

/*
 * Unique markers of the per-mail slots inside the checked-in document. The
 * subject appears TWICE in the backend's own layout — `<title>{{SUBJECT}}</title>`
 * in the head as well as the heading cell — so both are substituted; leaving the
 * head behind would keep the fixture's sample subject in the document title.
 */
const DOCUMENT_TITLE = /(<title>)[\s\S]*?(<\/title>)/;
const PREHEADER = /(mso-hide:all;[^>]*>)[\s\S]*?(<\/span>)/;
const SUBJECT_CELL = /(<h1 class="h1"[^>]*>)[\s\S]*?(<\/h1>)/;
const CONTENT_CELL = /(padding:0px 40px 12px 40px;[^>]*>)[\s\S]*?(<\/td>)/;

const escapeHtml = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Mirrors the backend's own link treatment in the content cell. */
const linkify = (escaped: string): string =>
    escaped.replace(
        /https?:\/\/[^\s<]+/g,
        (url) =>
            `<a href="${url}" target="_blank" rel="noopener noreferrer" ` +
            `style="color:#a5000a;text-decoration:underline;word-break:break-word;">${url}</a>`,
    );

/** Plain-text mail body -> the paragraph markup the backend puts in the content cell. */
const bodyToHtml = (body: string): string =>
    body
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${linkify(escapeHtml(paragraph)).replace(/\n/g, '<br>')}</p>`)
        .join('');

/** First 120 characters of the body, the way the backend fills the hidden preheader. */
const preheader = (body: string): string => {
    const flat = body.replace(/\s+/g, ' ').trim();
    return escapeHtml(flat.length > 120 ? `${flat.slice(0, 120)}…` : flat);
};

/**
 * The rendered document a story shows: the checked-in branded frame with this mail's
 * preheader, subject and content in it.
 */
export const renderBrandedEmailStoryPreview = (subject: string, body: string): InviteEmailPreviewDTO => ({
    templateId: null,
    templateName: null,
    kind: 'DPA_FORWARD',
    language: 'de',
    subject,
    html: brandedFrameDe
        .replace(DOCUMENT_TITLE, (_match, open: string, close: string) => `${open}${escapeHtml(subject)}${close}`)
        .replace(PREHEADER, (_match, open: string, close: string) => `${open}${preheader(body)}${close}`)
        .replace(SUBJECT_CELL, (_match, open: string, close: string) => `${open}${escapeHtml(subject)}${close}`)
        .replace(CONTENT_CELL, (_match, open: string, close: string) => `${open}${bodyToHtml(body)}${close}`),
    plainText: `${subject}\n\n${body}`,
    sampleAcceptUrl: 'https://admin.example.org/admin/counsellor-onboarding/SAMPLE-PREVIEW-TOKEN',
});

/** The endpoint a story has to intercept to use the renderer above. */
export const INVITE_EMAIL_PREVIEW_ENDPOINT = '*/service/useradmin/invite-email-templates/preview';
