import getAgencyDataById, { AgencyAccessError } from './getAgencyById';
import { agencyEndpointBase } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

export const ADD_TOPICS_ERRORS = {
    FORBIDDEN: 'ADD_TOPICS_FORBIDDEN',
    ONE_TOPIC_PER_AGENCY: 'ADD_TOPICS_ONE_TOPIC_PER_AGENCY',
    SETTINGS_UNAVAILABLE: 'ADD_TOPICS_SETTINGS_UNAVAILABLE',
    FAILED: 'ADD_TOPICS_FAILED',
};

/**
 * The agency PUT has no topics-only form: `name` and `external` are required, and these fields are
 * cleared when absent. Everything else is kept when absent, so it is left out (AgencyService
 * `AgencyAdminService#mergeAgencies`). `topicIds` is always sent: absent would clear every topic.
 */
const CLEARED_WHEN_ABSENT = [
    'name',
    'external',
    'url',
    'description',
    'postcode',
    'city',
    'street',
    'houseNumber',
    'floorBuilding',
    'country',
    'phone',
    'phoneSecondary',
    'email',
    'agencyLogo',
] as const;

const toError = (error: unknown) => {
    if (error instanceof AgencyAccessError || (error instanceof Error && error.message === FETCH_ERRORS.FORBIDDEN)) {
        return new Error(ADD_TOPICS_ERRORS.FORBIDDEN);
    }
    const reason = error instanceof Response ? error.headers.get(FETCH_ERRORS.X_REASON) : null;
    if (reason === 'ONE_TOPIC_PER_AGENCY') {
        return new Error(ADD_TOPICS_ERRORS.ONE_TOPIC_PER_AGENCY);
    }
    // 503: the server could not read the one-topic switch and refuses to add blindly; retry helps.
    if (reason === 'SETTINGS_UNAVAILABLE') {
        return new Error(ADD_TOPICS_ERRORS.SETTINGS_UNAVAILABLE);
    }
    return new Error(ADD_TOPICS_ERRORS.FAILED);
};

/** Adds topics to a centre's offer, from a fresh read, writing back as little as the API allows. */
export const addTopicsToAgency = async (agencyId: string, topicIds: string[]) => {
    let agency: Record<string, any>;
    try {
        // eslint-disable-next-line no-underscore-dangle
        agency = (await getAgencyDataById(agencyId))._embedded;
    } catch (error) {
        throw toError(error);
    }
    const current = (agency.topics ?? []).map(({ id }) => Number(id));
    const body = {
        ...Object.fromEntries(CLEARED_WHEN_ABSENT.map((field) => [field, agency[field] ?? null])),
        external: agency.external === true,
        topicIds: [...new Set([...current, ...topicIds.map(Number)])],
    };

    try {
        return await fetchData({
            url: `${agencyEndpointBase}/${agencyId}`,
            method: FETCH_METHODS.PUT,
            skipAuth: false,
            responseHandling: [
                FETCH_ERRORS.FORBIDDEN,
                FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                FETCH_ERRORS.CATCH_ALL_SILENT,
                FETCH_SUCCESS.CONTENT,
            ],
            bodyData: JSON.stringify(body),
        });
    } catch (error) {
        throw toError(error);
    }
};
