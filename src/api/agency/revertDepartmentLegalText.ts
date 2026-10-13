import { agencyEndpointBase } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

export interface DepartmentLegalRevertResponse {
    /** False when the Fachbereich already inherited and nothing changed. */
    reverted: boolean;
}

/**
 * Ends a Fachbereich's own privacy statement or imprint so it inherits the agency text again
 * (ORISO-AgencyService#334). The server clears the own live text and keeps the version history.
 */
export const revertDepartmentLegalText = (kind: 'privacy' | 'imprint', agencyId: number, topicId: number) =>
    fetchData({
        url: `${agencyEndpointBase}/${agencyId}/topics/${topicId}/${kind === 'privacy' ? 'dpp' : 'imprint'}/revert`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DepartmentLegalRevertResponse>;
