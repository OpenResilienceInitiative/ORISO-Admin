import { Option } from '../../../components/mui/MuiSelectField';

export interface CentreWithTopics {
    id: number | string;
    name?: string;
    postcode?: string;
    city?: string;
    topics?: Array<{ id: number | string | null; name?: string }>;
}

/** Server shape (#1264). An entry without agencyId is a legacy assignment valid at every centre. */
export interface AgencyTopicsEntry {
    agencyId?: number | string | null;
    topicIds?: Array<number | string>;
}

export interface StoredTopics {
    topicsByAgency?: AgencyTopicsEntry[];
    topics?: Array<{ id: number | string | null }>;
}

/** Form value: picked topics keyed by centre id. */
export type TopicsByCentre = Record<string, Array<Option | string> | undefined>;

export interface TopicsLostByMove {
    topics: Option[];
    target: CentreWithTopics;
}

const idOf = (entry: Option | string) => String(typeof entry === 'string' ? entry : entry.value);

export const centreTopicOptions = (centre?: CentreWithTopics): Option[] =>
    (centre?.topics ?? [])
        .filter((topic) => topic.id !== null && topic.id !== undefined)
        .map((topic) => ({ value: String(topic.id), label: topic.name ?? String(topic.id) }));

export const centreLabel = (centre: CentreWithTopics): string => {
    const place = [centre.postcode, centre.city].filter(Boolean).join(' ');
    return place ? `${centre.name} (${place})` : `${centre.name}`;
};

export const findCentre = (centres: CentreWithTopics[], id: string) =>
    centres.find((centre) => String(centre.id) === String(id));

/**
 * Pre-fills each assigned centre with its stored topics. Legacy entries, and the flat list an
 * older server returns, fill every centre that offers them. A stored topic the centre no longer
 * offers stays in (after the offered ones) so a save cannot drop it unseen; so does a legacy
 * topic no assigned centre offers.
 */
export const initialTopicsByCentre = (
    centreIds: string[],
    centres: CentreWithTopics[],
    stored: StoredTopics,
    topicName: (id: string) => string | undefined = () => undefined,
): Record<string, Option[]> => {
    const perCentre = new Map<string, Set<string>>();
    const legacy = new Set<string>();

    if (Array.isArray(stored.topicsByAgency)) {
        stored.topicsByAgency.forEach(({ agencyId, topicIds = [] }) => {
            const ids = topicIds.map(String);
            if (agencyId === null || agencyId === undefined) {
                ids.forEach((id) => legacy.add(id));
                return;
            }
            const key = String(agencyId);
            perCentre.set(key, new Set([...(perCentre.get(key) ?? []), ...ids]));
        });
    } else {
        (stored.topics ?? []).forEach(({ id }) => id !== null && id !== undefined && legacy.add(String(id)));
    }

    const offeredAnywhere = new Set(
        centreIds.flatMap((centreId) => centreTopicOptions(findCentre(centres, centreId)).map(({ value }) => value)),
    );
    const orphanLegacy = [...legacy].filter((id) => !offeredAnywhere.has(id));

    return Object.fromEntries(
        centreIds.map((centreId) => {
            const held = new Set([...(perCentre.get(centreId) ?? []), ...legacy]);
            const offered = centreTopicOptions(findCentre(centres, centreId));
            const offeredIds = new Set(offered.map(({ value }) => value));
            const dropped = [...(perCentre.get(centreId) ?? []), ...orphanLegacy]
                .filter((id, index, all) => !offeredIds.has(id) && all.indexOf(id) === index)
                .map((id) => ({ value: id, label: topicName(id) ?? id }));
            return [centreId, [...offered.filter(({ value }) => held.has(value)), ...dropped]];
        }),
    );
};

/** Picked topics the centre does not offer (any more). */
export const notOfferedAt = (centre: CentreWithTopics | undefined, picked: Array<Option | string> = []): string[] => {
    if (!centre) {
        return [];
    }
    const offered = new Set(centreTopicOptions(centre).map(({ value }) => value));
    return picked.map(idOf).filter((id) => !offered.has(id));
};

/** Whether the centres or any centre's topics differ from what was loaded. */
export const topicsChanged = (
    initial: { ids: string[]; byCentre: Record<string, Option[]> },
    centreIds: string[],
    byCentre: TopicsByCentre = {},
): boolean => {
    const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));
    if (!sameSet(initial.ids, centreIds)) {
        return true;
    }
    return centreIds.some(
        (id) => !sameSet((initial.byCentre[id] ?? []).map(idOf), [...new Set((byCentre[id] ?? []).map(idOf))]),
    );
};

export const buildTopicsPayload = (centreIds: string[], byCentre: TopicsByCentre = {}) => {
    const topicsByAgency = centreIds.map((centreId) => ({
        agencyId: Number(centreId),
        topicIds: (byCentre[centreId] ?? []).map((entry) => Number(idOf(entry))),
    }));
    const topicIds = [...new Set(topicsByAgency.flatMap((entry) => entry.topicIds))].map(String);
    return { topicIds, topicsByAgency };
};

/**
 * A move = a centre removed and another added. Returns the topics held at a removed centre that
 * survive nowhere and that no added centre offers, plus the first added centre as target.
 */
export const findTopicsLostByMove = ({
    initialCentreIds,
    centreIds,
    initialByCentre,
    byCentre,
    centres,
}: {
    initialCentreIds: string[];
    centreIds: string[];
    initialByCentre: Record<string, Option[]>;
    byCentre: TopicsByCentre;
    centres: CentreWithTopics[];
}): TopicsLostByMove | null => {
    const removed = initialCentreIds.filter((id) => !centreIds.includes(id));
    const added = centreIds.filter((id) => !initialCentreIds.includes(id));
    const target = added.map((id) => findCentre(centres, id)).find(Boolean);
    if (removed.length === 0 || !target) {
        return null;
    }

    const kept = new Set(centreIds.flatMap((id) => (byCentre[id] ?? []).map(idOf)));
    const offeredByAdded = new Set(
        added.flatMap((id) => centreTopicOptions(findCentre(centres, id)).map(({ value }) => value)),
    );
    const lost = new Map<string, Option>();
    removed
        .flatMap((id) => initialByCentre[id] ?? [])
        .filter(({ value }) => !kept.has(value) && !offeredByAdded.has(value))
        .forEach((topic) => lost.set(topic.value, topic));

    return lost.size > 0 ? { topics: [...lost.values()], target } : null;
};
