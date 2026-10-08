import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { counselorEndpoint } from '../../appConfig';
import { CounselorData } from '../../types/counselor';
import { normaliseAvatarValue } from '../../utils/counsellorAvatar';

/**
 * add new counselor
 * @param counselorData
 * @return data
 */
const parseTopicIds = (counselorData: Record<string, any>): number[] | undefined => {
    const topics = counselorData?.topicIds || counselorData?.topics;
    const topicIds = topics
        ?.map((topic) => (typeof topic === 'string' || typeof topic === 'number' ? topic : topic?.value || topic?.id))
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
        absenceMessage,
        username,
        password,
        twoFactorAuth,
        isGroupchatConsultant,
        tenantId,
        publicSlug,
        displayName,
        internalDisplayName,
        salutation,
        position,
        title,
        adminRemarks,
        avatarKind,
        avatarId,
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
        ...(displayName !== undefined && { displayName }),
        ...(internalDisplayName !== undefined && { internalDisplayName }),
        salutation,
        position,
        title,
        // A half choice must never reach the backend: an INITIALS pick drops any
        // motif id, an ICON pick without one degrades to INITIALS. An untouched
        // form yields {} and stays omitted.
        ...normaliseAvatarValue({ avatarKind, avatarId }),
        // Only send remarks when the form rendered the field (tenant-level admins);
        // the backend ignores it for other callers anyway.
        ...(adminRemarks !== undefined && { adminRemarks }),
        // Only when there IS a note: the endpoint refuses a blank one for an absent
        // counsellor (`UserAccountInputValidator#validateAbsence`, plus `@Size(min = 1)` on
        // the DTO), and it means nothing for a counsellor who is present.
        ...(absent && absenceMessage ? { absenceMessage } : {}),
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
