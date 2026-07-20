import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { counselorEndpoint } from '../../appConfig';
import { CounselorData } from '../../types/counselor';

/**
 * add new counselor
 * @param counselorData
 * @return data
 */
const parseTopicIds = (counselorData: Record<string, any>): number[] | undefined => {
    const topics = counselorData?.topicIds || counselorData?.topics;
    const topicIds = topics
        ?.map((topic) => (typeof topic === 'string' ? topic : topic?.value || topic?.id))
        .filter((id) => id != null && !Number.isNaN(Number(id)))
        .map((id) => Number(id));

    return topicIds?.length ? topicIds : undefined;
};

const parseAgencyIds = (counselorData: Record<string, any>): number[] | undefined => {
    const agencies = counselorData?.agencyIds || counselorData?.agencies;
    const agencyIds = agencies
        ?.map((agency) =>
            typeof agency === 'string' || typeof agency === 'number' ? agency : agency?.value || agency?.id,
        )
        .filter((id) => id != null && !Number.isNaN(Number(id)))
        .map((id) => Number(id));

    return agencyIds?.length ? [...new Set<number>(agencyIds)] : undefined;
};

export const addCounselorData = (counselorData: Record<string, any>): Promise<CounselorData> => {
    const {
        firstname,
        lastname,
        formalLanguage,
        email,
        absent,
        username,
        password,
        twoFactorAuth,
        isGroupchatConsultant,
        tenantId,
        publicSlug,
    } = counselorData;

    const topicIds = parseTopicIds(counselorData);
    const agencyIds = parseAgencyIds(counselorData);

    // just use needed data from whole form data
    const strippedCounselor = {
        firstname,
        lastname,
        formalLanguage: !!formalLanguage,
        email,
        absent: !!absent,
        username, // MATRIX MIGRATION: Don't encrypt username - backend handles it
        ...(password && { password }), // Include password if provided
        twoFactorAuth,
        isGroupchatConsultant,
        tenantId: parseInt(tenantId, 10),
        publicSlug,
        ...(topicIds && { topicIds }),
        ...(agencyIds && { agencyIds }),
    };

    return (
        fetchData({
            url: counselorEndpoint,
            method: FETCH_METHODS.POST,
            skipAuth: false,
            responseHandling: [
                FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                FETCH_ERRORS.CONFLICT,
                FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                FETCH_ERRORS.CATCH_ALL,
            ],
            bodyData: JSON.stringify(strippedCounselor),
        })
            .then((response) => response.json())
            // eslint-disable-next-line no-underscore-dangle
            .then((data: { _embedded: CounselorData }) => data?._embedded)
    );
};
