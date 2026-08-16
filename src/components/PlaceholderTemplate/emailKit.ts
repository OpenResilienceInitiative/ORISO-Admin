/**
 * Minimal port of the ORISO transactional e-mail design system, for the admin
 * preview pane only.
 *
 * Source of truth: ORISO-Frontend `src/emails/kit/` (merged with PR #881) —
 * specifically `emailTokens.ts`, `emailAtoms.ts`, `emailMolecules.ts`,
 * `emailOrganisms.ts` and `emailDocument.ts`. Admin cannot import cross-repo,
 * hence this copy; keep the values and markup in sync with the frontend kit
 * when the design changes there.
 *
 * House rules (same as the source kit): tables for layout, inline styles only,
 * every colour and size from the token block below — the one exception is the
 * `class` hook, because the `<style>` media query in {@link emailKitDocument}
 * is the only way an e-mail can react to viewport width.
 *
 * Deliberate deviation: the logo lockup renders a tenant-coloured initial
 * instead of the kit's `<img>` — the admin preview has no per-tenant logo URL,
 * and a broken image in the header would read as a bug in the template.
 */

/* ------------------------------------------------------------------------- */
/* Tokens (ported 1:1 from emailTokens.ts)                                   */
/* ------------------------------------------------------------------------- */

export const emailColor = {
    /** Page background behind the card. */
    canvas: '#f2efef',
    /** The card itself. */
    surface: '#ffffff',
    outline: '#e0dada',
    onSurface: '#1d1b1b',
    onSurfaceVariant: '#5c5555',
    /** Footer fine print. */
    onSurfaceFaint: '#8a8080',
    /** Separator dots between footer links. */
    separator: '#c4bcbc',
    onPrimary: '#ffffff',
} as const;

export const emailFontStack = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export const emailType = {
    headline: { size: 24, line: 32, weight: 500, mobile: { size: 22, line: 30 } },
    body: { size: 16, line: 26 },
    label: { size: 14, line: 20, tracking: 0.25 },
    caption: { size: 12, line: 18 },
    /** Wordmark next to the logo. */
    brand: { size: 16, line: 24, weight: 600, tracking: 0.15 },
    orgName: { size: 13, line: 20, weight: 600 },
} as const;

export const emailSpace = {
    /** Horizontal gutter inside the 600px column. */
    gutter: 40,
    /** Same gutter below the mobile breakpoint (applied via `.sp`). */
    gutterMobile: 24,
    /** Padding of the outer canvas cell. */
    edge: { top: 32, side: 12, bottom: 48 },
    edgeMobile: { top: 24, side: 8, bottom: 32 },
} as const;

export const emailRadius = {
    card: 24,
    logo: 8,
    pill: 999,
} as const;

export const emailLayout = {
    /** Canonical e-mail column width. */
    width: 600,
    /** Below this width the stacking media query kicks in. */
    mobileBreakpoint: 620,
    logoSize: 36,
} as const;

/** Brand values the preview fills per tenant (colours) and with samples (text). */
export interface EmailKitBrand {
    platformName: string;
    orgName: string;
    orgAddress: string;
    contactLine: string;
    primaryColor: string;
    accentColor: string;
}

/**
 * The kit inlines brand colours into quoted HTML/style attributes, so a value
 * like `#fff" onmouseover="…` would break out of the attribute it is rendered
 * into (PR #727 post-merge review). This grammar admits only what a colour can
 * be — hex, rgb()/rgba()/hsl()/hsla() with numeric arguments, `var(--token)`
 * or a bare keyword — and in particular nothing with quotes, angle brackets or
 * statement separators.
 */
