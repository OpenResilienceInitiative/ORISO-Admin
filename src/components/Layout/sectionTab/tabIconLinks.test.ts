import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { applyBrandingFavicon } from '../../../utils/applyBrandingFavicon';
import { restoreDefaultTabIcon, showSectionTabIcon } from './tabIconLinks';

const SVG = 'data:image/svg+xml,%3Csvg%2F%3E';
const PNG = 'data:image/png;base64,AAAA';
const BRAND = 'data:image/vnd.microsoft.icon;base64,AAAB';

// The five icon links index.html declares.
const INDEX_HTML_ICONS = [
    '<link rel="icon" href="/favicon.ico" />',
    '<link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png" />',
    '<link rel="icon" type="image/png" sizes="192x192" href="/android-icon-192x192.png" />',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />',
    '<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />',
].join('');

const iconLinks = () => Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"));
const snapshot = () =>
    iconLinks().map((link) =>
        Array.from(link.attributes)
            .map((attr) => `${attr.name}=${attr.value}`)
            .sort()
            .join(' '),
    );

describe('section tab icon links', () => {
    let original: string[];

    beforeEach(() => {
        document.head.innerHTML = INDEX_HTML_ICONS;
        original = snapshot();
    });

    it('swaps every default icon for the section SVG and adds a PNG fallback before them', () => {
        showSectionTabIcon({ svgHref: SVG, pngHref: PNG });

        const [png, ...svgs] = iconLinks();
        expect(png.getAttribute('href')).toBe(PNG);
        expect(png.getAttribute('type')).toBe('image/png');
        expect(png.getAttribute('sizes')).toBe('32x32');
        expect(svgs).toHaveLength(5);
        svgs.forEach((link) => {
            expect(link.getAttribute('href')).toBe(SVG);
            expect(link.getAttribute('type')).toBe('image/svg+xml');
            expect(link.getAttribute('sizes')).toBe('any');
        });
        // The apple-touch-icon is not a tab icon and stays untouched.
        expect(document.querySelector("link[rel='apple-touch-icon']")!.getAttribute('href')).toBe(
            '/apple-icon-57x57.png',
        );
    });

    it('restores all five default links exactly and removes the fallback', () => {
        showSectionTabIcon({ svgHref: SVG, pngHref: PNG });
        showSectionTabIcon({ svgHref: `${SVG}2`, pngHref: PNG });
        restoreDefaultTabIcon();

        expect(snapshot()).toEqual(original);
    });

    it('drops a stale PNG when the next section has none yet', () => {
        showSectionTabIcon({ svgHref: SVG, pngHref: PNG });
        showSectionTabIcon({ svgHref: `${SVG}2`, pngHref: null });
        expect(iconLinks().map((link) => link.getAttribute('href'))).toEqual(Array(5).fill(`${SVG}2`));
    });

    it('keeps a tenant favicon that arrives while a section icon shows as the new default', () => {
        showSectionTabIcon({ svgHref: SVG, pngHref: PNG });
        applyBrandingFavicon(BRAND);

        expect(iconLinks().map((link) => link.getAttribute('href'))).toEqual([PNG, ...Array(5).fill(SVG)]);

        restoreDefaultTabIcon();
        iconLinks().forEach((link) => {
            expect(link.getAttribute('href')).toBe(BRAND);
            expect(link.hasAttribute('type')).toBe(false);
            expect(link.hasAttribute('sizes')).toBe(false);
        });
        expect(iconLinks()).toHaveLength(5);
    });

    it('applies the branding favicon as before when no section icon shows', () => {
        applyBrandingFavicon(BRAND);
        expect(iconLinks().map((link) => link.getAttribute('href'))).toEqual(Array(5).fill(BRAND));
    });

    it('is a no-op to restore when no section icon was shown', () => {
        restoreDefaultTabIcon();
        expect(snapshot()).toEqual(original);
    });

    it('creates an icon link when the page declared none, and removes it again', () => {
        document.head.innerHTML = '';
        showSectionTabIcon({ svgHref: SVG, pngHref: null });
        expect(iconLinks().map((link) => link.getAttribute('href'))).toEqual([SVG]);
        restoreDefaultTabIcon();
        expect(iconLinks()).toHaveLength(0);
    });
});
