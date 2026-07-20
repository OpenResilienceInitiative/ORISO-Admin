import { useQuery } from '@tanstack/react-query';
import { getDepartmentImprint } from '../api/agency/getDepartmentImprint';

export const DEPARTMENT_IMPRINT_KEY = 'department-imprint';

export const useDepartmentImprint = (agencyId: number, topicId: number) =>
    useQuery({
        queryKey: [DEPARTMENT_IMPRINT_KEY, agencyId, topicId],
        queryFn: () => getDepartmentImprint(agencyId, topicId),
        enabled: Number.isFinite(agencyId) && Number.isFinite(topicId),
    });
