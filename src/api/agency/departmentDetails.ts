import { agencyEndpointBase } from '../../appConfig';
import { DepartmentDetails } from '../../types/departmentDetails';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Reads a department's (Fachbereich = agency × topic) stored contact detail overrides
 * (opening hours, phone extension, floor/location). Null members mean "inherits from the
 * Beratungsstelle" — the form must show the inherited value as a placeholder, not copy it.
 */
export const getDepartmentDetails = (agencyId: number, topicId: number) =>
    fetchData({
        url: `${agencyEndpointBase}/${agencyId}/topics/${topicId}/details`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DepartmentDetails>;

/**
 * Stores a department's (Fachbereich = agency × topic) contact detail overrides. Only overrides
 * are persisted — sending null (or an empty string, which the backend normalises to null) clears
 * the override so the department inherits the Beratungsstelle value again.
 */
export const updateDepartmentDetails = (agencyId: number, topicId: number, details: DepartmentDetails) =>
    fetchData({
        url: `${agencyEndpointBase}/${agencyId}/topics/${topicId}/details`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify({
            openingHours: details.openingHours || null,
            phoneExtension: details.phoneExtension || null,
            floorLocation: details.floorLocation || null,
        }),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DepartmentDetails>;
