import { useQuery } from '@tanstack/react-query';
import { getSmtpSyncStatus, SmtpSyncState } from '../api/settings/getSmtpSyncStatus';

// The Keycloak SMTP Job runs at most every 5 minutes; recheck while it is outstanding.
export const SMTP_SYNC_POLL_MS = 30_000;

const isOutstanding = (data: SmtpSyncState | null | undefined, awaitedRevision: number | null) =>
    data?.status === 'SMTP_SYNC_PENDING' || (awaitedRevision !== null && !!data && data.revision < awaitedRevision);

/** @param awaitedRevision revision a save reported as pending; polls until the status reaches it. */
export const useSmtpSyncStatus = (awaitedRevision: number | null = null) =>
    useQuery({
        queryKey: ['SMTP_SYNC_STATUS'],
        queryFn: getSmtpSyncStatus,
        retry: false,
        refetchOnWindowFocus: false,
        refetchInterval: (query) => (isOutstanding(query.state.data, awaitedRevision) ? SMTP_SYNC_POLL_MS : false),
    });
