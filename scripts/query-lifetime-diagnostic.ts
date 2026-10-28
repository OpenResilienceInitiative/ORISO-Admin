import type { QueryClient, QueryFunctionContext } from '@tanstack/react-query';

export const QUERY_LIFETIME_SELECTION = 'users-prefix-through-tenant';
export const queryLifetimeGate = (mode: string, profile: string | undefined, selection: string | undefined) => {
    if (mode !== 'test' || profile !== 'functional-pilot' || !selection) return false;
    if (selection !== QUERY_LIFETIME_SELECTION) throw new Error('Unknown query lifetime selection');
    return true;
};
export const queryLifetimeEnabled = () =>
    queryLifetimeGate(
        import.meta.env.MODE,
        import.meta.env.ORISO_VERIFICATION_PROFILE,
        import.meta.env.VITE_ORISO_QUERY_LIFETIME,
    );

type Owner = { id: string; name: string };
type Receipt = Record<string, unknown>;
const keyEvidence = (key: readonly unknown[]) => {
    if (
        key.length !== 8 ||
        typeof key[0] !== 'string' ||
        !['CONSULTANTS', 'TENANT-ADMINS', 'AGENCY-ADMINS'].includes(key[0])
    )
        throw new Error();
    if (key[1] !== undefined && key[1] !== '' && key[1] !== '*') throw new Error();
    if (
        (key[3] !== undefined && !['UPDATE_DATE', 'LASTNAME', 'FIRSTNAME'].some((item) => item === key[3])) ||
        (key[4] !== undefined && key[4] !== 'ASC' && key[4] !== 'DESC')
    )
        throw new Error();
    if (
        ![key[2], key[5]].every(
            (value) =>
                value === undefined || (Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 100),
        )
    )
        throw new Error();
    const filters = key[6];
    if (!filters || typeof filters !== 'object' || Object.keys(filters).length !== 0 || typeof key[7] !== 'boolean')
        throw new Error();
    return [key[0], key[1] ?? null, key[2] ?? null, key[3] ?? null, key[4] ?? null, key[5] ?? null, {}, key[7]];
};

