// @vitest-environment node
import { expect, it, vi } from 'vite-plus/test';
import { QueryClient } from '@tanstack/react-query';
import {
    createQueryLifetimeObserver,
    observeQueryContext,
    observeQueryTransport,
    queryLifetimeGate,
    QUERY_LIFETIME_SELECTION,
} from './query-lifetime-diagnostic';

const owner = { id: 'diagnostic-usermanagement-users-prefix-through-tenant--case-1', name: 'Case 1' };
const key = ['CONSULTANTS', undefined, 1, 'UPDATE_DATE', 'DESC', 10, {}, false];
const url =
    'https://admin.example.test/service/users/consultants/search?query=*&page=1&perPage=10&order=DESC&field=UPDATE_DATE';
const fixture = () => {
    const events: Record<string, unknown>[] = [];
    const observer = createQueryLifetimeObserver(
        (value) => events.push(value),
        () => 10,
    );
    const client = new QueryClient();
    observer.bind(client, owner);
    const releaseOwner = observer.mount(client);
    const query = (signal: AbortSignal) => observer.query({ client, queryKey: key, signal, meta: undefined });
    const dispatch = (signal: AbortSignal, promise = new Promise<Response>(() => {})) => {
        query(signal);
        observer.transport(new Request(url, { signal }), signal, promise);
    };
    return { observer, client, events, releaseOwner, dispatch };
};

it('keeps ordinary/build/unknown profiles inert and rejects an unknown closed selection', () => {
    expect(queryLifetimeGate('production', 'functional-pilot', QUERY_LIFETIME_SELECTION)).toBe(false);
    expect(queryLifetimeGate('test', 'unknown', QUERY_LIFETIME_SELECTION)).toBe(false);
    expect(queryLifetimeGate('test', 'strict', QUERY_LIFETIME_SELECTION)).toBe(false);
    expect(queryLifetimeGate('test', 'functional-pilot', undefined)).toBe(false);
    expect(() => queryLifetimeGate('test', 'functional-pilot', 'all')).toThrow('Unknown query lifetime selection');
    const read = vi.fn(() => {
        throw new Error('Must never inspect ordinary metadata');
    });
    observeQueryContext(read);
    observeQueryTransport(read);
    expect(read).not.toHaveBeenCalled();
});

it('binds the actual client/key/signal and one causal arrival, retaining abort and original rejection', async () => {
    const f = fixture();
    const controller = new AbortController();
    const failure = new Error('original failure');
    const promise = Promise.reject(failure);
    f.dispatch(controller.signal, promise);
    const arrival = new Request(url);
    f.observer.msw('request:start', 'msw-1', arrival);
    f.observer.unhandled(arrival);
    controller.abort();
    await expect(promise).rejects.toBe(failure);
    f.observer.msw('request:end', 'msw-1', new Request(url));
    expect(f.observer.invalid()).toBe(false);
    expect(f.events.find((event) => event.phase === 'query')).toMatchObject({
        clientId: 'client-1',
        owner,
        key: ['CONSULTANTS', null, 1, 'UPDATE_DATE', 'DESC', 10, {}, false],
        mounted: true,
    });
    expect(f.events.find((event) => event.phase === 'msw')).toMatchObject({ mswId: 'msw-1', requestId: 'request-1' });
    expect(f.events.some((event) => event.phase === 'request-abort')).toBe(true);
    expect(f.events.find((event) => event.phase === 'settled')).toMatchObject({
        outcome: 'rejected',
        errorName: 'Error',
        aborted: true,
    });
    f.releaseOwner();
    f.observer.release();
    f.client.clear();
});

