import { agencyEndpointBase } from '../../appConfig';
import { DepartmentDataProtectionResponse } from '../../types/dpp';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Publishes (or draft-saves) a department's (Fachbereich = agency × topic) own data privacy policy.
 * Sends the multilingual language→HTML map plus the publish flag; the backend sanitises and stores
 * it and returns the resulting publication status.
 *
 * `consentByLanguage` is the consent sentence that belongs to this policy version
 * (ADR-021 decision 4). It is only sent when the caller actually edits it — i.e.
 * when the read endpoint reported the field — so an older backend never receives
 * a property it does not know. TODO(#250): the receiving side is ORISO-AgencyService
 * branch `feat/legal-text-versioning-250`; align the property name if that PR
 * settles on a different one.
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
