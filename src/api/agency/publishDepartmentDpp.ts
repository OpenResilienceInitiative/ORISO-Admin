import { agencyEndpointBase } from '../../appConfig';
import { DepartmentDataProtectionResponse } from '../../types/dpp';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Publishes (or draft-saves) a department's (Fachbereich = agency × topic) own data privacy policy.
 * Sends the multilingual language→HTML map plus the publish flag; the backend sanitises and stores
 * it and returns the resulting publication status.
 *
 * `consentByLanguage` is the consent sentence that belongs to this policy version
 * (ADR-021 decision 4). It is sent whenever this surface owns the consent field, which
 * since #929 includes a department whose policy carries no sentence yet — the map is then
 * empty, and an empty map is NOT a clear: `ConsentTextService#resolveForUpdate` treats
 * "no entries at all" exactly like an omitted property and keeps whatever is stored.
 * Clearing is expressed by sending the language key with empty content (`{"de": ""}`).
 * The property is left off entirely only where the card never owned the field —
 * "Alle Fachbereiche" and the imprint.
 */
export const publishDepartmentDpp = (
    agencyId: number,
    topicId: number,
    contentByLanguage: Record<string, string>,
    publish: boolean,
    consentByLanguage?: Record<string, string>,
) =>
    fetchData({
        url: `${agencyEndpointBase}/${agencyId}/topics/${topicId}/dpp`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify({
            content: contentByLanguage,
            publish,
            ...(consentByLanguage ? { consentText: consentByLanguage } : {}),
        }),
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    }) as Promise<DepartmentDataProtectionResponse>;