/** Temporary observer: no metadata can approve a request or replace its original outcome. */
export const createQueryLifetimeObserver = (sink: (value: Receipt) => void, now: () => number) => {
    let sequence = 0;
    let invalid = false;
    let released = false;
    const dispose: Array<() => void> = [];
    const clients = new Map<QueryClient, { id: string; owner: Owner; mounted: boolean; canvas?: HTMLElement }>();
    const invocations = new WeakMap<AbortSignal, { id: string; clientId: string; owner: Owner; key: unknown[] }>();
    const dispatches: Array<{
        id: string;
        key: string;
        at: number;
        bound?: string;
        query: { id: string; clientId: string; owner: Owner; key: unknown[] };
        signal: AbortSignal;
    }> = [];
    const arrivals = new Map<string, string | null>();
    const mswRequests = new WeakMap<Request, string>();
    const event = (phase: string, value: Receipt = {}) => {
        if (released || sequence >= 512) return;
        sequence += 1;
        if (sequence === 512) {
            invalid = true;
            phase = 'invalid';
            value = { reason: 'event-budget' };
        }
        try {
            sink({
                queryLifetime: 1,
                selection: QUERY_LIFETIME_SELECTION,
                sequence,
                at: now(),
                phase,
                invalid,
                ...value,
            });
        } catch {
            invalid = true;
        }
    };
    const fail = (reason: string) => {
        invalid = true;
        event('invalid', { reason });
    };
    const safe = (operation: () => void) => {
        if (!released)
            try {
                operation();
            } catch {
                fail('metadata-unavailable');
            }
    };
    const listen = (signal: AbortSignal, phase: string, ids: Receipt) => {
        const listener = () => event(phase, ids);
        signal.addEventListener('abort', listener, { once: true });
        dispose.push(() => signal.removeEventListener('abort', listener));
    };
    event('witness', { contract: 'client-key-signal-request-msw-v1' });
    return {
        bind(client: QueryClient, owner: Owner, canvas?: HTMLElement) {
            safe(() => {
                const previous = clients.get(client);
                if (previous) {
                    if (previous.owner.id !== owner.id || previous.owner.name !== owner.name)
                        fail('client-owner-rebound');
                    return;
                }
                if (
                    clients.size >= 24 ||
                    !/^diagnostic-usermanagement-users-prefix-through-tenant--case[1-6]$/.test(owner.id) ||
                    !/^Case [1-6]$/.test(owner.name)
                ) {
                    fail('unknown-owner');
                    return;
                }
                const entry = {
                    id: `client-${clients.size + 1}`,
                    owner: { id: owner.id, name: owner.name },
                    mounted: false,
                    canvas,
                };
                clients.set(client, entry);
                event('client-bound', { clientId: entry.id, owner: entry.owner });
            });
        },
        mount(client: QueryClient) {
            let unsubscribe = () => {};
            safe(() => {
                const entry = clients.get(client);
                if (!entry || entry.mounted) {
                    fail('missing-or-duplicate-mount');
                    return;
                }
                entry.mounted = true;
                event('mounted', {
                    clientId: entry.id,
                    owner: entry.owner,
                    connected: entry.canvas?.isConnected ?? false,
                });
                unsubscribe = client.getQueryCache().subscribe((change) =>
                    safe(() => {
                        if (['updated', 'removed', 'observerAdded', 'observerRemoved'].includes(change.type))
                            event('cache', {
                                clientId: entry.id,
                                owner: entry.owner,
                                type: change.type,
                                observerCount: change.query.getObserversCount(),
                                fetchStatus: change.query.state.fetchStatus,
                            });
                    }),
                );
                dispose.push(unsubscribe);
            });
            return () =>
                safe(() => {
                    unsubscribe();
                    const entry = clients.get(client);
                    if (!entry?.mounted) {
                        fail('duplicate-owner-release');
                        return;
                    }
                    entry.mounted = false;
                    event('unmounted', {
                        clientId: entry.id,
                        owner: entry.owner,
                        connected: entry.canvas?.isConnected ?? false,
                    });
                });
        },
        query(context: QueryFunctionContext) {
            safe(() => {
                const entry = clients.get(context.client);
                if (!entry || invocations.has(context.signal) || dispatches.length >= 64) {
                    fail('unbound-or-duplicate-query');
                    return;
                }
                const query = {
                    id: `query-${sequence + 1}`,
                    clientId: entry.id,
                    owner: entry.owner,
                    key: keyEvidence(context.queryKey),
                };
                invocations.set(context.signal, query);
                event('query', { ...query, mounted: entry.mounted, aborted: context.signal.aborted });
                listen(context.signal, 'query-abort', { queryId: query.id, clientId: entry.id, owner: entry.owner });
            });
        },
        transport(request: Request, signal: AbortSignal | undefined, promise: Promise<Response>) {
            safe(() => {
                const query = signal && invocations.get(signal);
                if (!query) return;
                const url = new URL(request.url);
                if (
                    ![
                        '/service/users/consultants/search',
                        '/service/useradmin/tenantadmins/search',
                        '/service/useradmin/agencyadmins/search',
                    ].includes(url.pathname) ||
                    dispatches.length >= 64
                ) {
                    fail('unknown-request');
                    return;
                }
                const at = now();
                const item = {
                    id: `request-${dispatches.length + 1}`,
                    key: `${request.method} ${url.pathname}${url.search}`,
                    at,
                    query,
                    signal: request.signal,
                };
                dispatches.push(item);
                const ids = { requestId: item.id, queryId: query.id, clientId: query.clientId, owner: query.owner };
                event('dispatch', {
                    ...ids,
                    method: request.method,
                    path: url.pathname,
                    query: url.search,
                    aborted: request.signal.aborted,
                });
                listen(request.signal, 'request-abort', ids);
                // Observe the ORIGINAL promise; both observers resolve and never replace its result/error.
                void promise.then(
                    (response) =>
                        safe(() =>
                            event('settled', {
                                ...ids,
                                outcome: 'response',
                                status: response.status,
                                aborted: request.signal.aborted,
                            }),
                        ),
                    (error) =>
                        safe(() =>
                            event('settled', {
                                ...ids,
                                outcome: 'rejected',
                                errorName: error instanceof Error ? error.name : 'non-error',
                                aborted: request.signal.aborted,
                            }),
                        ),
                );
            });
        },
        boundary(ownerId: string, phase: string) {
            safe(() =>
                event('boundary', {
                    ownerId,
                    boundary: phase,
                    clients: [...clients.values()].map((entry) => ({
                        clientId: entry.id,
                        owner: entry.owner,
                        mounted: entry.mounted,
                        connected: entry.canvas?.isConnected ?? false,
                    })),
                }),
            );
        },
        msw(phase: string, requestId: string, request: Request) {
            safe(() => {
                const url = new URL(request.url);
                if (!/\/service\/users\/consultants\/search$/.test(url.pathname)) return;
                if (!requestId || requestId.length > 100) {
                    fail('unknown-msw-id');
                    return;
                }
                if (phase === 'request:start') {
                    mswRequests.set(request, requestId);
                    if (arrivals.has(requestId)) {
                        fail('duplicate-msw-arrival');
                        return;
                    }
                    const key = `${request.method} ${url.pathname}${url.search}`;
                    // Never discard candidates on abort, settlement, route, case or presumed FIFO.
                    const candidates = dispatches.filter((item) => !item.bound && item.key === key && item.at <= now());
                    if (candidates.length !== 1) {
                        arrivals.set(requestId, null);
                        event('ambiguous', { mswId: requestId, candidates: candidates.map((item) => item.id) });
                        fail('non-bijective-arrival');
                    } else {
                        candidates[0].bound = requestId;
                        arrivals.set(requestId, candidates[0].id);
                    }
                }
                const bound = arrivals.get(requestId);
                if (bound === undefined) {
                    fail('msw-event-without-start');
                    return;
                }
                event('msw', { mswPhase: phase, mswId: requestId, requestId: bound, aborted: request.signal.aborted });
            });
        },
        unhandled(request: Request) {
            safe(() => {
                if (!/\/service\/users\/consultants\/search$/.test(new URL(request.url).pathname)) return;
                const id = mswRequests.get(request);
                if (!id || !arrivals.has(id)) {
                    fail('unhandled-without-msw-start');
                    return;
                }
                event('msw', {
                    mswPhase: 'onUnhandledRequest',
                    mswId: id,
                    requestId: arrivals.get(id),
                    aborted: request.signal.aborted,
                });
            });
        },
        invalid: () => invalid,
        release() {
            if (released) return;
            event('released', { invalid });
            released = true;
            dispose.forEach((release) => {
                try {
                    release();
                } catch {
                    invalid = true;
                }
            });
        },
    };
};

