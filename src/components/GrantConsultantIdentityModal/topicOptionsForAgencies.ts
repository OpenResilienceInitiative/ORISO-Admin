import { AgencyData } from '../../types/agency';

export interface TopicOption {
    value: string;
    label: string;
}

/**
 * The topics a new consultant identity may counsel in: the union of the topics offered by the
 * selected Beratungsstellen, without duplicates, in the order they first appear.
 */
export const topicOptionsForAgencies = (
    agencies: Pick<AgencyData, 'id' | 'topics'>[],
    selectedAgencyIds: string[],
): TopicOption[] => {
    const selected = new Set(selectedAgencyIds);
    const byId = new Map<string, TopicOption>();
    agencies
        .filter((agency) => selected.has(`${agency.id}`))
        .flatMap((agency) => agency.topics || [])
        .forEach((topic) => {
            const value = `${topic.id}`;
            if (!byId.has(value)) byId.set(value, { value, label: topic.name });
        });
    return [...byId.values()];
};
