import { useQuery } from '@tanstack/react-query';
import { getSmtpSyncStatus } from '../api/settings/getSmtpSyncStatus';

export const useSmtpSyncStatus = () =>
    useQuery({
        queryKey: ['SMTP_SYNC_STATUS'],
        queryFn: getSmtpSyncStatus,
        retry: false,
        refetchOnWindowFocus: false,
    });
