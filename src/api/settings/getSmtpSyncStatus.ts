import { smtpSyncStatusEndpoint } from '../../appConfig';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../fetchData';

export type SmtpSyncStatus = 'UNKNOWN' | 'SMTP_SYNC_PENDING' | 'APPLIED' | 'DISABLED_OR_INCOMPLETE';

export interface SmtpSyncState {
    revision: number;
    appliedRevision: number | null;
    status: SmtpSyncStatus;
}

export const parseSmtpSyncState = (value: unknown): SmtpSyncState | null => {
    if (typeof value !== 'object' || value === null) return null;
    const state = value as Record<string, unknown>;
    if (!Number.isSafeInteger(state.revision) || (state.revision as number) < 0) return null;
    if (
        state.appliedRevision !== null &&
        (!Number.isSafeInteger(state.appliedRevision) || (state.appliedRevision as number) < 0)
    )
        return null;
    if (!['UNKNOWN', 'SMTP_SYNC_PENDING', 'APPLIED', 'DISABLED_OR_INCOMPLETE'].includes(String(state.status)))
        return null;
    if (
        (state.status === 'APPLIED' || state.status === 'DISABLED_OR_INCOMPLETE') &&
        state.appliedRevision !== state.revision
    )
        return null;
    return state as unknown as SmtpSyncState;
};

export const getSmtpSyncStatus = async (): Promise<SmtpSyncState | null> =>
    parseSmtpSyncState(
        await fetchData({
            url: smtpSyncStatusEndpoint,
            method: FETCH_METHODS.GET,
            responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
        }),
    );
