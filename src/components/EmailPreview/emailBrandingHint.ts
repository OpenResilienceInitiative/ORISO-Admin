/**
 * Why a tenant's mail falls back to the platform wordmark (ORISO-UserService#914).
 *
 * The backend's `EmailBrandingResolver` accepts a tenant logo only when it is an ABSOLUTE
 * http(s) URL: tenant theming may store an inline base64 image, and `data:` URIs are blocked by
 * Gmail and Outlook, so such a logo deliberately degrades to the text wordmark instead of
 * producing a broken image. The Admin mirrors that rule here so the settings page can explain the
 * fallback the preview shows, instead of leaving it looking like a bug.
 */
export type EmailLogoFallbackReason = 'NO_LOGO' | 'LOGO_NOT_REMOTE';

export interface EmailBrandingTheming {
    logo?: string | null;
    associationLogo?: string | null;
}

/**
 * Same acceptance test as `EmailBrandingResolver#firstAbsoluteUrl` — a scheme prefix plus the
 * space/quote guard, deliberately not a `new URL()` parse.
 *
 * The point of this helper is to predict what the backend will do, not to judge the URL. A
 * hostless value such as `https://` therefore counts as "usable" here **because the backend
 * accepts it too** and emails an `<img src="https://">`; the mail does not fall back to the
 * wordmark, so the wordmark hint would be the wrong thing to show. Tightening this check alone
 * would make the Admin describe a state the mail is not in — the exact drift ORISO-UserService#914
 * removes. If that acceptance rule should reject hostless URLs, it has to change in
 * `EmailBrandingResolver` first and be mirrored here afterwards.
 */
export const isRemoteLogoUrl = (value?: string | null): boolean => {
    if (!value) {
        return false;
    }
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();
    return (
        (lower.startsWith('http://') || lower.startsWith('https://')) &&
        !trimmed.includes(' ') &&
        !trimmed.includes('"')
    );
};

/**
 * @returns `null` when the tenant has a logo the mail can use, otherwise why it cannot.
 */
export const resolveEmailLogoFallbackReason = (
    theming?: EmailBrandingTheming | null,
): EmailLogoFallbackReason | null => {
    const candidates = [theming?.logo, theming?.associationLogo];

    if (candidates.some(isRemoteLogoUrl)) {
        return null;
    }
    return candidates.some((candidate) => !!candidate && candidate.trim() !== '') ? 'LOGO_NOT_REMOTE' : 'NO_LOGO';
};
