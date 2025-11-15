import { useQuery, UseQueryOptions } from 'react-query';
import getAgencyPostCodeRange, { PostCodeRange } from '../api/agency/getAgencyPostCodeRange';

interface PostCodeRangeProps extends UseQueryOptions<PostCodeRange[]> {
    id?: string;
}

export const useAgencyPostCodesData = ({ id, ...options }: PostCodeRangeProps) => {
    return useQuery<PostCodeRange[]>(['AGENCY_POST_CODES', id], () => getAgencyPostCodeRange(id), {
        enabled: id !== 'add',
        ...options,
    });
};
