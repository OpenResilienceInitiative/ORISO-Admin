export interface GoLiveEvent {
    scope: 'agency' | 'tenant';
    id: number;
    live: boolean;
    occurredAt: string;
}

type GoLiveListener = (event: GoLiveEvent) => void;

const listeners = new Set<GoLiveListener>();

export const onGoLiveEvent = (listener: GoLiveListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

/**
 * Single emission point for go-live / go-offline events (concept 2026-08-19:
 * "beide Go-live-Events in Onboarding und in der Statistik akkurat tracken").
 *
 * BACKEND GAP: neither the statistics service nor the Einstiegsstatus overview
 * exposes an event endpoint yet — the persisted truth today is only the
 * agency's `offline` flag, which loses the WHEN. Every switch flip must go
 * through this function so the future endpoint lands in exactly one place;
 * until then listeners (tests, future onboarding widgets) can subscribe.
 */
export const trackGoLiveEvent = (event: Omit<GoLiveEvent, 'occurredAt'>) => {
    const enriched: GoLiveEvent = { ...event, occurredAt: new Date().toISOString() };
    listeners.forEach((listener) => listener(enriched));
    return enriched;
};
