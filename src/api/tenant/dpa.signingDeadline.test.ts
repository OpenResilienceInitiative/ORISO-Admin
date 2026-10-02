import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { publishDpa } from './publishDpa';
import { getDpaGate } from './getDpaGate';
import { signDpaAdmin } from './signDpaAdmin';

const requests: Array<{ deadline: string | null; content: unknown }> = [];
const server = setupServer(
    http.put('*/service/tenantadmin/:id/dpa/v2', async ({ request }) => {
        requests.push({
            deadline: new URL(request.url).searchParams.get('signingDeadlineAt'),
            content: await request.json(),
        });
        return HttpResponse.json({ dpaPublished: true, dpaSigned: false, signingDeadlineAt: '2099-10-30T14:00:00Z' });
    }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
    requests.length = 0;
    server.resetHandlers();
});
afterAll(() => server.close());

describe('public AVV deadline publication HTTP contract', () => {
    it('keeps the multilingual body and sends the explicit offset deadline as a required query', async () => {
        const content = { de: '<p>DE</p>', en: '<p>EN</p>', en__meta: '{"mt":true}' };
        const result = await publishDpa(7, content, '2099-10-30T15:00:00+01:00');
        expect(requests).toEqual([{ deadline: '2099-10-30T15:00:00+01:00', content }]);
        expect(result.signingDeadlineAt).toBe('2099-10-30T14:00:00Z');
    });
    it.each(['', '2099-10-30T15:00', '2020-01-01T12:00:00Z', '2099-02-30T12:00:00Z', '2099-10-30T15:00:00+24:00'])(
        'rejects missing, zoneless or past deadlines before publication: %s',
        async (deadline) => {
            await expect(publishDpa(7, { de: '<p>DE</p>' }, deadline)).rejects.toThrow();
            expect(requests).toHaveLength(0);
        },
    );
});

it('posts the accepted displayed version to the additive signing route', async () => {
    const dpaVersion = '2026-09-30T12:00:00';
    const body = { dpaVersion, signerName: 'Toni Tenantadmin', accepted: true, language: 'de' };
    let signedBody: unknown;
    server.use(
        http.post('*/service/tenantadmin/7/dpa/v2/sign', async ({ request }) => {
            signedBody = await request.json();
            return HttpResponse.json({ tenantId: 7, status: 'VALID', currentDpaVersion: dpaVersion });
        }),
    );
    await expect(signDpaAdmin(7, body)).resolves.toMatchObject({
        tenantId: 7,
        status: 'VALID',
        currentDpaVersion: dpaVersion,
    });
    expect(signedBody).toEqual(body);
});

it('keeps an older backend gate denial local instead of navigating away from the legal reader', async () => {
    server.use(http.get('*/service/tenantadmin/7/dpa/gate', () => new HttpResponse(null, { status: 403 })));
    const browserError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
        await expect(getDpaGate(7)).rejects.toThrow('NOT_ALLOWED');
        expect(browserError).not.toHaveBeenCalled();
    } finally {
        browserError.mockRestore();
    }
});
