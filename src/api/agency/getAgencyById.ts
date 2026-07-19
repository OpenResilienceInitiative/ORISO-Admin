import { message } from 'antd';
import i18next from 'i18next';
import { agencyDataAgencyId } from '../../appConfig';

import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Thrown when the agency is unreachable because it doesn't exist (404) or the current
 * user isn't allowed to see it (403). Callers must treat both cases identically so a
 * foreign agency's mere existence can't be inferred from the UI.
 */
export class AgencyAccessError extends Error {
    constructor() {
        super('AGENCY_ACCESS_ERROR');
        this.name = 'AgencyAccessError';
    }
}

/**
 * retrieve all data based on agency
 * @return {Promise}
 */
const getAgencyDataById = (agencyId: string) => {
    return fetchData({
        url: agencyDataAgencyId(agencyId),
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
    }).catch((error: unknown) => {
        const isNotFound = error instanceof Error && error.message === FETCH_ERRORS.NO_MATCH;
        const isForbidden = error instanceof Error && error.message === FETCH_ERRORS.NOT_ALLOWED;

        if (isNotFound || isForbidden) {
            throw new AgencyAccessError();
        }

        // Any other failure (network issue, 5xx, ...) keeps the app-wide generic toast that
        // CATCH_ALL would otherwise have shown for us.
        const reason = error instanceof Response ? error.headers.get(FETCH_ERRORS.X_REASON) : null;
        message.error({
            content: i18next.t([`message.error.${reason}`, 'message.error.default']) as string,
            duration: 8,
        });

        throw error;
    });
};

export default getAgencyDataById;
