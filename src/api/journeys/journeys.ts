import { journeysEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import type { Journey } from '../../components/Journeys/journey';
import type { JourneyLayer } from '../../components/Journeys/journeyEditing';
import {
    JourneyConflictError,
    JourneyRejectedError,
    type JourneyStore,
    type StoredJourney,
    type StoredLayer,
} from '../../components/Journeys/journeyStore';

/** UserService answers (ORISO-UserService#1689). */
interface JourneyEntryDTO {
    journeyId: string;
    version: number;
    journey: Journey;
}

interface LayerEntryDTO {
    journeyId: string;
    version: number;
    phases: JourneyLayer['phases'];
}

const PATH_OF_LEVEL = { tenant: 'tenants', agency: 'agencies' } as const;

/** 409 and 400 come back as the raw response; everything else is the usual transport error. */
const rethrow = async (error: unknown): Promise<never> => {
    if (error instanceof Response) {
        const body = await error.json().catch(() => ({}));
        if (error.status === 409) throw new JourneyConflictError(Number(body.currentVersion ?? -1));
        if (error.status === 400) throw new JourneyRejectedError(String(body.error ?? ''));
    }
    throw error;
};

const call = async (url: string, method: string, body?: unknown) => {
    try {
        return await fetchData({
            url,
            method,
            skipAuth: false,
            ...(body === undefined ? {} : { bodyData: JSON.stringify(body) }),
            responseHandling: [
                FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                FETCH_ERRORS.CATCH_ALL,
            ],
        });
    } catch (error) {
        return rethrow(error);
    }
};

const toJourney = (entry: JourneyEntryDTO): StoredJourney => ({ journey: entry.journey, version: entry.version });

/** The real store. Pass it to the Journeys section where the page mounts it (ORISO-Admin#1571). */
export const httpJourneyStore: JourneyStore = {
    loadPlatform: async () => {
        // fetchData parses GET answers itself.
        const entries = (await call(`${journeysEndpoint}/platform`, FETCH_METHODS.GET)) as JourneyEntryDTO[];
        return entries.map(toJourney);
    },
    savePlatform: async (journey, version) => {
        const response = await call(
            `${journeysEndpoint}/platform/${encodeURIComponent(journey.id)}`,
            FETCH_METHODS.PUT,
            { version, journey },
        );
        return toJourney(await response.json());
    },
    deletePlatform: async (journeyId, version) => {
        await call(
            `${journeysEndpoint}/platform/${encodeURIComponent(journeyId)}?version=${version}`,
            FETCH_METHODS.DELETE,
        );
    },
    loadLayers: async (level, ownerId) => {
        const entries = (await call(
            `${journeysEndpoint}/${PATH_OF_LEVEL[level]}/${encodeURIComponent(ownerId)}/layers`,
            FETCH_METHODS.GET,
        )) as LayerEntryDTO[];
        return entries.map(
            (entry): StoredLayer => ({
                layer: { journeyId: entry.journeyId, level, ownerId, phases: entry.phases },
                version: entry.version,
            }),
        );
    },
    saveLayer: async (layer, version) => {
        const response = await call(
            `${journeysEndpoint}/${PATH_OF_LEVEL[layer.level]}/${encodeURIComponent(
                layer.ownerId,
            )}/layers/${encodeURIComponent(layer.journeyId)}`,
            FETCH_METHODS.PUT,
            { version, phases: layer.phases },
        );
        if (response.status === 204) return undefined;
        const entry = (await response.json()) as LayerEntryDTO;
        return { layer: { ...layer, phases: entry.phases }, version: entry.version };
    },
};
