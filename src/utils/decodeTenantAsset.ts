const NUMERIC_ENTITY = /&#(x[0-9a-f]+|\d+);/gi;

/**
 * Undo the HTML encoding TenantService applies to every stored string, for
 * values that are URLs rather than markup — the branding assets (`theming.logo`,
 * `theming.favicon`, `theming.associationLogo`).
 *
 * TenantService stores `+` as `&#43;` and `=` as `&#61;` (see {@link decodeHTML}
 * for the same quirk on tenant names). Base64 payloads are full of both, so a
 * stored logo comes back as
 *
 *   data:image/png;base64,iVBORw0KGgo…&#43;…&#43;…&#61;
 *
 * which is not a decodable data URL: the browser answers `ERR_INVALID_URL`, the
 * `<img>` fires `onError`, and the stage panel simply drops the logo — the
 * branding looks unimplemented rather than broken. The admin's own upload
 * preview never showed this because it already decodes (`FormFileUploaderField`).
 *
 * Deliberately NOT implemented via `innerHTML` like {@link decodeHTML}: these
 * values are pasted straight into `img[src]` / `link[rel=icon]`, so they must
 * never take a detour through markup parsing. A plain numeric-entity decode is
 * both safer and testable outside a DOM.
 */
export const decodeTenantAsset = (value?: string | null): string | undefined => {
    if (!value) return undefined;

    return value
        .replace(NUMERIC_ENTITY, (_match, code: string) =>
            String.fromCharCode(
                code[0].toLowerCase() === 'x' ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10),
            ),
        )
        .replace(/&amp;/g, '&');
};

/**
 * The three stored strings that are URLs rather than markup. Every seam that
 * hands tenant theming to the UI has to decode exactly these — see
 * {@link decodeTenantBrandingAssets}.
 */
export const BRANDING_ASSETS = ['logo', 'favicon', 'associationLogo'] as const;

/**
 * Decode the branding assets of a tenant response, whichever endpoint produced
 * it. Both the public and the authenticated seam need this: the public one
 * feeds anonymous theming, the authenticated one feeds the tenant favicon
 * override. Having it in one place is what keeps them from drifting apart
 * again — they already did once, which silently killed the override.
 *
 * Returns the input unchanged when it carries no `theming`, and never invents
 * keys the response did not have.
 */
export const decodeTenantBrandingAssets = <T extends { theming?: Record<string, unknown> }>(result: T): T => {
    if (!result?.theming) {
        return result;
    }

    const theming = { ...result.theming };
    BRANDING_ASSETS.forEach((asset) => {
        if (typeof theming[asset] === 'string') {
            theming[asset] = decodeTenantAsset(theming[asset] as string);
        }
    });

    return { ...result, theming };
};

export default decodeTenantAsset;
