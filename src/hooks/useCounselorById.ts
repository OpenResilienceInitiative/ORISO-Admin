import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import getCounselorById from '../api/counselor/getCounselorById';
import { CounselorData } from '../types/counselor';

interface CounselorByIdProps extends Omit<UseQueryOptions<CounselorData>, 'queryKey' | 'queryFn'> {
    id?: string;
}

export const useCounselorById = ({ id, ...options }: CounselorByIdProps) => {
    return useQuery<CounselorData>({
        queryKey: ['CONSULTANT', id],
        queryFn: () => getCounselorById(id!),
        ...options,
        enabled: !!id && id !== 'add',
    });
};
