import { useQuery } from 'react-query';
import getConsultingType4Tenant from '../api/consultingtype/getConsultingType4Tenant';

export const useConsultingType = () => {
    return useQuery(['CONSULTING_TYPE'], () => getConsultingType4Tenant());
};
