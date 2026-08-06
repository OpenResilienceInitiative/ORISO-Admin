import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import getAgencyPostCodeRange, { PostCodeRange } from '../api/agency/getAgencyPostCodeRange';

interface PostCodeRangeProps extends Omit<UseQueryOptions<PostCodeRange[]>, 'queryKey' | 'queryFn'> {
    id?: string;
}

export const useAgencyPostCodesData = ({ id, ...options }: PostCodeRangeProps) => {
    return useQuery<PostCodeRange[]>({
        queryKey: ['AGENCY_POST_CODES', id],
        queryFn: () => getAgencyPostCodeRange(id),
        enabled: id !== 'add',
        ...options,
    });
};
