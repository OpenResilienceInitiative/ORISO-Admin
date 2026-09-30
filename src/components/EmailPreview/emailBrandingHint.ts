/** Eligibility hints only: the backend preview and public asset response remain authoritative. */
export type EmailLogoFallbackReason = 'NO_LOGO' | 'LOGO_NOT_REMOTE';

export interface EmailBrandingTheming {
    logo?: string | null;
    associationLogo?: string | null;
}

const firstPartyUrl = (value: string, applicationUrl: string): string | null => {
    if (!/^https?:\/\/[^/]/i.test(value) || /[\s"<>\\]/.test(value)) return null;
    try {
        const url = new URL(value);
        const app = new URL(applicationUrl);
        return url.origin === app.origin && !url.username && !url.password && !url.search && !url.hash ? value : null;
    } catch {
        return null;
    }
};

const BASE64_BODY = /^[A-Za-z0-9+/]+={0,2}$/;
const DATA_IMAGE_PREFIX = /^data:image\/(?:png|jpe?g|x-icon|vnd\.microsoft\.icon);base64,/i;

/**
 * A declared `data:image/...;base64,` prefix is trusted on its own — nothing legitimate produces
 * that exact prefix by accident. Without it, a bare base64 body must still look like encoded
 * bytes (mixed case + digits) and not a short plain word, otherwise values like "logo" or "test"
 * — which are technically valid base64 characters — would be misread as a stored upload.
 */
const looksLikeStoredUpload = (value: string): boolean => {
    const prefix = value.match(DATA_IMAGE_PREFIX)?.[0];
    if (prefix) return BASE64_BODY.test(value.slice(prefix.length));
    return (
        value.length >= 8 &&
        /[A-Z]/.test(value) &&
        /[a-z]/.test(value) &&
        /[0-9]/.test(value) &&
        BASE64_BODY.test(value)
    );
};

/** A stored upload is served by TenantService, never embedded as a data URI in mail. */
export const resolveEmailLogoUrl = (
    theming: EmailBrandingTheming | null | undefined,
    effectiveTenantId: number | null | undefined,
    applicationUrl: string,
): string | null => {
    const candidates = [theming?.logo, theming?.associationLogo].map((value) => value?.trim() || '');
    const remote = candidates.map((value) => firstPartyUrl(value, applicationUrl)).find(Boolean);
    if (remote) return remote;
    if (effectiveTenantId == null || !Number.isSafeInteger(effectiveTenantId) || effectiveTenantId < 0) return null;
    // Only recognize supported upload encodings. Asset decoding and HTTP availability are checked
    // by the owning service; this helper does not pretend that an eligible image has loaded.
    const stored = candidates.some(looksLikeStoredUpload);
    if (!stored) return null;
    try {
        const app = new URL(applicationUrl);
        if (!['http:', 'https:'].includes(app.protocol) || app.username || app.password) return null;
        return `${app.origin}/service/tenant/public/branding/${effectiveTenantId}/logo`;
    } catch {
        return null;
    }
};

export const resolveEmailLogoFallbackReason = (
    theming: EmailBrandingTheming | null | undefined,
    effectiveTenantId: number | null | undefined,
    applicationUrl: string,
): EmailLogoFallbackReason | null => {
    if (resolveEmailLogoUrl(theming, effectiveTenantId, applicationUrl)) return null;
    return [theming?.logo, theming?.associationLogo].some((value) => !!value?.trim()) ? 'LOGO_NOT_REMOTE' : 'NO_LOGO';
};
