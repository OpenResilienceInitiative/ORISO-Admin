import { QueryOptions, useQuery } from 'react-query';
import { fetchData, FETCH_METHODS } from '../api/fetchData';
import { usersConsultantEndpoint } from '../appConfig';
import { CounselorData } from '../types/counselor';

interface ConsultantDataProps extends QueryOptions<CounselorData> {
    id?: string;
}

export const useConsultantData = ({ id, ...options }: ConsultantDataProps) => {
    return useQuery(
        ['CONSULTANT', id],
        () => {
            return fetchData({
                url: `${usersConsultantEndpoint}/${id}`,
                method: FETCH_METHODS.GET,
                responseHandling: [],
            }).then((result: CounselorData) => result);
        },
        options,
    );
};
