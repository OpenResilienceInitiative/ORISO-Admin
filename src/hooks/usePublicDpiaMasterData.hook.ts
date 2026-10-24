import { useQuery } from '@tanstack/react-query';
import { getPublicDpiaMasterData } from '../api/tenant/getPublicDpiaMasterData';

export const PUBLIC_DPIA_MASTER_DATA_KEY = 'public-dpia-master-data';

export const usePublicDpiaMasterData = () =>
    useQuery({ queryKey: [PUBLIC_DPIA_MASTER_DATA_KEY], queryFn: getPublicDpiaMasterData, staleTime: 60_000 });
