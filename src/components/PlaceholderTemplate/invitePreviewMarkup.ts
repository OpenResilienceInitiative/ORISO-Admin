/**
 * Composes the invite-mail preview document out of the ported e-mail kit
 * (`emailKit.ts`) — the admin-side equivalent of what ORISO-Frontend's
 * `Email/Pages/EinladungTraeger` story renders: branded header bar, white
 * card with accent rule + headline + body copy, assurance line, footer.
 *
 * Preview-specific additions on top of the kit:
 *   - any `{{token}}` still present after sample substitution is highlighted
 *     as a chip (the module's visual contract for "unresolved placeholder");
 *   - empty subject/body render their hint texts in the muted colour, so the
 *     frame never looks broken while the admin is still typing.
 */

import {
    EmailKitBrand,
    emailAssurance,
    emailBlock,
    emailBodyTextStyle,
    emailCard,
    emailColor,
    emailEscape,
    emailFooter,
    emailHeaderBar,
    emailHeadline,
    emailKitDocument,
    emailShell,
    emailSpace,
    emailTitleGroup,
} from './emailKit';

/**
 * Sample sender identity for the preview, ported from the frontend kit's
 * `emailSampleBrand` (ORISO-Frontend `src/emails/kit/emailTokens.ts`). The
 * colours are intentionally absent — they come from the tenant theme at
 * render time.
 */
export const ADMIN_EMAIL_SAMPLE_BRAND: Omit<EmailKitBrand, 'primaryColor' | 'accentColor'> = {
    platformName: 'Online-Beratung',
    orgName: 'Caritasverband für die Diözese Mainz e. V.',
    orgAddress: 'Bahnhofstraße 6, 55116 Mainz',
    contactLine: 'kontakt@beratung.example.org · 06131 0000-0',
};

export interface InvitePreviewStrings {
    /** Shown as the headline while the subject field is empty. */
    subjectHint: string;
    /** Shown as the body while the body field is empty. */
    bodyHint: string;
    /** Closing fine print inside the card (the encryption/security assurance). */
    assurance: string;
    /** Footer sentence naming the operator, e.g. "… ist ein Angebot von …". */
    offeredBy: string;
    /** Footer legal-link labels, e.g. Datenschutz / Impressum. */
    linkLabels: string[];
    /** Footer do-not-reply note. */
    automatedNote: string;
}

export interface InvitePreviewOptions {
    /** Subject with known tokens already substituted (unknown ones stay `{{key}}`). */
    subject: string;
    /** Body with known tokens already substituted (unknown ones stay `{{key}}`). */
    body: string;
    brand: EmailKitBrand;
    strings: InvitePreviewStrings;
    /** BCP-47 tag for `<html lang>`. */
    lang: string;
}

const TOKEN_PATTERN = /\{\{[^{}]+\}\}/g;

/** 8% tint of a `#rrggbb` colour for the token-chip background. */
const tint = (hex: string): string => {
    const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
    if (!match) {
        return '#f5eded';
    }
    return `rgba(${parseInt(match[1].slice(0, 2), 16)},${parseInt(match[1].slice(2, 4), 16)},${parseInt(
        match[1].slice(4, 6),
        16,
    )},0.08)`;
};

/** Wraps every `{{token}}` left in (already escaped) text in a highlight chip. */
export const highlightUnknownTokens = (escapedText: string, brand: EmailKitBrand): string =>
    escapedText.replace(
        TOKEN_PATTERN,
        (token) =>
            `<code data-unknown-token style="padding:1px 5px;border-radius:4px;` +
            `background:${tint(brand.primaryColor)};color:${brand.primaryColor};` +
            `font-family:SFMono-Regular,Consolas,'Liberation Mono',monospace;` +
            `font-size:14px;font-weight:700;">${token}</code>`,
    );

/**
 * Body copy: blank lines separate paragraphs (each its own kit block, like
 * `emailProse`), single newlines become `<br>`. `word-break` keeps a pasted
 * invite URL from widening the 320px layout.
 */
const proseRows = (body: string, brand: EmailKitBrand, strings: InvitePreviewStrings): string => {
    const G = emailSpace.gutter;
    if (!body.trim()) {
        return emailBlock(emailEscape(strings.bodyHint), {
            padding: [0, G, 28, G],
            style: emailBodyTextStyle(emailColor.onSurfaceVariant),
        });
    }
    const paragraphs = body.split(/\n{2,}/);
    return paragraphs
        .map((paragraph, index) =>
            emailBlock(highlightUnknownTokens(emailEscape(paragraph), brand).replace(/\n/g, '<br>'), {
                padding: [0, G, index === paragraphs.length - 1 ? 28 : 16, G],
                style: `${emailBodyTextStyle()};word-break:break-word`,
            }),
        )
        .join('');
};

/** Renders the complete preview document for the invite e-mail. */
export const renderInviteEmailPreviewHtml = ({ subject, body, brand, strings, lang }: InvitePreviewOptions): string => {
    const headline = subject.trim()
        ? emailHeadline(highlightUnknownTokens(emailEscape(subject), brand))
        : emailHeadline(emailEscape(strings.subjectHint), { muted: true });

    const cardRows =
        emailTitleGroup(headline, brand) + proseRows(body, brand, strings) + emailAssurance(strings.assurance);

    const bodyRows = emailShell(
        emailHeaderBar(brand) +
            emailCard(cardRows) +
            emailFooter(
                {
                    offeredBy: strings.offeredBy,
                    linkLabels: strings.linkLabels,
                    automatedNote: strings.automatedNote,
                },
                brand,
            ),
    );

    return emailKitDocument({ lang, subject: subject.trim() || strings.subjectHint, body: bodyRows });
};
