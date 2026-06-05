import { useQuery, UseQueryOptions } from 'react-query';
import getCounselorById from '../api/counselor/getCounselorById';
import { CounselorData } from '../types/counselor';

interface CounselorByIdProps extends UseQueryOptions<CounselorData> {
    id?: string;
}

export const useCounselorById = ({ id, ...options }: CounselorByIdProps) => {
    return useQuery<CounselorData>(['CONSULTANT', id], () => getCounselorById(id), {
        ...options,
        enabled: !!id && id !== 'add',
    });
};
