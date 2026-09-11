/**
 * Point every declared tab icon at the tenant/platform branding favicon.
 *
 * `index.html` ships FIVE `rel="icon"` links: the bare `favicon.ico` plus four
 * sized PNG variants (192/96/32/16). The previous implementation rewrote only
 * `document.querySelector("link[rel='icon']")` — the first one — so the four
 * sized links kept pointing at the built-in placeholder. Browsers pick the icon
 * whose declared `sizes` best matches the tab, i.e. `favicon-32x32.png`, which
 * is why an uploaded favicon never showed up even though the data URL was
 * applied correctly to the first link.
 *
 * `sizes`/`type` are stripped along the way: they described the placeholder
 * PNGs, and leaving them on a link that now serves an `.ico` data URL would
 * hand the browser a wrong type hint.
 */
export const applyBrandingFavicon = (favicon: string): void => {
    document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']").forEach((link) => {
        link.setAttribute('href', favicon);
        link.removeAttribute('sizes');
        link.removeAttribute('type');
    });
};

export default applyBrandingFavicon;
