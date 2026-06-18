import { LabeledValue } from 'antd/lib/select';
import { CounselorData } from '../../types/counselor';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { counselorEndpoint } from '../../appConfig';
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
    const { firstname, lastname, formalLanguage, email, absent, absenceMessage, isSupervisor } = formData;

    const topicIds = parseTopicIds(formData);

    const strippedCounselor = {
        firstname,
        lastname,
        formalLanguage,
        email,
        absent: !!absent,
        isSupervisor: !!isSupervisor,
        topicIds,
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
