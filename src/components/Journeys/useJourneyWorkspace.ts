import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FETCH_ERRORS } from '../../api/fetchData';
import type { ConversationType } from '../ConversationModules/conversationModule';
import { shippedJourneys, pruneUnknownTopics, type Journey, type JourneyLevel, type JourneyTopic } from './journey';
import { effectiveJourneys, inheritedJourneys, layersFrom, type JourneyLayer } from './journeyEditing';
import {
    JourneyConflictError,
    JourneyRejectedError,
    saveLayerChanges,
    savePlatformChanges,
    type JourneyStore,
    type StoredJourney,
    type StoredLayer,
} from './journeyStore';

/** Where the editor stands: the level, and the Träger (and centre) whose layers apply. */
export interface JourneyScope {
    level: JourneyLevel;
    /** The Träger: its layer applies on the Träger and the centre level. */
    tenantId?: string;
    /** The centre: only on the centre level. */
    agencyId?: string;
}

/**
 * Why a save did not go through, as the section shows it. `conflict` also covers a journey the
 * platform deleted meanwhile (404): reloading is the way on in both cases.
 */
export type JourneySaveFailure = 'conflict' | 'rejected' | 'forbidden' | 'failed';

/** What a save stored: the platform journeys, or this level's own layers. */
export type JourneySaveResult = { ok: false } | { ok: true; journeys?: Journey[]; layers?: JourneyLayer[] };

/**
 * What an editor started from: the stored versions and what was shown. A save always names these
 * versions, never ones loaded later, so a change someone else made meanwhile is a conflict and
 * never overwritten by an older draft.
 */
export interface JourneyBase {
    stored: StoredJourney[];
    tenantLayers: StoredLayer[];
    agencyLayers: StoredLayer[];
    /** The platform journeys as shown (topics deleted since dropped from their routes). */
    shown: Journey[];
    layers: JourneyLayer[];
}

export interface JourneyWorkspace {
    /** `forbidden`: this admin may not read the journeys of this level (403). */
    status: 'loading' | 'error' | 'forbidden' | 'ready';
    /** What this level sees: the platform's journeys with the layers above and its own. */
    journeys: Journey[];
    /** Below the platform: nothing is stored on the platform yet, so there is nothing to layer on. */
    platformMissing: boolean;
    /** Topics deleted since a journey of this type was saved; they were dropped from its routes. */
    prunedTopicsOf: (type: ConversationType) => number;
    saving: boolean;
    failure?: JourneySaveFailure;
    /** What an editor starts from; take it when the dialog opens. */
    base: JourneyBase;
    /** Saves the edited journeys of this level against `base`; resolves what was stored. */
    save: (next: Journey[], base: JourneyBase) => Promise<JourneySaveResult>;
    /** After a conflict: load again and forget the failure. */
    reload: () => void;
    dismissFailure: () => void;
}

const KEY = 'JOURNEYS';
const NONE: StoredLayer[] = [];
const NO_JOURNEYS: StoredJourney[] = [];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const isForbidden = (error: unknown) => error instanceof Error && error.message === FETCH_ERRORS.FORBIDDEN;

const failureOf = (error: unknown): JourneySaveFailure => {
    if (error instanceof JourneyConflictError) return 'conflict';
    if (error instanceof JourneyRejectedError) return 'rejected';
    if (isForbidden(error)) return 'forbidden';
    return 'failed';
};

/**
 * The journeys of one level, loaded from the store and saved back to it (ORISO-Admin#1571). The
 * platform saves whole journeys; a Träger or a centre only its own layer (ADR-036 decision 29).
 * Every save names the versions it loaded; a conflict asks to reload instead of overwriting.
 */
