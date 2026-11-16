import {
    agencyContactCoverageEndpoint,
    agencyContactPersonEndpoint,
    tenantContactPersonEndpoint,
} from '../../appConfig';
import type {
    AgencyContactCoverage,
    AgencyContactPersonAdmin,
    ContactAdmin,
    ContactPersonUpdate,
    TenantContactPerson,
    TenantContactPersonUpdate,
} from '../../types/contactPerson';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Thin client for the contact-person contract (ORISO-Admin#1534). Not wired into
 * pages yet; the tiles take the same shapes as props. `tenantId` is only honoured
 * by the service for platform admins — Träger and BST admins always get their own.
 */

const withTenant = (url: string, tenantId?: number | null) =>
    typeof tenantId === 'number' ? `${url}?tenantId=${tenantId}` : url;

const READ_HANDLING = [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL];
const WRITE_HANDLING = [FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE, FETCH_ERRORS.CATCH_ALL];

const asList = <T>(body: unknown): T[] => (Array.isArray(body) ? (body as T[]) : []);

export const getAgencyContactPerson = (agencyId: number, tenantId?: number | null): Promise<AgencyContactPersonAdmin> =>
    fetchData({
        url: withTenant(agencyContactPersonEndpoint(agencyId), tenantId),
        method: FETCH_METHODS.GET,
        responseHandling: READ_HANDLING,
    });

export const putAgencyContactPerson = (
    agencyId: number,
    update: ContactPersonUpdate,
    tenantId?: number | null,
): Promise<AgencyContactPersonAdmin> =>
    fetchData({
        url: withTenant(agencyContactPersonEndpoint(agencyId), tenantId),
        method: FETCH_METHODS.PUT,
        bodyData: JSON.stringify({
            contactAdminId: update.contactAdminId || null,
            deputyAdminId: update.deputyAdminId || null,
        }),
        responseHandling: WRITE_HANDLING,
    });

/** BST admins of the centre plus the Träger admins of its tenant. */
export const getAgencyContactCandidates = async (agencyId: number, tenantId?: number | null): Promise<ContactAdmin[]> =>
    asList<ContactAdmin>(
        await fetchData({
            url: withTenant(`${agencyContactPersonEndpoint(agencyId)}/candidates`, tenantId),
            method: FETCH_METHODS.GET,
            responseHandling: READ_HANDLING,
        }),
    );

export const getTenantContactPerson = (tenantId: number): Promise<TenantContactPerson> =>
    fetchData({
        url: tenantContactPersonEndpoint(tenantId),
        method: FETCH_METHODS.GET,
        responseHandling: READ_HANDLING,
    });

export const putTenantContactPerson = (
    tenantId: number,
    update: TenantContactPersonUpdate,
): Promise<TenantContactPerson> =>
    fetchData({
        url: tenantContactPersonEndpoint(tenantId),
        method: FETCH_METHODS.PUT,
        bodyData: JSON.stringify({
            contactAdminId: update.contactAdminId || null,
            deputyAdminId: update.deputyAdminId || null,
            generalContactEmail: update.generalContactEmail?.trim() || null,
        }),
        responseHandling: WRITE_HANDLING,
    });

/** All admins of the Träger. */
export const getTenantContactCandidates = async (tenantId: number): Promise<ContactAdmin[]> =>
    asList<ContactAdmin>(
        await fetchData({
            url: `${tenantContactPersonEndpoint(tenantId)}/candidates`,
            method: FETCH_METHODS.GET,
            responseHandling: READ_HANDLING,
        }),
    );

/** Which centres have a valid own or Träger-default contact person (the fallback does not count). */
export const postAgencyContactCoverage = async (
    agencyIds: number[],
    tenantIdsByAgency?: Record<number, number>,
): Promise<AgencyContactCoverage[]> =>
    asList<AgencyContactCoverage>(
        await fetchData({
            url: agencyContactCoverageEndpoint,
            method: FETCH_METHODS.POST,
            bodyData: JSON.stringify(tenantIdsByAgency ? { agencyIds, tenantIdsByAgency } : { agencyIds }),
            responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
        }),
    );
