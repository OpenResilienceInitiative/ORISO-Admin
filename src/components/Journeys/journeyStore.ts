/* eslint-disable max-classes-per-file -- the two errors of the store port belong together */
import type { Journey, JourneyLevel } from './journey';
import type { JourneyLayer } from './journeyEditing';
import { isDraftId, issueDraftIds } from './ids';

/**
 * Where journeys live (ORISO-Admin#1571). The section talks to this port only; the HTTP adapter
 * (`src/api/journeys`) talks to UserService (ORISO-UserService#1689), the memory one serves stories
 * and tests. Every write names the version it read (0 for something new); a different stored
 * version rejects with `JourneyConflictError`, so two admins never silently overwrite each other.
 */
export interface StoredJourney {
    journey: Journey;
    version: number;
}

export interface StoredLayer {
    layer: JourneyLayer;
    version: number;
}

export interface JourneyStore {
    loadPlatform(): Promise<StoredJourney[]>;
    savePlatform(journey: Journey, version: number): Promise<StoredJourney>;
    deletePlatform(journeyId: string, version: number): Promise<void>;
    loadLayers(level: Exclude<JourneyLevel, 'platform'>, ownerId: string): Promise<StoredLayer[]>;
    /** Resolves `undefined` when the layer is empty and was removed. */
    saveLayer(layer: JourneyLayer, version: number): Promise<StoredLayer | undefined>;
}

/** Someone saved after this admin loaded: reload, then edit again. */
export class JourneyConflictError extends Error {
    constructor(readonly currentVersion: number) {
        super('JOURNEY_CHANGED');
        this.name = 'JourneyConflictError';
    }
}

/** The server refused a journey against its rules; `reason` is its message, for the log only. */
export class JourneyRejectedError extends Error {
    constructor(readonly reason: string) {
        super('JOURNEY_REJECTED');
        this.name = 'JourneyRejectedError';
    }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Saves what changed between what was loaded and what the editor applies: new and changed
 * journeys, and deletes the removed ones, each with the version it was loaded at. Returns the
 * stored state; the first conflict stops the run (what was saved before it stays saved).
 */
export const savePlatformChanges = async (
    store: JourneyStore,
    loaded: StoredJourney[],
    next: Journey[],
): Promise<StoredJourney[]> => {
    const versionOf = new Map(loaded.map((entry) => [entry.journey.id, entry]));
    const result: StoredJourney[] = [];
    // eslint-disable-next-line no-restricted-syntax -- one request after the other, on purpose
    for (const journey of next) {
        const before = versionOf.get(journey.id);
        if (before && same(before.journey, journey)) result.push(before);
        // eslint-disable-next-line no-await-in-loop -- a conflict must stop the rest
        else result.push(await store.savePlatform(journey, before?.version ?? 0));
    }
    const kept = new Set(next.map((journey) => journey.id));
    // eslint-disable-next-line no-restricted-syntax -- see above
    for (const entry of loaded) {
        // eslint-disable-next-line no-await-in-loop -- see above
        if (!kept.has(entry.journey.id)) await store.deletePlatform(entry.journey.id, entry.version);
    }
    return result;
};

/** Saves the layers of one owner: changed ones are written, ones gone empty are removed. */
export const saveLayerChanges = async (
    store: JourneyStore,
    loaded: StoredLayer[],
    next: JourneyLayer[],
): Promise<StoredLayer[]> => {
    const byJourney = new Map(loaded.map((entry) => [entry.layer.journeyId, entry]));
    const result: StoredLayer[] = [];
    const touched = new Set<string>();
    // eslint-disable-next-line no-restricted-syntax -- one request after the other, on purpose
    for (const layer of next) {
        touched.add(layer.journeyId);
        const before = byJourney.get(layer.journeyId);
        if (before && same(before.layer.phases, layer.phases)) {
            result.push(before);
        } else {
            // eslint-disable-next-line no-await-in-loop -- a conflict must stop the rest
            const saved = await store.saveLayer(layer, before?.version ?? 0);
            if (saved) result.push(saved);
        }
    }
    // eslint-disable-next-line no-restricted-syntax -- see above
    for (const entry of loaded) {
        if (!touched.has(entry.layer.journeyId)) {
            // eslint-disable-next-line no-await-in-loop -- see above
            await store.saveLayer({ ...entry.layer, phases: {} }, entry.version);
        }
    }
    return result;
};

/** A store in memory with the same version and id rules as the server; for stories and tests. */
export const memoryJourneyStore = (initial: Journey[] = [], layers: JourneyLayer[] = []): JourneyStore => {
    const journeys = new Map<string, StoredJourney>(
        initial.map((journey) => [journey.id, { journey: structuredClone(journey), version: 1 }]),
    );
    const layerKey = (layer: Pick<JourneyLayer, 'level' | 'ownerId' | 'journeyId'>) =>
        `${layer.level}/${layer.ownerId}/${layer.journeyId}`;
    const stored = new Map<string, StoredLayer>(
        layers.map((layer) => [layerKey(layer), { layer: structuredClone(layer), version: 1 }]),
    );
    const check = (current: number, expected: number) => {
        if (current !== expected) throw new JourneyConflictError(current);
    };
    return {
        loadPlatform: async () => [...journeys.values()].map((entry) => structuredClone(entry)),
        savePlatform: async (journey, version) => {
            check(isDraftId(journey.id) ? 0 : journeys.get(journey.id)?.version ?? 0, version);
            const saved = issueDraftIds(structuredClone(journey));
            const entry = { journey: saved, version: version + 1 };
            journeys.set(saved.id, entry);
            return structuredClone(entry);
        },
        deletePlatform: async (journeyId, version) => {
            check(journeys.get(journeyId)?.version ?? 0, version);
            journeys.delete(journeyId);
            [...stored.keys()].filter((key) => key.endsWith(`/${journeyId}`)).forEach((key) => stored.delete(key));
        },
        loadLayers: async (level, ownerId) =>
            [...stored.values()]
                .filter((entry) => entry.layer.level === level && entry.layer.ownerId === ownerId)
                .map((entry) => structuredClone(entry)),
        saveLayer: async (layer, version) => {
            const key = layerKey(layer);
            check(stored.get(key)?.version ?? 0, version);
            if (!journeys.has(layer.journeyId)) throw new JourneyRejectedError('no platform journey');
            if (Object.keys(layer.phases).length === 0) {
                stored.delete(key);
                return undefined;
            }
            const entry = { layer: issueDraftIds(structuredClone(layer)), version: version + 1 };
            stored.set(key, entry);
            return structuredClone(entry);
        },
    };
};
