import { AgencyData } from '../../types/agency';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { agencyEndpointBase } from '../../appConfig';

/**
 * `teamAgency` does not reach this comparison in one single shape. The admin GET answers with a
 * real boolean, the agency list mapper (`getAgencyData`) rewrites it to the strings `'true'` /
 * `'false'`, an antd Switch yields a boolean, and an agency model that predates the field carries
 * nothing at all. Comparing those with `===` reports a type change that never happened, the save
 * POSTs `/changetype`, and the AgencyService answers 409 ("already team agency" / "already default
 * agency") — which surfaced to the user as a failed save.
 *
 * Absent (`undefined` / `null`) means "default agency", i.e. `false`.
 */
export const normalizeTeamAgency = (value: unknown): boolean => {
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    return value === true;
};

export default async function updateAgencyType(agencyModel: AgencyData, formInput: AgencyData) {
    // A narrow card patch (publishing a department's legal document, saving the permission
    // toggles, …) carries no `teamAgency` field at all. Absent is not "switch to default
    // agency" — never touch the agency type for such a patch.
    if (formInput?.teamAgency === undefined || formInput?.teamAgency === null) {
        return Promise.resolve();
    }

    const currentTeamAgency = normalizeTeamAgency(agencyModel?.teamAgency);
    const requestedTeamAgency = normalizeTeamAgency(formInput.teamAgency);

    if (currentTeamAgency === requestedTeamAgency) {
        return Promise.resolve();
    }

    const agencyTypeChangeRequestBody = {
        agencyType: requestedTeamAgency ? 'TEAM_AGENCY' : 'DEFAULT_AGENCY',
    };

    return fetchData({
        url: `${agencyEndpointBase}/${agencyModel.id}/changetype`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        // CONFLICT must be declared, otherwise a 409 falls through to CATCH_ALL and stacks a
        // generic error toast on top of an otherwise successful save.
        responseHandling: [FETCH_ERRORS.CONFLICT, FETCH_ERRORS.CATCH_ALL],
        bodyData: JSON.stringify(agencyTypeChangeRequestBody),
    }).catch((error: unknown) => {
        // 409 means the agency is ALREADY in the requested state — the change we wanted has
        // happened, so this is a no-op success. A stale agency model must never be able to turn a
        // successful save into an error the user then retries.
        if (error instanceof Error && error.message === FETCH_ERRORS.CONFLICT) {
            return undefined;
        }
        throw error;
    });
}
