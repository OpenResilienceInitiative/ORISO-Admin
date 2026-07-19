import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({ tryRefreshAccessToken: vi.fn() }));

vi.mock('../auth/auth', () => ({
    getAccessTokenForRequests: () => 'test-token',
    tryRefreshAccessToken: authMocks.tryRefreshAccessToken,
}));

import { uploadTenantMedia } from './uploadTenantMedia';

const pngFile = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', { type: 'image/png' });

describe('uploadTenantMedia', () => {
    const fetchSpy = vi.fn();

    beforeEach(() => {
        vi.stubGlobal('fetch', fetchSpy);
        fetchSpy.mockReset();
        authMocks.tryRefreshAccessToken.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('posts the file as multipart form data with auth and without a JSON content type', async () => {
        fetchSpy.mockResolvedValue(
            new Response(JSON.stringify({ id: 'abc', url: '/media/abc', contentType: 'image/png' }), {
                status: 201,
            }),
        );

        const result = await uploadTenantMedia(pngFile());

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const request = fetchSpy.mock.calls[0][0] as Request;
        expect(request.url).toContain('/service/tenantadmin/media');
        expect(request.method).toBe('POST');
        expect(request.headers.get('Authorization')).toBe('Bearer test-token');
        expect(request.headers.get('Content-Type')).toMatch(/^multipart\/form-data; boundary=/);
        expect(result).toEqual({ id: 'abc', url: '/media/abc', contentType: 'image/png' });
    });

    it('rejects when the server responds with an error status', async () => {
        fetchSpy.mockResolvedValue(new Response('nope', { status: 400 }));

        await expect(uploadTenantMedia(pngFile())).rejects.toThrow();
    });

    it('refreshes an expired access token and retries the multipart upload once', async () => {
        fetchSpy
            .mockResolvedValueOnce(new Response(null, { status: 401 }))
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ id: 'abc', url: '/media/abc', contentType: 'image/png' }), {
                    status: 201,
                }),
            );
        authMocks.tryRefreshAccessToken.mockResolvedValue(true);

        await expect(uploadTenantMedia(pngFile())).resolves.toMatchObject({ id: 'abc' });

        expect(authMocks.tryRefreshAccessToken).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});
