import { counselorEndpoint } from '../../appConfig';
import { CounselorData } from '../../types/counselor';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

const getCounselorById = (consultantId: string): Promise<CounselorData> => {
    return fetchData({
        url: `${counselorEndpoint}/${consultantId}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }).then((response) => {
        // eslint-disable-next-line no-underscore-dangle
        return response._embedded as CounselorData;
    });
};

export default getCounselorById;