export const useJourneyWorkspace = (
    store: JourneyStore,
    scope: JourneyScope,
    topics: JourneyTopic[] | undefined,
    enabled = true,
): JourneyWorkspace => {
    const client = useQueryClient();
    const { level, tenantId = '', agencyId = '' } = scope;
    const platform = useQuery({ queryKey: [KEY, 'platform'], queryFn: () => store.loadPlatform(), enabled });
    const tenantLayers = useQuery({
        queryKey: [KEY, 'tenant', tenantId],
        queryFn: () => store.loadLayers('tenant', tenantId),
        enabled: enabled && level !== 'platform' && tenantId !== '',
    });
    const agencyLayers = useQuery({
        queryKey: [KEY, 'agency', agencyId],
        queryFn: () => store.loadLayers('agency', agencyId),
        enabled: enabled && level === 'agency' && agencyId !== '',
    });
    const [saving, setSaving] = useState(false);
    const [failure, setFailure] = useState<JourneySaveFailure>();

    const stored = platform.data;
    const platformMissing = level !== 'platform' && stored !== undefined && stored.length === 0;
    const loaded = useMemo(() => {
        const base = stored && stored.length > 0 ? stored.map((entry) => entry.journey) : shippedJourneys(topics ?? []);
        // An empty topic list says nothing about which topics exist: then nothing is dropped.
        return topics && topics.length > 0 ? pruneUnknownTopics(base, topics) : { journeys: base, removed: [] };
    }, [stored, topics]);
    const prunedTopicsOf = useCallback(
        (type: ConversationType) => {
            if (loaded.removed.length === 0) return 0;
            const used = new Set(
                (stored ?? NO_JOURNEYS)
                    .map((entry) => entry.journey)
                    .filter((journey) => journey.conversationType === type)
                    .flatMap((journey) => [
                        ...journey.routes.registration,
                        ...journey.routes.links.flatMap((link) => link.topicIds),
                    ]),
            );
            return loaded.removed.filter((id) => used.has(id)).length;
        },
        [loaded, stored],
    );
    const layers = useMemo<JourneyLayer[]>(
        () => [...(tenantLayers.data ?? NONE), ...(agencyLayers.data ?? NONE)].map((entry) => entry.layer),
        [tenantLayers.data, agencyLayers.data],
    );
    const journeys = useMemo(
        () => (level === 'platform' ? loaded.journeys : effectiveJourneys(loaded.journeys, layers)),
        [level, loaded, layers],
    );

    const queries = [
        platform,
        ...(level !== 'platform' && tenantId !== '' ? [tenantLayers] : []),
        ...(level === 'agency' && agencyId !== '' ? [agencyLayers] : []),
    ];
    let status: JourneyWorkspace['status'] = 'ready';
    if (!enabled || topics === undefined || queries.some((query) => query.isPending)) status = 'loading';
    if (queries.some((query) => query.isError)) {
        status = queries.some((query) => isForbidden(query.error)) ? 'forbidden' : 'error';
    }

    const reload = useCallback(() => {
        setFailure(undefined);
        client.invalidateQueries({ queryKey: [KEY] });
    }, [client]);

    const base = useMemo<JourneyBase>(
        () => ({
            stored: stored ?? NO_JOURNEYS,
            tenantLayers: tenantLayers.data ?? NONE,
            agencyLayers: agencyLayers.data ?? NONE,
            shown: loaded.journeys,
            layers,
        }),
        [stored, tenantLayers.data, agencyLayers.data, loaded, layers],
    );

    const save = useCallback(
        async (next: Journey[], from: JourneyBase) => {
            setSaving(true);
            setFailure(undefined);
            try {
                if (level === 'platform') {
                    // A journey the editor left as shown is written back as stored: dropping a
                    // deleted topic from journeys nobody opened is not a change of theirs.
                    const kept = next.map((journey) => {
                        const shown = from.shown.find((candidate) => candidate.id === journey.id);
                        const original = from.stored.find((entry) => entry.journey.id === journey.id);
                        return shown && original && same(shown, journey) ? original.journey : journey;
                    });
                    const saved = await savePlatformChanges(store, from.stored, kept);
                    client.setQueryData([KEY, 'platform'], saved);
                    return { ok: true, journeys: saved.map((entry) => entry.journey) };
                }
                {
                    const ownerId = level === 'tenant' ? tenantId : agencyId;
                    const own = layersFrom(next, inheritedJourneys(from.shown, from.layers, level), level, ownerId);
                    const before = level === 'tenant' ? from.tenantLayers : from.agencyLayers;
                    const saved = await saveLayerChanges(store, before, own);
                    client.setQueryData([KEY, level, ownerId], saved);
                    return { ok: true, layers: saved.map((entry) => entry.layer) };
                }
            } catch (error) {
                setFailure(failureOf(error));
                // Show what is stored now, part of this save included; the open draft keeps its base.
                client.invalidateQueries({ queryKey: [KEY] });
                return { ok: false };
            } finally {
                setSaving(false);
            }
        },
        [level, store, client, tenantId, agencyId],
    );

    return {
        status,
        journeys,
        platformMissing,
        prunedTopicsOf,
        saving,
        failure,
        base,
        save,
        reload,
        dismissFailure: useCallback(() => setFailure(undefined), []),
    };
};
