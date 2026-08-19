/**
 * The two values the admin invite preview still needs from the ORISO
 * transactional e-mail design system.
 *
 * This file used to be a full client-side port of that system, because the
 * preview pane rendered the mail itself. It no longer does: `EmailKitPreview`
 * asks the backend for the real thing (`POST
 * /service/useradmin/invite-email-templates/preview`) and shows what the send
 * path would actually produce, so preview and delivered mail cannot drift
 * apart. The markup builders that port carried — logo lockup, header bar,
 * title group, assurance line, footer, card, shell, document — had no callers
 * left and were removed; the source of truth for that markup is
 * `ORISO-UserService/src/main/resources/email/layout/`.
 *
 * What remains is deliberately small:
 *
 * - {@link emailColor} — the frame the preview paints *around* the returned
 *   mail (canvas and outline), so the surrounding chrome matches the mail's
 *   own palette.
 * - {@link safeLanguageTag} — the guard from #751. A template's language tag
 *   reaches a `lang` attribute, so anything outside BCP-47 must be rejected
 *   rather than escaped.
 */

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

const BCP47_PATTERN = /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/;

/** Language used when a template carries no valid tag. */
export const FALLBACK_EMAIL_LANGUAGE = 'de';

/** Returns the trimmed tag if it is a well-formed BCP-47 value, else the fallback. */
export const safeLanguageTag = (value: string | undefined, fallback = FALLBACK_EMAIL_LANGUAGE): string => {
    const trimmed = value?.trim() ?? '';
    return BCP47_PATTERN.test(trimmed) ? trimmed : fallback;
};