const SAFE_COLOR_PATTERN =
    /^(#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\(\s*[0-9.,%\sdeg/-]*\)|var\(--[A-Za-z0-9_-]+\)|[A-Za-z]{1,30})$/;

/** Fallback when a brand colour fails {@link SAFE_COLOR_PATTERN} — the house primary. */
export const FALLBACK_EMAIL_BRAND_COLOR = '#a5000a';

/** Returns the trimmed colour if it matches the safe grammar, else the fallback. */
export const safeEmailColor = (value: string, fallback: string = FALLBACK_EMAIL_BRAND_COLOR): string => {
    const trimmed = value.trim();
    return SAFE_COLOR_PATTERN.test(trimmed) ? trimmed : fallback;
};

/**
 * BCP-47 language tag: a primary subtag of 2–8 letters plus alphanumeric subtags.
 * The template language is free text an admin types into the "Sprache" field, and
 * it lands unescaped in `<html lang="…">`, so a value like
 * `de"><img src="https://example.test/x">` would break out of the attribute
 * (#751 review). A language tag has a narrow legal grammar — anything outside it
 * is a bug or an attack, not something to sanitise into shape, so this rejects
 * rather than escapes.
 */
const BCP47_PATTERN = /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/;

/** Language used when a template carries no valid tag. */
export const FALLBACK_EMAIL_LANGUAGE = 'de';

/** Returns the trimmed tag if it is a well-formed BCP-47 value, else the fallback. */
export const safeLanguageTag = (value: string | undefined, fallback = FALLBACK_EMAIL_LANGUAGE): string => {
    const trimmed = value?.trim() ?? '';
    return BCP47_PATTERN.test(trimmed) ? trimmed : fallback;
};

/**
 * Normalises a brand at the kit boundary: every colour is forced through
 * {@link safeEmailColor} before any markup interpolates it. Text fields need
 * no treatment here — they are escaped per-use via {@link emailEscape}.
 */
export const sanitizeEmailKitBrand = (brand: EmailKitBrand): EmailKitBrand => ({
    ...brand,
    primaryColor: safeEmailColor(brand.primaryColor),
    accentColor: safeEmailColor(brand.accentColor),
});

/* ------------------------------------------------------------------------- */
/* Atoms (ported from emailAtoms.ts)                                         */
/* ------------------------------------------------------------------------- */

/** Escapes the five XML specials — braces stay untouched so `{{tokens}}` survive. */
export const emailEscape = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const font = (size: number, line: number, extra: { weight?: number; tracking?: number; color?: string } = {}): string =>
    [
        `font-family:${emailFontStack}`,
        `font-size:${size}px`,
        `line-height:${line}px`,
        extra.weight ? `font-weight:${extra.weight}` : '',
        extra.tracking ? `letter-spacing:${extra.tracking}px` : '',
        extra.color ? `color:${extra.color}` : '',
    ]
        .filter(Boolean)
        .join(';');

export interface EmailBlockOptions {
    /** `top right bottom left`, in px. */
    padding: [number, number, number, number];
    className?: string;
    align?: 'left' | 'center';
    /** Typography for text blocks, appended to the cell's inline style. */
    style?: string;
}

/** Wraps a fragment in the `<tr><td>` that carries its padding. */
export const emailBlock = (content: string, { padding, className, align, style }: EmailBlockOptions): string => {
    const [top, right, bottom, left] = padding;
    const classes = ['sp', className].filter(Boolean).join(' ');
    return (
        `<tr><td class="${classes}"${align ? ` align="${align}"` : ''} ` +
        `style="padding:${top}px ${right}px ${bottom}px ${left}px;` +
        `${style ? `${style};` : ''}">${content}</td></tr>`
    );
};

/** The short accent stroke above the headline (a spacer table, not an image). */
export const emailAccentRule = (brand: EmailKitBrand): string =>
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="44" style="width:44px;">' +
    `<tr><td height="4" bgcolor="${brand.accentColor}" ` +
    `style="height:4px;line-height:4px;font-size:0;border-radius:${emailRadius.pill}px;` +
    `background-color:${brand.accentColor};">&nbsp;</td></tr></table>`;

/** Headline markup. `muted` renders the empty-state hint in the variant colour. */
export const emailHeadline = (text: string, { muted = false }: { muted?: boolean } = {}): string =>
    `<h1 class="h1" style="margin:0;${font(emailType.headline.size, emailType.headline.line, {
        weight: emailType.headline.weight,
        color: muted ? emailColor.onSurfaceVariant : emailColor.onSurface,
    })};mso-line-height-rule:exactly;">${text}</h1>`;

/** Body copy styling — the `<td>` carries it. */
export const emailBodyTextStyle = (color: string = emailColor.onSurface): string =>
    `${font(emailType.body.size, emailType.body.line, { color })};mso-line-height-rule:exactly`;

/** Fine print: the encryption assurance and the footer. */
export const emailCaptionStyle = (): string =>
    font(emailType.caption.size, emailType.caption.line, { color: emailColor.onSurfaceVariant });

export const emailDivider = (): string =>
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
    `<tr><td height="1" bgcolor="${emailColor.outline}" ` +
    'style="height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr></table>';

/**
 * Logo plus wordmark. Adapted from `emailLogoLockup`: the tenant-coloured
 * initial replaces the kit's `<img>` (see the file header).
 */
export const emailLogoLockup = (brand: EmailKitBrand): string =>
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    `<td width="${emailLayout.logoSize}" height="${emailLayout.logoSize}" align="center" valign="middle" ` +
    `bgcolor="${brand.primaryColor}" style="width:${emailLayout.logoSize}px;height:${emailLayout.logoSize}px;` +
    `background-color:${brand.primaryColor};border-radius:${emailRadius.logo}px;` +
    `${font(18, emailLayout.logoSize, { weight: 700, color: emailColor.onPrimary })};text-align:center;">` +
    `${emailEscape(brand.platformName.charAt(0).toUpperCase())}</td>` +
    `<td width="12" style="width:12px;font-size:0;line-height:0;">&nbsp;</td>` +
    `<td valign="middle" style="${font(emailType.brand.size, emailType.brand.line, {
        weight: emailType.brand.weight,
        tracking: emailType.brand.tracking,
        color: emailColor.onSurface,
    })};">${emailEscape(brand.platformName)}</td>` +
    '</tr></table>';

/** A footer link, inert in the preview (a `<span>` styled like the kit's `<a>`). */
export const emailFooterLink = (label: string): string =>
    `<span style="color:${emailColor.onSurfaceVariant};text-decoration:underline;white-space:nowrap;">` +
    `${emailEscape(label)}</span>`;

export const emailFooterSeparator = (): string => `<span style="color:${emailColor.separator};">&nbsp; · &nbsp;</span>`;

/* ------------------------------------------------------------------------- */
/* Molecules (ported from emailMolecules.ts)                                 */
/* ------------------------------------------------------------------------- */

const G = emailSpace.gutter;

/** Logo and platform name, sitting above the card on the bare canvas. */
export const emailHeaderBar = (brand: EmailKitBrand): string =>
    emailBlock(emailLogoLockup(brand), { padding: [0, G, 20, G] });

/** The accent stroke plus the (pre-rendered) headline it belongs to. */
export const emailTitleGroup = (headlineMarkup: string, brand: EmailKitBrand): string =>
    emailBlock(emailAccentRule(brand), { padding: [36, G, 0, G] }) +
    emailBlock(headlineMarkup, { padding: [18, G, 14, G] });

/** Closing fine print inside the card, preceded by the divider. */
export const emailAssurance = (text: string): string =>
    emailBlock(emailDivider(), { padding: [28, G, 0, G] }) +
    emailBlock(emailEscape(text), { padding: [16, G, 32, G], style: emailCaptionStyle() });

export interface EmailKitFooterContent {
    /** e.g. "Online-Beratung ist ein Angebot von {orgName}." */
    offeredBy: string;
    linkLabels: string[];
    /** e.g. "Diese E-Mail wurde automatisch versendet…" */
    automatedNote: string;
}

/** Sender identity, legal links and the do-not-reply note, below the card. */
export const emailFooter = (footer: EmailKitFooterContent, brand: EmailKitBrand): string => {
    const links = footer.linkLabels.map(emailFooterLink).join(emailFooterSeparator());
    return emailBlock(
        `<div style="color:${emailColor.onSurface};font-weight:${emailType.orgName.weight};` +
            `font-size:${emailType.orgName.size}px;line-height:${emailType.orgName.line}px;">${emailEscape(
                brand.orgName,
            )}</div>` +
            `<div style="padding-top:2px;">${emailEscape(brand.orgAddress)}</div>` +
            `<div>${emailEscape(brand.contactLine)}</div>` +
            `<div style="padding-top:14px;">${emailEscape(footer.offeredBy)}</div>` +
            `<div class="flinks" style="padding-top:14px;">${links}</div>` +
            `<div style="padding-top:14px;color:${emailColor.onSurfaceFaint};">${emailEscape(
                footer.automatedNote,
            )}</div>`,
        { padding: [28, G, 0, G], style: `${emailCaptionStyle()};word-break:break-word` },
    );
};

/* ------------------------------------------------------------------------- */
/* Organisms (ported from emailOrganisms.ts)                                 */
/* ------------------------------------------------------------------------- */

/** The white card that holds the message. */
export const emailCard = (rows: string): string =>
    `${
        '<tr><td style="padding:0;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
        `bgcolor="${emailColor.surface}" style="background-color:${emailColor.surface};` +
        `border-radius:${emailRadius.card}px;border:1px solid ${emailColor.outline};">`
    }${rows}</table></td></tr>`;

/** Canvas plus centred 600px column (`.wrap` releases the width on phones). */
export const emailShell = (rows: string): string =>
    `${
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
        `style="background-color:${emailColor.canvas};">` +
        `<tr><td class="edge" align="center" style="padding:${emailSpace.edge.top}px ${emailSpace.edge.side}px ` +
        `${emailSpace.edge.bottom}px ${emailSpace.edge.side}px;">` +
        `<table role="presentation" class="wrap" width="${emailLayout.width}" cellpadding="0" cellspacing="0" border="0" ` +
        `style="width:${emailLayout.width}px;max-width:${emailLayout.width}px;">`
    }${rows}</table></td></tr></table>`;

/* ------------------------------------------------------------------------- */
/* Document (ported from emailDocument.ts)                                   */
/* ------------------------------------------------------------------------- */

const responsiveStyles = (): string =>
    `@media only screen and (max-width:${emailLayout.mobileBreakpoint}px){` +
    '.wrap{width:100% !important;max-width:100% !important}' +
    `.edge{padding:${emailSpace.edgeMobile.top}px ${emailSpace.edgeMobile.side}px ` +
    `${emailSpace.edgeMobile.bottom}px ${emailSpace.edgeMobile.side}px !important}` +
    `.sp{padding-left:${emailSpace.gutterMobile}px !important;padding-right:${emailSpace.gutterMobile}px !important}` +
    `.h1{font-size:${emailType.headline.mobile.size}px !important;` +
    `line-height:${emailType.headline.mobile.line}px !important}` +
    '.flinks span{display:inline-block !important;white-space:normal !important;padding:3px 0 !important}' +
    '}';

const resetStyles = (): string =>
    'img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;max-width:100%}' +
    'table{border-collapse:collapse}' +
    'a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;' +
    'font-size:inherit !important;font-family:inherit !important;font-weight:inherit !important;' +
    'line-height:inherit !important}';

export interface EmailKitDocumentOptions {
    /** BCP-47 language tag for `<html lang>`. */
    lang: string;
    /** Goes into `<title>`, which is what most clients use as the subject. */
    subject: string;
    /** Rows already wrapped by {@link emailShell}. */
    body: string;
}

export const emailKitDocument = ({ lang, subject, body }: EmailKitDocumentOptions): string =>
    // `lang` lands in a quoted attribute, so it is validated at the sink itself —
    // no caller can reach the attribute with unchecked input (#751 review).
    `<!DOCTYPE html>
<html lang="${safeLanguageTag(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${emailEscape(subject)}</title>
<style>
  ${resetStyles()}
  ${responsiveStyles()}
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${emailColor.canvas};` +
    `-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
${body}
</body>
</html>
`;
