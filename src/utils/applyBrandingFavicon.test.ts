import { describe, expect, it, beforeEach } from 'vitest';
import { applyBrandingFavicon } from './applyBrandingFavicon';

const ICON = 'data:image/vnd.microsoft.icon;base64,AAABAAEA';

const iconLinks = () => Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"));

describe('applyBrandingFavicon', () => {
    beforeEach(() => {
        document.head.innerHTML = `
            <link rel="icon" href="/admin/favicon.ico" />
            <link rel="apple-touch-icon" sizes="180x180" href="/admin/apple-icon-180x180.png" />
            <link rel="icon" type="image/png" sizes="192x192" href="/admin/android-icon-192x192.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/admin/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/admin/favicon-16x16.png" />
        `;
    });

    it('leaves no icon link pointing at the built-in placeholder', () => {
        applyBrandingFavicon(ICON);

        expect(iconLinks().map((link) => link.getAttribute('href'))).toEqual([ICON, ICON, ICON, ICON]);
    });

    it('drops the placeholder size and type hints so no wrong variant can win', () => {
        applyBrandingFavicon(ICON);

        iconLinks().forEach((link) => {
            expect(link.getAttribute('sizes')).toBeNull();
            expect(link.getAttribute('type')).toBeNull();
        });
    });

    it('leaves apple-touch-icon links alone', () => {
        applyBrandingFavicon(ICON);

        expect(document.querySelector("link[rel='apple-touch-icon']")?.getAttribute('href')).toBe(
            '/admin/apple-icon-180x180.png',
        );
    });
});
