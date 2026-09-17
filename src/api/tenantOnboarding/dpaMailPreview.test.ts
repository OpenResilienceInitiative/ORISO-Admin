import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dpaInvitePreviewEndpoint, publicAccountInvitesEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../fetchData';
import { getAdminDpaMailPreview, getPublicDpaMailPreview } from './dpaMailPreview';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: mocks.fetchData };
});

beforeEach(() => mocks.fetchData.mockReset());

describe('canonical DPA forward mail previews', () => {
    it('loads the public preview with the opaque invite token and no authentication', async () => {
        mocks.fetchData.mockResolvedValue({ subject: 'Sign', html: '<html />' });

        await getPublicDpaMailPreview('a token');

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${publicAccountInvitesEndpoint}/a%20token/onboarding/dpa-mail-preview`,
                method: FETCH_METHODS.GET,
                skipAuth: true,
                responseHandling: expect.arrayContaining([
                    FETCH_ERRORS.CATCH_ALL_SILENT,
                    FETCH_ERRORS.FORBIDDEN_SILENT,
                ]),
            }),
        );
    });

    it('loads the authenticated preview through the tenant-scoped UserService endpoint', async () => {
        mocks.fetchData.mockResolvedValue({ subject: 'Sign', html: '<html />' });

        await getAdminDpaMailPreview(42);

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: dpaInvitePreviewEndpoint,
                method: FETCH_METHODS.POST,
                skipAuth: false,
                bodyData: JSON.stringify({ tenantId: 42 }),
                responseHandling: expect.arrayContaining([FETCH_SUCCESS.CONTENT]),
            }),
        );
    });
});
