import { LabeledValue } from 'antd/lib/select';
import { CounselorData } from '../../types/counselor';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { counselorEndpoint } from '../../appConfig';
import { normaliseAvatarValue } from '../../utils/counsellorAvatar';
import { putAgenciesForCounselor } from '../agency/putAgenciesForCounselor';

const parseTopicIds = (formData: CounselorData): number[] => {
    const topics = formData?.topicIds || formData?.topics;
    return (
        topics
            ?.map((topic) => (typeof topic === 'string' ? topic : topic?.value || topic?.id))
            .filter((id) => id != null && !Number.isNaN(Number(id)))
            .map((id) => Number(id)) || []
    );
};

/**
 * edit counselor
 * @param id - id of counselor to save
 * @param formData - input data from form
 * @return data
 */
export const editCounselorData = async (id: string, formData: CounselorData): Promise<CounselorData> => {
    const {
        firstname,
        lastname,
        formalLanguage,
        email,
        absent,
        absenceMessage,
        isGroupchatConsultant,
        isSupervisor,
        assignedSupervisorId,
        publicSlug,
        rejectPendingPublicSlug,
        displayName,
        internalDisplayName,
        salutation,
        position,
        title,
        adminRemarks,
        avatarKind,
        avatarId,
        topicsByAgency,
    } = formData;

    const topicIds = parseTopicIds(formData);

    const strippedCounselor = {
        firstname,
        lastname,
        formalLanguage,
        email,
        // Required by the endpoint (`@NotNull`, primitive column), so unlike the flags below
        // it cannot be omitted. The shared field set carries it hidden where no switch is
        // offered, so this `!!` only defaults an untouched CREATE form.
        absent: !!absent,
        // A flag the form did not submit means "leave it alone", never `false` — the rule
        // `src/hooks/topicRequestBody.ts` carries a scar for, and the one `updateAgencyData`
        // already follows. `false` here REMOVES the group-chat role in Keycloak, so an edit
        // screen that never rendered the switch must not send it at all.
        ...(isGroupchatConsultant !== undefined && { isGroupchatConsultant: !!isGroupchatConsultant }),
        isSupervisor: !!isSupervisor,
        topicIds,
        // Only when the page knows the server stores topics per centre; older servers reject it.
        ...(Array.isArray(topicsByAgency) && { topicsByAgency }),
        publicSlug,
        rejectPendingPublicSlug: !!rejectPendingPublicSlug,
        // Backend semantics: null/omitted leaves the stored value untouched, '' clears it.
        // Undefined means the form did not render the field (e.g. remarks for
        // restricted agency admins), so it must stay omitted.
        // ADR-008 "Supervision (auto-assigned)": the standing supervisor follows the same
        // null/''/undefined contract. The form clears the select to '' rather than undefined,
        // so clearing reaches the backend instead of silently keeping the old assignment.
        ...(assignedSupervisorId !== undefined && { assignedSupervisorId }),
        ...(displayName !== undefined && { displayName }),
        ...(internalDisplayName !== undefined && { internalDisplayName }),
        ...(salutation !== undefined && { salutation }),
        ...(position !== undefined && { position }),
        ...(title !== undefined && { title }),
        ...(adminRemarks !== undefined && { adminRemarks }),
        // Same contract as the fields above: an untouched avatar normalises to {}
        // and stays omitted, so the stored choice is left alone.
        ...normaliseAvatarValue({ avatarKind, avatarId }),
        ...(absent && absenceMessage ? { absenceMessage } : {}),
    };

    const ids = ((formData.agencies as LabeledValue[])?.map(({ value }) => value) || []) as string[];
    await putAgenciesForCounselor(id, ids);

    return (
        fetchData({
            url: `${counselorEndpoint}/${id}`,
            method: FETCH_METHODS.PUT,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL],
            bodyData: JSON.stringify(strippedCounselor),
        })
            .then((response) => {
                if (response.status === 200) {
                    return response.json();
                }
                return response.json();
            })
            // eslint-disable-next-line no-underscore-dangle
            .then((data: { _embedded: CounselorData }) => data?._embedded)
    );
};
