import { useQuery } from '@tanstack/react-query';
import { getDpiaMasterData } from '../api/tenant/getDpiaMasterData';

export const DPIA_MASTER_DATA_KEY = 'dpia-master-data';

/**
 * Loads the platform DPIA operator master data (superadmin only).
 * Pass enabled=false for everyone else so the disabled card never calls the endpoint.
 */
export const useDpiaMasterData = (enabled = true) =>
    useQuery({
        queryKey: [DPIA_MASTER_DATA_KEY],
        queryFn: getDpiaMasterData,
        enabled,
        staleTime: 60_000,
    });
