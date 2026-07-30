import { Option } from '../components/mui/MuiSelectField';

interface AgencyWithTopics {
    id: number | string;
    topics?: Array<{ id: number | string }>;
}

/**
 * Mirrors the backend ADR-003 rule (ConsultantTopicAgencyCompatibilityValidator): a consultant
 * topic is only valid if at least one of the selected agencies offers it. Returns the selected
 * topics that no selected agency covers, so the caller can name the mismatch before submitting.
 */
export const findUncoveredTopics = (
    selectedAgencies: Option[],
    selectedTopics: Option[],
    agencies: AgencyWithTopics[],
): Option[] => {
    if (!selectedTopics?.length) {
        return [];
    }
    const selectedAgencyIds = new Set((selectedAgencies || []).map(({ value }) => String(value)));
    const coveredTopicIds = new Set(
        (agencies || [])
            .filter((agency) => selectedAgencyIds.has(String(agency.id)))
            .flatMap((agency) => agency.topics || [])
            .map((topic) => String(topic.id)),
    );
    return selectedTopics.filter(({ value }) => !coveredTopicIds.has(String(value)));
};
