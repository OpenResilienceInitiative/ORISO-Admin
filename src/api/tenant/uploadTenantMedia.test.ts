import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/auth', () => ({
    getAccessTokenForRequests: () => 'test-token',
    tryRefreshAccessToken: vi.fn(),
}));

import { uploadTenantMedia } from './uploadTenantMedia';

const pngFile = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', { type: 'image/png' });

describe('uploadTenantMedia', () => {
    const fetchSpy = vi.fn();

    beforeEach(() => {
        vi.stubGlobal('fetch', fetchSpy);
        fetchSpy.mockReset();
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
        const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/service/tenantadmin/media');
        expect(init.method).toBe('POST');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
        // the browser must set the multipart boundary itself — no explicit content type
        expect(Object.keys(init.headers as Record<string, string>)).not.toContain('Content-Type');
        expect(init.body).toBeInstanceOf(FormData);
        expect((init.body as FormData).get('file')).toBeInstanceOf(File);
        expect(result).toEqual({ id: 'abc', url: '/media/abc', contentType: 'image/png' });
    });

    it('rejects when the server responds with an error status', async () => {
        fetchSpy.mockResolvedValue(new Response('nope', { status: 400 }));

        await expect(uploadTenantMedia(pngFile())).rejects.toThrow();
    });
});
