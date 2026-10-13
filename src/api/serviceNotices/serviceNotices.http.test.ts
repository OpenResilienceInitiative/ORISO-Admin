// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/auth', () => ({
    getAccessTokenForRequests: () => 'operator-token-fixture',
    tryRefreshAccessToken: vi.fn().mockResolvedValue(false),
}));
vi.mock('../auth/logout', () => ({ default: vi.fn() }));
vi.mock('../../utils/generateCsrfToken', () => ({ default: () => 'csrf-fixture' }));
vi.mock('../../utils/language', () => ({ DEFAULT_LANGUAGE: 'en', normalizeLanguage: (language: string) => language }));
vi.mock('../../appConfig', () => ({
    default: { login: '/admin/login' },
    CSRF_WHITELIST_HEADER: '',
    serviceNoticeDraftsEndpoint: 'https://api.example.org/service/users/admin/service-notices/drafts',
}));
vi.mock('antd', () => ({ message: { error: vi.fn() } }));
vi.mock('i18next', () => ({ default: { resolvedLanguage: 'en', language: 'en', t: (key: string) => key } }));

import {
    confirmServiceNotice,
    dryRunServiceNotice,
    getServiceNoticeDraft,
    getServiceNoticePreview,
    saveServiceNoticeDraft,
} from './serviceNotices';

const input = {
    maintenanceDate: '2026-10-12',
    maintenanceStart: '09:00',
    maintenanceEnd: '10:00',
    statusUrl: 'https://status.example.org/planned',
};
const draft = { campaignKey: 'planned-2026-10', status: 'DRAFT', ...input };
const jsonResponse = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('operator service notice through the actual authenticated HTTP transport', () => {
    it('saves only the four draft fields and reads the same reference without any delivery request', async () => {
        const http = vi.fn().mockResolvedValueOnce(jsonResponse(draft)).mockResolvedValueOnce(jsonResponse(draft));
        vi.stubGlobal('fetch', http);

        expect(await saveServiceNoticeDraft(draft.campaignKey, input)).toEqual(draft);
        expect(await getServiceNoticeDraft(draft.campaignKey)).toEqual(draft);

        const [save] = http.mock.calls[0];
        const [read] = http.mock.calls[1];
        expect(save.method).toBe('PUT');
        expect(save.headers.get('Authorization')).toBe('Bearer operator-token-fixture');
        expect(await save.json()).toEqual(input);
        expect(read.method).toBe('GET');
        expect(read.headers.get('Authorization')).toBe('Bearer operator-token-fixture');
        expect(http).toHaveBeenCalledTimes(2);
        expect(save.url).toBe(
            `https://api.example.org/service/users/admin/service-notices/drafts/${draft.campaignKey}`,
        );
        expect(read.url).toBe(save.url);
    });

    it.each(['de-sie', 'de-du', 'en', 'fr', 'ru', 'ti', 'tr'] as const)(
        'reads the actual %s preview including subject, preheader, HTML and text',
        async (variant) => {
            const preview = {
                campaignKey: draft.campaignKey,
                variant,
                subject: 'Configured product',
                preheader: 'Planned window',
                html: '<p>Preview</p>',
                text: 'Preview',
            };
            const http = vi.fn().mockResolvedValue(jsonResponse(preview));
            vi.stubGlobal('fetch', http);
            expect(await getServiceNoticePreview(draft.campaignKey, variant)).toEqual(preview);
            const [request] = http.mock.calls[0];
            expect(request.url).toBe(
                `https://api.example.org/service/users/admin/service-notices/drafts/${draft.campaignKey}/preview?variant=${variant}`,
            );
            expect(request.method).toBe('GET');
            expect(request.headers.get('Authorization')).toBe('Bearer operator-token-fixture');
            expect(http).toHaveBeenCalledOnce();
        },
    );

    it('keeps a changed-payload409 visible and never retries it as a new draft or delivery', async () => {
        const http = vi.fn().mockResolvedValue(jsonResponse({ message: 'Conflict' }, 409));
        vi.stubGlobal('fetch', http);
        await expect(saveServiceNoticeDraft(draft.campaignKey, input)).rejects.toMatchObject({ status: 409 });
        expect(http).toHaveBeenCalledOnce();
    });

    it.each([400, 403, 404, 502])('preserves a safe HTTP%s error for local presentation', async (status) => {
        const http = vi.fn().mockResolvedValue(jsonResponse({ message: 'Rejected' }, status));
        vi.stubGlobal('fetch', http);
        await expect(getServiceNoticeDraft(draft.campaignKey)).rejects.toMatchObject({ status });
        expect(http).toHaveBeenCalledOnce();
    });

    it('encodes an entered reference instead of allowing it to change the request path', async () => {
        const http = vi.fn().mockResolvedValue(jsonResponse(draft));
        vi.stubGlobal('fetch', http);
        await getServiceNoticeDraft('bad/reference?other=value');
        expect(http.mock.calls[0][0].url).toBe(
            'https://api.example.org/service/users/admin/service-notices/drafts/bad%2Freference%3Fother%3Dvalue',
        );
    });

    it('counts the audience with a read-only request that carries no addresses', async () => {
        const counts = {
            campaignKey: draft.campaignKey,
            audience: 'AGENCY_ADMINS',
            recipients: 12,
            mail: 9,
            feedOnlyPreferenceOff: 2,
            feedOnlyNoAddress: 1,
            feedOnlyNoSenderTenant: 0,
        };
        const http = vi.fn().mockResolvedValue(jsonResponse(counts));
        vi.stubGlobal('fetch', http);

        expect(await dryRunServiceNotice(draft.campaignKey)).toEqual(counts);
        const [request] = http.mock.calls[0];
        expect(request.method).toBe('GET');
        expect(request.url).toBe(
            `https://api.example.org/service/users/admin/service-notices/drafts/${draft.campaignKey}/dry-run`,
        );
        expect(http).toHaveBeenCalledOnce();
    });

    it('confirms with only the counted number and never retries a refused confirmation', async () => {
        const confirmed = {
            campaignKey: draft.campaignKey,
            status: 'CONFIRMED',
            recipients: 12,
            mailQueued: 9,
            alreadyConfirmed: false,
        };
        const http = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse(confirmed))
            .mockResolvedValueOnce(jsonResponse({ message: 'changed' }, 409));
        vi.stubGlobal('fetch', http);

        expect(await confirmServiceNotice(draft.campaignKey, 12)).toEqual(confirmed);
        const [request] = http.mock.calls[0];
        expect(request.method).toBe('POST');
        expect(request.url).toBe(
            `https://api.example.org/service/users/admin/service-notices/drafts/${draft.campaignKey}/confirm`,
        );
        expect(await request.json()).toEqual({ expectedRecipients: 12 });

        await expect(confirmServiceNotice(draft.campaignKey, 12)).rejects.toMatchObject({ status: 409 });
        expect(http).toHaveBeenCalledTimes(2);
    });
});