let current: ReturnType<typeof createQueryLifetimeObserver> | undefined;
const observer = () => {
    if (!queryLifetimeEnabled()) return undefined;
    current ??= createQueryLifetimeObserver(
        (value) => console.info(JSON.stringify(value)),
        () => performance.now(),
    );
    return current;
};
const observe = (operation: (value: NonNullable<typeof current>) => void) => {
    try {
        const value = observer();
        if (value) operation(value);
    } catch {
        /* Metadata must not replace native errors. Missing witness invalidates the probe. */
    }
};
export const bindQueryOwner = (client: QueryClient, owner: Owner, canvas?: HTMLElement) =>
    observe((value) => value.bind(client, owner, canvas));
export const mountQueryOwner = (client: QueryClient) => {
    let release = () => {};
    observe((value) => {
        release = value.mount(client);
    });
    return release;
};
export const observeQueryContext = (read: () => QueryFunctionContext) => observe((value) => value.query(read()));
export const observeQueryTransport = (
    read: () => { request: Request; signal?: AbortSignal; promise: Promise<Response> },
) =>
    observe((value) => {
        const input = read();
        value.transport(input.request, input.signal, input.promise);
    });
export const observeQueryBoundary = (read: () => { ownerId: string; phase: string }) =>
    observe((value) => {
        const input = read();
        value.boundary(input.ownerId, input.phase);
    });
export const observeQueryMSW = (phase: string, input: { requestId: string; request: Request }) =>
    observe((value) => value.msw(phase, input.requestId, input.request));

export const observeQueryUnhandled = (read: () => Request) => observe((value) => value.unhandled(read()));
