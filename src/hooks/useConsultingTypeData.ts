import { useQuery } from '@tanstack/react-query';
import getConsultingType4Tenant from '../api/consultingtype/getConsultingType4Tenant';

export const useConsultingType = () => {
    return useQuery({ queryKey: ['CONSULTING_TYPE'], queryFn: () => getConsultingType4Tenant() });
};
