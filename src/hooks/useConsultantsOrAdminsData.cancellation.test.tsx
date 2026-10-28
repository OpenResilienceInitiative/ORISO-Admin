import React from 'react';
import { transferableAbortController } from 'node:util';
import { act, renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { TypeOfUser } from '../enums/TypeOfUser';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { useConsultantsOrAdminsData } from './useConsultantsOrAdminsData';
import { clearStoryQueryClients, createStoryQueryClient } from '../utils/storybook/storyQueryClients';

vi.mock('../api/auth/auth', () => ({
    getAccessTokenForRequests: () => 'synthetic-access',
    tryRefreshAccessToken: vi.fn(),
}));
vi.mock('../api/auth/logout', () => ({ default: vi.fn() }));
vi.mock('../utils/generateCsrfToken', () => ({ default: () => 'synthetic-csrf' }));
vi.mock('i18next', () => ({ default: { language: 'de', resolvedLanguage: 'de', t: (key: unknown) => key } }));
const feedback = vi.hoisted(() => vi.fn());
vi.mock('../api/transportFeedback', () => ({ captureTransportFeedback: () => feedback }));
vi.mock('../appConfig', () => ({
    default: { login: '/admin/login' },
    CSRF_WHITELIST_HEADER: '',
    usersConsultantsSearchEndpoint: 'https://admin.example.test/service/users/consultants/search',
    tenantAdminsSearchEndpoint: 'https://admin.example.test/service/useradmin/tenantadmins/search',
    agencyAdminsSearchEndpoint: 'https://admin.example.test/service/useradmin/agencyadmins/search',
}));

const body = (id: string) =>
    new Response(JSON.stringify({ _embedded: [{ id }], total: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
const deferredTransport = () => {
    let signal: AbortSignal | undefined;
    let phase = 'not-dispatched';
    let release = () => {};
    const fetch = vi.fn((request: Request) => {
        signal = request.signal;
        phase = 'pending';
        return new Promise<Response>((resolve, reject) => {
            release = () => {
                if (phase === 'pending') {
                    phase = 'manually-released';
                    resolve(body('old-consultant'));
                }
            };
            const aborted = () => {
                phase = 'aborted';
                const error = new Error('transport aborted');
                error.name = 'AbortError';
                reject(error);
            };
            if (request.signal.aborted) aborted();
            else request.signal.addEventListener('abort', aborted, { once: true });
        });
    });
    return { fetch, release: () => release(), signal: () => signal, phase: () => phase };
};

beforeEach(() => {
    feedback.mockClear();
    vi.useFakeTimers();
    // Match Request's Node realm, following the existing real-hook transport tests.
    vi.stubGlobal('AbortController', function NativeRequestAbortController() {
        return transferableAbortController();
    });
});
afterEach(async () => {
    await clearStoryQueryClients();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

it('observes a real external-signal abort through fetchData before timeout or manual response', async () => {
    const transport = deferredTransport();
    vi.stubGlobal('fetch', transport.fetch);
    const external = new AbortController();
    const pending = fetchData({
        url: 'https://admin.example.test/service/control',
        method: FETCH_METHODS.GET,
        skipAuth: true,
        signal: external.signal,
    });
    const rejected = expect(pending).rejects.toThrow(FETCH_ERRORS.ABORT);
    expect(transport.phase()).toBe('pending');
    external.abort();
    await rejected;
    expect(transport.signal()?.aborted).toBe(true);
    expect(transport.phase()).toBe('aborted');
    expect(feedback).not.toHaveBeenCalled();
});

it('aborts the old consultants transport at the actual story cancel/clear boundary before a new tenant client starts', async () => {
    const old = deferredTransport();
    const dispatches: string[] = [];
    vi.stubGlobal(
        'fetch',
        vi.fn((request: Request) => {
            const path = new URL(request.url).pathname;
            dispatches.push(path);
            return path.includes('/consultants/') ? old.fetch(request) : Promise.resolve(body('current-tenant-admin'));
        }),
    );
    const oldClient = createStoryQueryClient();
    const oldHook = renderHook(
        () => useConsultantsOrAdminsData({ typeOfUser: TypeOfUser.Consultants, rethrowOnFailure: true }),
        {
            wrapper: ({ children }) => <QueryClientProvider client={oldClient}>{children}</QueryClientProvider>,
        },
    );
    let newHook: ReturnType<typeof renderHook> | undefined;
    try {
        expect(old.phase()).toBe('pending');
        oldHook.unmount();
        await clearStoryQueryClients();
        const newClient = createStoryQueryClient();
        const current = renderHook(
            () => useConsultantsOrAdminsData({ typeOfUser: TypeOfUser.TenantAdmins, rethrowOnFailure: true }),
            {
                wrapper: ({ children }) => <QueryClientProvider client={newClient}>{children}</QueryClientProvider>,
            },
        );
        newHook = current;
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(current.result.current.data).toEqual({ data: [{ id: 'current-tenant-admin' }], total: 1 });
        expect(oldClient.getQueryCache().getAll()).toHaveLength(0);
        expect
            .soft(old.signal()?.aborted, 'old Request.signal must abort at cancellation, before manual response/30s')
            .toBe(true);
        expect
            .soft(old.phase(), 'old deferred transport must reject at cancellation, not remain pending')
            .toBe('aborted');
        // Release only for bounded test cleanup/late-result ownership; it is never cancellation evidence.
        old.release();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(current.result.current.data).toEqual({ data: [{ id: 'current-tenant-admin' }], total: 1 });
        expect(current.result.current.error).toBeNull();
        expect(feedback).not.toHaveBeenCalled();
        expect(dispatches).toEqual(['/service/users/consultants/search', '/service/useradmin/tenantadmins/search']);
    } finally {
        old.release();
        oldHook.unmount();
        newHook?.unmount();
        await clearStoryQueryClients();
    }
});
