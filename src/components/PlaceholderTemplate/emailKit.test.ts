import { describe, expect, it } from 'vitest';
import { safeEmailColor, sanitizeEmailKitBrand, type EmailKitBrand } from './emailKit';

const brand: EmailKitBrand = {
    platformName: 'Online-Beratung',
    orgName: 'Org',
    orgAddress: 'Straße 1',
    contactLine: 'kontakt@example.org',
    primaryColor: '#a5000a',
    accentColor: '#a5000a',
};

describe('safeEmailColor', () => {
    it.each(['#a5000a', '#fff', '#a5000aff', 'rgb(165, 0, 10)', 'rgba(165, 0, 10, 0.5)', 'var(--m3-primary)'])(
        'passes the safe colour grammar through: %s',
        (value) => {
            expect(safeEmailColor(value)).toBe(value);
        },
    );

    it('trims surrounding whitespace from an otherwise safe value', () => {
        expect(safeEmailColor('  #336699  ')).toBe('#336699');
    });

    it.each([
        // Attribute breakout: the quote would close the style="…" it is inlined into.
        '#fff" onmouseover="alert(1)',
        "#fff' onmouseover='alert(1)",
        // Markup and statement injection.
        '#fff<script>',
        'red;background:url(x)',
        'expression(alert(1))',
        'url(javascript:alert(1))',
        '',
    ])('replaces an unsafe value with the fallback: %s', (value) => {
        expect(safeEmailColor(value)).toBe('#a5000a');
    });
});

describe('sanitizeEmailKitBrand', () => {
    it('keeps safe colours and every text field untouched', () => {
        expect(sanitizeEmailKitBrand(brand)).toEqual(brand);
    });

    it('normalises unsafe primary and accent colours to the fallback', () => {
        const sanitized = sanitizeEmailKitBrand({
            ...brand,
            primaryColor: '#fff" onmouseover="alert(1)',
            accentColor: '#fff"><script>alert(1)</script>',
        });
        expect(sanitized.primaryColor).toBe('#a5000a');
        expect(sanitized.accentColor).toBe('#a5000a');
    });
});
