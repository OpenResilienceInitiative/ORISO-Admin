import { describe, expect, it } from 'vitest';
import { normalizeIconDataUrl } from './normalizeIconDataUrl';
import { getSafeFaviconUrl } from './getSafeFaviconUrl';

const ICO_PAYLOAD = 'AAABAAEAICAAAAEAIACoEAAAFgAAACgAAAA=';

describe('normalizeIconDataUrl', () => {
    it('gives an .ico with no MIME mapping a usable image media type', () => {
        // `beforeUpload` accepts a file whose `type` is '' on its `.ico`
        // extension; FileReader then labels the data URL application/octet-stream.
        const stored = normalizeIconDataUrl(`data:application/octet-stream;base64,${ICO_PAYLOAD}`, 'favicon.ico');

        expect(stored).toBe(`data:image/x-icon;base64,${ICO_PAYLOAD}`);
    });

    it('produces a value the favicon gatekeeper accepts', () => {
        const stored = normalizeIconDataUrl(`data:application/octet-stream;base64,${ICO_PAYLOAD}`, 'favicon.ico');

        expect(getSafeFaviconUrl(stored)).toBe(stored);
    });

    it.each([
        `data:image/vnd.microsoft.icon;base64,${ICO_PAYLOAD}`,
        `data:image/x-icon;base64,${ICO_PAYLOAD}`,
        'data:image/png;base64,iVBORw0KGgo=',
    ])('leaves a value that already declares an image type alone (%s)', (value) => {
        expect(normalizeIconDataUrl(value, 'favicon.ico')).toBe(value);
    });

    it('does not relabel a non-icon file that happens to lack a MIME type', () => {
        const stored = `data:application/octet-stream;base64,${ICO_PAYLOAD}`;

        expect(normalizeIconDataUrl(stored, 'logo.bin')).toBe(stored);
    });

    it('is empty-safe', () => {
        expect(normalizeIconDataUrl(undefined, 'favicon.ico')).toBeUndefined();
        expect(normalizeIconDataUrl('', 'favicon.ico')).toBe('');
    });
});
