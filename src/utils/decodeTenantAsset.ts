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

export default decodeTenantAsset;
