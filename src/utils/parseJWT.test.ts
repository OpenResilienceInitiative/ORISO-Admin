import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import parseJwt from './parseJWT';

// jsdom's atob is stricter than the browser's (rejects unpadded base64url and
// is slow), so swap in a browser-faithful atob backed by Buffer: same Latin1
// binary-string output the function expects, deterministic and fast.
const browserAtob = (b64: string): string => Buffer.from(b64, 'base64').toString('binary');

// Real JWTs use unpadded base64url.
const toBase64Url = (payload: unknown): string => Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const makeToken = (payload: unknown): string => `header.${toBase64Url(payload)}.signature`;

describe('parseJwt', () => {
    beforeAll(() => vi.stubGlobal('atob', browserAtob));
    afterAll(() => vi.unstubAllGlobals());

    it('decodes the JSON payload of a JWT', () => {
        const payload = { sub: '1234567890', name: 'John Doe', admin: true, iat: 1516239022 };
        expect(parseJwt(makeToken(payload))).toEqual(payload);
    });

    it('handles non-ASCII characters in the payload (UTF-8 round-trip)', () => {
        const payload = { name: 'Jöhn Döe', city: 'München', emoji: '🚀' };
        expect(parseJwt(makeToken(payload))).toEqual(payload);
    });

    it('reads the payload segment, ignoring header and signature', () => {
        const payload = { role: 'restricted-agency-admin' };
        expect(parseJwt(makeToken(payload))).toEqual(payload);
    });

    it.each([
        ['empty string', ''],
        ['no payload segment', 'not-a-jwt'],
        ['empty payload segment', 'header.'],
        ['payload that is not valid base64', 'header.%%%.signature'],
        ['payload that is not JSON', `header.${Buffer.from('plain text', 'utf8').toString('base64url')}.signature`],
    ])('returns null instead of throwing for a malformed token (%s)', (_label, token) => {
        expect(() => parseJwt(token)).not.toThrow();
        expect(parseJwt(token)).toBeNull();
    });
});
