import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api/tenant/publishDpa', () => ({ publishDpa: vi.fn() }));
vi.mock('../api/tenant/getDpaVersions', () => ({ getDpaVersions: vi.fn() }));

const notificationSuccess = vi.fn();
const notificationError = vi.fn();
vi.mock('antd', () => ({
    notification: {
        success: (args: unknown) => notificationSuccess(args),
        error: (args: unknown) => notificationError(args),
    },
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

// eslint-disable-next-line import/first
import { usePublishDpa } from './usePublishDpa.hook';
// eslint-disable-next-line import/first
import { useDpaVersions, DPA_VERSIONS_KEY } from './useDpaVersions.hook';
// eslint-disable-next-line import/first
import { publishDpa } from '../api/tenant/publishDpa';
// eslint-disable-next-line import/first
import { getDpaVersions } from '../api/tenant/getDpaVersions';

const publishMock = vi.mocked(publishDpa);
const versionsMock = vi.mocked(getDpaVersions);

beforeEach(() => {
    publishMock.mockReset();
    versionsMock.mockReset();
    notificationSuccess.mockReset();
    notificationError.mockReset();
});

const renderWithClient = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { wrapper, invalidateQueries };
};

describe('usePublishDpa', () => {
    it('publishes and invalidates the versions query on success', async () => {
        publishMock.mockResolvedValue({ dpaPublished: true, dpaSigned: false });
        const { wrapper, invalidateQueries } = renderWithClient();

        const { result } = renderHook(() => usePublishDpa(42), { wrapper });
        result.current.mutate({ de: '<p>x</p>' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(publishMock).toHaveBeenCalledWith(42, { de: '<p>x</p>' });
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [DPA_VERSIONS_KEY, 42] });
    });

    it('shows a success notification after publishing', async () => {
        publishMock.mockResolvedValue({ dpaPublished: true, dpaSigned: false });
        const { wrapper } = renderWithClient();

        const { result } = renderHook(() => usePublishDpa(42), { wrapper });
        result.current.mutate({ de: '<p>x</p>' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(notificationSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'tenants.legal.version.publishSuccess' }),
        );
    });

    it('surfaces a publish failure as an error notification (does not stay silent)', async () => {
        publishMock.mockRejectedValue(new Error('CATCH_ALL'));
        const { wrapper } = renderWithClient();

        const { result } = renderHook(() => usePublishDpa(42), { wrapper });
        result.current.mutate({ de: '<p>x</p>' });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(notificationError).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'tenants.legal.version.publishError' }),
        );
    });
});

describe('useDpaVersions', () => {
    it('is disabled for a non-finite tenant id (does not fetch)', () => {
        const { wrapper } = renderWithClient();
        renderHook(() => useDpaVersions(NaN), { wrapper });
        expect(versionsMock).not.toHaveBeenCalled();
    });

    it('fetches for a valid tenant id', async () => {
        versionsMock.mockResolvedValue([{ activationDate: '2026-07-13T10:22', content: '{}' }]);
        const { wrapper } = renderWithClient();
        const { result } = renderHook(() => useDpaVersions(42), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(versionsMock).toHaveBeenCalledWith(42);
    });
});
