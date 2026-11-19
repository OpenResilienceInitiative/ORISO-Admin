import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shippedJourneys, pruneUnknownTopics, type Journey, type JourneyLevel, type JourneyTopic } from './journey';
import { effectiveJourneys, inheritedJourneys, layersFrom, type JourneyLayer } from './journeyEditing';
import {
    JourneyConflictError,
    JourneyRejectedError,
    saveLayerChanges,
    savePlatformChanges,
    type JourneyStore,
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

/** Why a save did not go through, as the section shows it. */
export type JourneySaveFailure = 'conflict' | 'rejected' | 'failed';

export interface JourneyWorkspace {
    status: 'loading' | 'error' | 'ready';
    /** What this level sees: the platform's journeys with the layers above and its own. */
    journeys: Journey[];
    /** Below the platform: nothing is stored on the platform yet, so there is nothing to layer on. */
    platformMissing: boolean;
    /** Topics deleted since a journey was saved; they were dropped from its routes. */
    prunedTopics: number;
    saving: boolean;
    failure?: JourneySaveFailure;
    /** Saves the edited journeys of this level; resolves whether it went through. */
    save: (next: Journey[]) => Promise<boolean>;
    /** After a conflict: load again and forget the failure. */
    reload: () => void;
    dismissFailure: () => void;
}

const KEY = 'JOURNEYS';
const NONE: StoredLayer[] = [];

const failureOf = (error: unknown): JourneySaveFailure => {
    if (error instanceof JourneyConflictError) return 'conflict';
    if (error instanceof JourneyRejectedError) return 'rejected';
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
        return pruneUnknownTopics(base, topics ?? []);
    }, [stored, topics]);
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
    if (queries.some((query) => query.isError)) status = 'error';

    const reload = useCallback(() => {
        setFailure(undefined);
        client.invalidateQueries({ queryKey: [KEY] });
    }, [client]);

    const save = useCallback(
        async (next: Journey[]) => {
            setSaving(true);
            setFailure(undefined);
            try {
                if (level === 'platform') {
                    const saved = await savePlatformChanges(store, stored ?? [], next);
                    client.setQueryData([KEY, 'platform'], saved);
                } else {
                    const ownerId = level === 'tenant' ? tenantId : agencyId;
                    const own = layersFrom(next, inheritedJourneys(loaded.journeys, layers, level), level, ownerId);
                    const before = (level === 'tenant' ? tenantLayers.data : agencyLayers.data) ?? NONE;
                    const saved = await saveLayerChanges(store, before, own);
                    client.setQueryData([KEY, level, ownerId], saved);
                }
                return true;
            } catch (error) {
                setFailure(failureOf(error));
                // What was saved before the failure is stored: show it as it now is.
                client.invalidateQueries({ queryKey: [KEY] });
                return false;
            } finally {
                setSaving(false);
            }
        },
        [level, store, stored, client, tenantId, agencyId, loaded, layers, tenantLayers.data, agencyLayers.data],
    );

    return {
        status,
        journeys,
        platformMissing,
        prunedTopics: loaded.removed.length,
        saving,
        failure,
        save,
        reload,
        dismissFailure: useCallback(() => setFailure(undefined), []),
    };
};
