import { describe, expect, it } from 'vite-plus/test';
import {
    ICON_VARIANTS,
    MAX_SVG_BYTES,
    iconFor,
    nameOf,
    setIcon,
    setName,
    svgDataUrl,
    validateSvg,
    type AppearanceSettings,
} from './appearance';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2h20v20H2z"/></svg>';

describe('the name of a conversation type', () => {
    const settings: AppearanceSettings = {
        AGENCY_COUNSELLING: { name: { de: 'Beratung per Mail', en: 'Counselling by mail' }, icons: {} },
    };

    it('uses the platform name in the language being read', () => {
        expect(nameOf(settings, 'AGENCY_COUNSELLING', 'en', 'Mailberatung')).toBe('Counselling by mail');
    });

    it('falls back to German, then to the shipped name', () => {
        expect(nameOf(settings, 'AGENCY_COUNSELLING', 'fr', 'Mailberatung')).toBe('Beratung per Mail');
        expect(nameOf(settings, 'LIVE_CHAT', 'de', 'Live-Chat')).toBe('Live-Chat');
        expect(nameOf({ LIVE_CHAT: { name: { de: '  ' }, icons: {} } }, 'LIVE_CHAT', 'de', 'Live-Chat')).toBe(
            'Live-Chat',
        );
    });

    it('sets one language and leaves the others alone', () => {
        const next = setName(settings, 'AGENCY_COUNSELLING', 'fr', 'Conseil par courriel');
        expect(next.AGENCY_COUNSELLING?.name).toEqual({
            de: 'Beratung per Mail',
            en: 'Counselling by mail',
            fr: 'Conseil par courriel',
        });
    });
});

describe('the icons of a conversation type', () => {
    it('knows three variants: outline in two weights and filled', () => {
        expect(ICON_VARIANTS).toEqual(['outline200', 'outline400', 'filled']);
    });

    it('takes the asked variant, then the regular outline, then nothing', () => {
        let settings: AppearanceSettings = {};
        expect(iconFor(settings, 'LIVE_CHAT', 'filled')).toBeUndefined();
        settings = setIcon(settings, 'LIVE_CHAT', 'outline400', svg);
        expect(iconFor(settings, 'LIVE_CHAT', 'filled')).toBe(svg);
        settings = setIcon(settings, 'LIVE_CHAT', 'filled', `${svg} `);
        expect(iconFor(settings, 'LIVE_CHAT', 'filled')).toBe(`${svg} `);
    });

    it('removes a variant again', () => {
        const settings = setIcon(setIcon({}, 'SELF_HELP', 'filled', svg), 'SELF_HELP', 'filled', undefined);
        expect(settings.SELF_HELP?.icons.filled).toBeUndefined();
    });

    it('turns an icon into a data URL an <img> can show', () => {
        expect(svgDataUrl(svg)).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/);
    });
});

describe('checking an uploaded SVG', () => {
    it('accepts a plain SVG', () => {
        expect(validateSvg(svg)).toEqual({ ok: true, svg });
    });

    it('accepts an XML declaration and a comment before the svg element', () => {
        const withProlog = `<?xml version="1.0"?>\n<!-- icon -->\n${svg}`;
        expect(validateSvg(withProlog).ok).toBe(true);
    });

    it('refuses what is not an SVG', () => {
        expect(validateSvg('<html><body/></html>')).toEqual({ ok: false, reason: 'notSvg' });
        expect(validateSvg('')).toEqual({ ok: false, reason: 'notSvg' });
    });

    it('refuses an SVG that is too large', () => {
        const big = `<svg>${'<path d="M0 0"/>'.repeat(MAX_SVG_BYTES / 10)}</svg>`;
        expect(validateSvg(big)).toEqual({ ok: false, reason: 'tooLarge' });
    });

    it('refuses scripts, event handlers, javascript: links and embedded documents', () => {
        [
            '<svg><script>alert(1)</script></svg>',
            '<svg onload="alert(1)"></svg>',
            '<svg><a href="javascript:alert(1)"><path/></a></svg>',
            '<svg><foreignObject><div/></foreignObject></svg>',
            '<svg><image href="https://example.org/x.png"/></svg>',
        ].forEach((unsafe) => expect(validateSvg(unsafe)).toEqual({ ok: false, reason: 'unsafe' }));
    });
});
