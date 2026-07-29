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

/** Same acceptance test as `EmailBrandingResolver#firstAbsoluteUrl`. */
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
