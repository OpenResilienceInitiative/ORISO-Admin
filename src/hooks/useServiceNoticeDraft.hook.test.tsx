import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceNoticePreview, ServiceNoticeVariant } from '../api/serviceNotices/serviceNotices';

const api = vi.hoisted(() => ({ save: vi.fn(), read: vi.fn(), preview: vi.fn() }));
vi.mock('../api/serviceNotices/serviceNotices', () => ({
    saveServiceNoticeDraft: api.save,
    getServiceNoticeDraft: api.read,
    getServiceNoticePreview: api.preview,
}));
import { useServiceNoticeDraft } from './useServiceNoticeDraft.hook';

const previewFor = (campaignKey: string, variant: ServiceNoticeVariant): ServiceNoticePreview => ({
    campaignKey,
    variant,
    subject: variant,
    preheader: variant,
    html: '<html></html>',
    text: variant,
});
const Wrapper = ({ children }: { children: ReactNode }) => {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('saved service-notice query lifecycle', () => {
    beforeEach(() => {
        api.save.mockReset();
        api.read.mockReset();
        api.preview.mockReset();
    });

    it('does not read or create a draft or preview before a saved reference exists', () => {
        renderHook(() => useServiceNoticeDraft(null, 'de-sie', true), { wrapper: Wrapper });
        expect(api.preview).not.toHaveBeenCalled();
        expect(api.read).not.toHaveBeenCalled();
        expect(api.save).not.toHaveBeenCalled();
    });

    it('does not request a preview for an unauthorized reader', () => {
        renderHook(() => useServiceNoticeDraft('known', 'en', false), { wrapper: Wrapper });
        expect(api.preview).not.toHaveBeenCalled();
    });

    it('cancels the previous language request and cannot show its late response under another language', async () => {
        let releaseOld: (value: ServiceNoticePreview) => void = () => undefined;
        let oldSignal: AbortSignal | undefined;
        api.preview.mockImplementation((reference: string, variant: ServiceNoticeVariant, signal: AbortSignal) => {
            if (variant === 'de-sie') {
                oldSignal = signal;
                return new Promise<ServiceNoticePreview>((resolve) => {
                    releaseOld = resolve;
                });
            }
            return Promise.resolve(previewFor(reference, variant));
        });
        const hook = renderHook(({ variant }) => useServiceNoticeDraft('known', variant, true), {
            wrapper: Wrapper,
            initialProps: { variant: 'de-sie' as ServiceNoticeVariant },
        });
        await waitFor(() => expect(api.preview).toHaveBeenCalledTimes(1));
        hook.rerender({ variant: 'en' });
        await waitFor(() => expect(hook.result.current.preview.data?.variant).toBe('en'));
        expect(oldSignal?.aborted).toBe(true);
        await act(async () => releaseOld(previewFor('known', 'de-sie')));
        expect(hook.result.current.preview.data?.variant).toBe('en');
    });

    it('keeps a different saved reference isolated from the previous cache', async () => {
        api.preview.mockImplementation((reference: string, variant: ServiceNoticeVariant) =>
            Promise.resolve(previewFor(reference, variant)),
        );
        const hook = renderHook(({ reference }) => useServiceNoticeDraft(reference, 'en', true), {
            wrapper: Wrapper,
            initialProps: { reference: 'one' },
        });
        await waitFor(() => expect(hook.result.current.preview.data?.campaignKey).toBe('one'));
        hook.rerender({ reference: 'two' });
        await waitFor(() => expect(hook.result.current.preview.data?.campaignKey).toBe('two'));
        expect(api.preview).toHaveBeenCalledTimes(2);
    });

    it('reports a draft conflict once without automatically retrying a mutation', async () => {
        const conflict = new Response(null, { status: 409 });
        api.save.mockRejectedValue(conflict);
        const hook = renderHook(() => useServiceNoticeDraft(null, 'en', true), { wrapper: Wrapper });
        await act(async () => {
            await expect(
                hook.result.current.save.mutateAsync({
                    campaignKey: 'known',
                    input: {
                        maintenanceDate: '2026-12-01',
                        maintenanceStart: '09:00',
                        maintenanceEnd: '10:00',
                        statusUrl: 'https://status.example.org',
                    },
                }),
            ).rejects.toBe(conflict);
        });
        expect(api.save).toHaveBeenCalledTimes(1);
    });
});
