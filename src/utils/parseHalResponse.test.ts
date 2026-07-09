import { describe, expect, it } from 'vitest';
import { parseHalResponse } from './parseHalResponse';

const jsonResponse = (body: string, contentType = 'application/hal+json', status = 200) =>
    new Response(body, { status, headers: { 'content-type': contentType } });

describe('parseHalResponse', () => {
    it('parses a HAL+JSON body into an object', async () => {
        const res = jsonResponse('{"id":1,"_embedded":{"items":[]}}');
        await expect(parseHalResponse(res)).resolves.toEqual({ id: 1, _embedded: { items: [] } });
    });

    it('matches any JSON content type (application/json)', async () => {
        const res = jsonResponse('{"ok":true}', 'application/json');
        await expect(parseHalResponse(res)).resolves.toEqual({ ok: true });
    });

    it('returns null for 204 No Content', async () => {
        const res = new Response(null, { status: 204 });
        await expect(parseHalResponse(res)).resolves.toBeNull();
    });

    it('returns null for a non-JSON content type', async () => {
        const res = jsonResponse('plain text', 'text/plain');
        await expect(parseHalResponse(res)).resolves.toBeNull();
    });

    it('returns null for an empty / whitespace-only body', async () => {
        const res = jsonResponse('   ');
        await expect(parseHalResponse(res)).resolves.toBeNull();
    });

    it('passes through values that are not a Response', async () => {
        const preParsed = { already: 'parsed' };
        await expect(parseHalResponse(preParsed)).resolves.toBe(preParsed);
        await expect(parseHalResponse(null)).resolves.toBeNull();
        await expect(parseHalResponse('raw')).resolves.toBe('raw');
    });
});
