import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vite-plus/test';
import { standardJourney, type JourneyStep } from './journey';
import { memoryJourneyStore, type JourneyStore } from './journeyStore';
import { useJourneyWorkspace, type JourneyScope } from './useJourneyWorkspace';

const mail = (id: string) => standardJourney('AGENCY_COUNSELLING', id, 1);
const topics = [{ id: 1, name: 'Schulden' }];
const extra: JourneyStep = {
    id: 'extra',
    kind: 'message',
    title: { de: 'Extra' },
    description: {},
    body: { de: 'Hallo' },
};

const mount = (store: JourneyStore, scope: JourneyScope) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return renderHook(() => useJourneyWorkspace(store, scope, topics), { wrapper });
};

const ready = async (result: { current: { status: string } }) =>
    waitFor(() => expect(result.current.status).toBe('ready'));

describe('the journeys of one level against the store (#1571)', () => {
    it('shows the shipped journeys while the platform stored none, and saves them as new', async () => {
        const store = memoryJourneyStore();
        const { result } = mount(store, { level: 'platform' });
        await ready(result);
        expect(result.current.journeys.length).toBeGreaterThan(0);
        let ok = false;
        await act(async () => {
            ok = await result.current.save(result.current.journeys, result.current.base);
        });
        expect(ok).toBe(true);
        expect((await store.loadPlatform()).every((entry) => entry.version === 1)).toBe(true);
    });

    it('says "conflict" when someone saved after this admin loaded, and reloads on request', async () => {
        const store = memoryJourneyStore([mail('a')]);
        const { result } = mount(store, { level: 'platform' });
        await ready(result);
        await store.savePlatform({ ...mail('a'), name: 'Theirs' }, 1);
        await act(async () => {
            await result.current.save([{ ...mail('a'), name: 'Mine' }], result.current.base);
        });
        expect(result.current.failure).toBe('conflict');
        act(() => result.current.reload());
        await waitFor(() => expect(result.current.journeys[0].name).toBe('Theirs'));
        expect(result.current.failure).toBeUndefined();
    });

    it('below the platform saves only the own layer and leaves the platform journey alone', async () => {
        const store = memoryJourneyStore([mail('a')]);
        const { result } = mount(store, { level: 'tenant', tenantId: 't1' });
        await ready(result);
        const [journey] = result.current.journeys;
        const edited = { ...journey, phases: { ...journey.phases, flight: [...journey.phases.flight, extra] } };
        await act(async () => {
            await result.current.save([edited], result.current.base);
        });
        expect(result.current.failure).toBeUndefined();
        const [layer] = await store.loadLayers('tenant', 't1');
        expect(Object.keys(layer.layer.phases)).toEqual(['flight']);
        expect((await store.loadPlatform())[0].journey).toEqual(mail('a'));
        await waitFor(() => expect(result.current.journeys[0].phases.flight.map((step) => step.id)).toContain('extra'));
    });

    it('a centre sees its Träger layer under its own', async () => {
        const store = memoryJourneyStore(
            [mail('a')],
            [{ journeyId: 'a', level: 'tenant', ownerId: 't1', phases: { flight: [extra] } }],
        );
        const { result } = mount(store, { level: 'agency', tenantId: 't1', agencyId: 'c1' });
        await ready(result);
        expect(result.current.journeys[0].phases.flight.map((step) => step.id)).toEqual(['extra']);
    });

    it('below the platform says when the platform has nothing stored to layer on', async () => {
        const { result } = mount(memoryJourneyStore(), { level: 'tenant', tenantId: 't1' });
        await ready(result);
        expect(result.current.platformMissing).toBe(true);
    });

    it('reports a load failure instead of showing the shipped journeys', async () => {
        const store = { ...memoryJourneyStore(), loadPlatform: () => Promise.reject(new Error('down')) };
        const { result } = mount(store, { level: 'platform' });
        await waitFor(() => expect(result.current.status).toBe('error'));
    });

    it('a second try after a conflict still conflicts: the draft never overwrites the newer version', async () => {
        const store = memoryJourneyStore([mail('a')]);
        const { result } = mount(store, { level: 'platform' });
        await ready(result);
        const { base } = result.current;
        await store.savePlatform({ ...mail('a'), name: 'Theirs' }, 1);
        await act(async () => {
            await result.current.save([{ ...mail('a'), name: 'Mine' }], base);
        });
        // The refetch has loaded the newer version; the open dialog still saves against its base.
        await waitFor(() => expect(result.current.journeys[0].name).toBe('Theirs'));
        await act(async () => {
            await result.current.save([{ ...mail('a'), name: 'Mine' }], base);
        });
        expect(result.current.failure).toBe('conflict');
        expect((await store.loadPlatform())[0].journey.name).toBe('Theirs');
    });

    it('does not store a deleted topic dropping out of journeys the editor left alone', async () => {
        const withGone = { ...mail('a'), routes: { ...mail('a').routes, registration: [1, 99] } };
        const store = memoryJourneyStore([withGone]);
        const { result } = mount(store, { level: 'platform' });
        await ready(result);
        expect(result.current.prunedTopics).toBe(1);
        await act(async () => {
            await result.current.save(result.current.journeys, result.current.base);
        });
        expect((await store.loadPlatform())[0]).toMatchObject({
            version: 1,
            journey: { routes: { registration: [1, 99] } },
        });
    });
});
