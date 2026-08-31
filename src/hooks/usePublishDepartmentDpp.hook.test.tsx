import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { publishDepartmentDpp } = vi.hoisted(() => ({
    publishDepartmentDpp: vi.fn(() => Promise.resolve(undefined)),
}));
vi.mock('../api/agency/publishDepartmentDpp', () => ({ publishDepartmentDpp }));

// eslint-disable-next-line import/first
import { usePublishDepartmentDpp } from './usePublishDepartmentDpp.hook';
// eslint-disable-next-line import/first
import { legalTextVersionsKey } from './useLegalTextVersions.hook';
// eslint-disable-next-line import/first
import { DEPARTMENT_DPP_KEY } from './useDepartmentDpp.hook';

const AGENCY = 12;
const TOPIC = 3;

const setup = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePublishDepartmentDpp(AGENCY, TOPIC), { wrapper });
    return { result, invalidate };
};

const versionsKey = legalTextVersionsKey({ level: 'department', agencyId: AGENCY, topicId: TOPIC, kind: 'DPP' });

beforeEach(() => publishDepartmentDpp.mockClear());

describe('usePublishDepartmentDpp', () => {
    it('refreshes the version history after a publish, so the new version is in the look-back', async () => {
        const { result, invalidate } = setup();

        act(() => result.current.mutate({ content: { de: '<p>x</p>' }, publish: true }));

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: [DEPARTMENT_DPP_KEY, AGENCY, TOPIC] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: versionsKey });
    });

    /**
     * ADR-021 decision 4 — the sentence is a field of the policy, so it travels on the
     * same request. A publish that dropped it would leave the live consent screen on
     * the previous wording while a new policy version says otherwise.
     */
    it('carries the consent sentence of this version to the endpoint', async () => {
        const { result } = setup();

        act(() =>
            result.current.mutate({
                content: { de: '<p>x</p>' },
                publish: true,
                consentText: { de: 'Ich habe {{legal_links}} gelesen.' },
            }),
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(publishDepartmentDpp).toHaveBeenCalledWith(AGENCY, TOPIC, { de: '<p>x</p>' }, true, {
            de: 'Ich habe {{legal_links}} gelesen.',
        });
    });

    it('leaves the history alone on a draft save — a draft appends no version', async () => {
        const { result, invalidate } = setup();

        act(() => result.current.mutate({ content: { de: '<p>x</p>' }, publish: false }));

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: [DEPARTMENT_DPP_KEY, AGENCY, TOPIC] });
        expect(invalidate).not.toHaveBeenCalledWith({ queryKey: versionsKey });
    });
});
