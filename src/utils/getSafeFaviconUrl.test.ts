import { describe, expect, it } from 'vitest';

import { getSafeFaviconUrl } from './getSafeFaviconUrl';

describe('getSafeFaviconUrl', () => {
    it.each([
        '/admin/favicon.ico',
        'https://assets.example.test/branding/favicon.png',
        'data:image/png;base64,iVBORw0KGgo=',
        'data:image/svg+xml,%3Csvg%20/%3E',
    ])('keeps a valid favicon URL (%s)', (favicon) => {
        expect(getSafeFaviconUrl(favicon)).toBe(favicon);
    });

    it.each([
        '',
        'data:image;base64,broken',
        'data:text/plain;base64,not-an-image',
        ['java', 'script:alert(1)'].join(''),
    ])('rejects an invalid favicon URL (%s)', (favicon) => {
        expect(getSafeFaviconUrl(favicon)).toBeUndefined();
    });
});