it('retains aborted/settled candidates and invalidates duplicate arrivals instead of guessing FIFO', async () => {
    const f = fixture();
    const first = new AbortController();
    const second = new AbortController();
    f.dispatch(first.signal, Promise.resolve(new Response(null, { status: 204 })));
    first.abort();
    await Promise.resolve();
    f.dispatch(second.signal);
    f.observer.msw('request:start', 'ambiguous', new Request(url));
    expect(f.observer.invalid()).toBe(true);
    expect(f.events.find((event) => event.phase === 'ambiguous')).toMatchObject({
        candidates: ['request-1', 'request-2'],
    });
    expect(f.events.find((event) => event.phase === 'msw')).toMatchObject({ requestId: null });
    f.observer.release();
    f.client.clear();
});

it('excludes only a previously proven-bound request from later candidates', () => {
    const f = fixture();
    f.dispatch(new AbortController().signal);
    f.observer.msw('request:start', 'first', new Request(url));
    f.dispatch(new AbortController().signal);
    f.observer.msw('request:start', 'second', new Request(url));
    expect(f.observer.invalid()).toBe(false);
    expect(f.events.filter((event) => event.phase === 'msw').map((event) => event.requestId)).toEqual([
        'request-1',
        'request-2',
    ]);
    f.observer.release();
    f.client.clear();
});

it.each(['owner', 'release', 'unknown-key', 'missing-start', 'unbound-unhandled'] as const)(
    'invalidates unsupported observer ownership: %s',
    (kind) => {
        const f = fixture();
        if (kind === 'owner') f.observer.bind(f.client, { id: 'foreign', name: 'Case 2' });
        if (kind === 'release') {
            f.releaseOwner();
            f.releaseOwner();
        }
        if (kind === 'unknown-key')
            f.observer.query({
                client: f.client,
                queryKey: ['secret'],
                signal: new AbortController().signal,
                meta: undefined,
            });
        if (kind === 'unbound-unhandled') f.observer.unhandled(new Request(url));
        if (kind === 'missing-start') f.observer.msw('request:end', 'unknown', new Request(url));
        expect(f.observer.invalid()).toBe(true);
        f.observer.release();
        f.client.clear();
    },
);

it('releases listeners idempotently and never replaces an original error when metadata sinks fail', () => {
    const f = fixture();
    const controller = new AbortController();
    f.dispatch(controller.signal);
    f.observer.boundary(owner.id, 'before-clear');
    expect(f.events.find((event) => event.phase === 'boundary')).toMatchObject({ clients: [{ mounted: true, owner }] });
    f.observer.release();
    f.observer.release();
    const count = f.events.length;
    controller.abort();
    expect(f.events).toHaveLength(count);
    f.client.clear();
    const broken = createQueryLifetimeObserver(
        () => {
            throw new Error('sink failed');
        },
        () => 0,
    );
    expect(() => broken.bind(new QueryClient(), owner)).not.toThrow();
    expect(broken.invalid()).toBe(true);
    broken.release();
});

// Exact native CSF IDs captured in official baseline artifact12836944236.
it.each([
    ['diagnostic-usermanagement-users-prefix-through-tenant--case-1', 'Case 1'],
    ['diagnostic-usermanagement-users-prefix-through-tenant--case-2', 'Case 2'],
    ['diagnostic-usermanagement-users-prefix-through-tenant--case-3', 'Case 3'],
    ['diagnostic-usermanagement-users-prefix-through-tenant--case-4', 'Case 4'],
    ['diagnostic-usermanagement-users-prefix-through-tenant--case-5', 'Case 5'],
    ['diagnostic-usermanagement-users-prefix-through-tenant--case-6', 'Case 6'],
])('binds the captured Storybook owner %s without inventing an alias', (id, name) => {
    const receipts: Record<string, unknown>[] = [];
    const observer = createQueryLifetimeObserver(
        (value) => receipts.push(value),
        () => 0,
    );
    const client = new QueryClient();
    observer.bind(client, { id, name });
    const release = observer.mount(client);
    expect(observer.invalid()).toBe(false);
    expect(receipts.find((value) => value.phase === 'mounted')).toMatchObject({
        owner: { id, name },
        clientId: 'client-1',
    });
    release();
    observer.release();
    client.clear();
});
