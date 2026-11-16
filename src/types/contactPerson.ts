/**
 * Contact person per Beratungsstelle and the Träger default (ORISO-Admin#1534).
 * Shapes of the UserService `useradmin` contract; ids of admins are UUID strings.
 */

export type ContactAdminType = 'AGENCY' | 'TENANT' | 'SUPER';

/** An admin who can be (or is) a contact person. */
export interface ContactAdmin {
    adminId: string;
    firstName: string;
    lastName: string;
    loginEmail: string;
    /** Optional contact e-mail shown to counsellors instead of the login e-mail. */
    contactEmail?: string | null;
    /** `contactEmail` when set, else `loginEmail` — computed by the service. */
    displayEmail: string;
    type: ContactAdminType;
    /** The admin also counsels (a consultant with the same id). */
    isConsultant: boolean;
}

export type ContactSource = 'OWN' | 'TRAEGER_DEFAULT' | 'NONE';

export interface ContactPair {
    contact?: ContactAdmin | null;
    deputy?: ContactAdmin | null;
}

/** `GET /useradmin/agencies/{agencyId}/contactperson`. */
export interface AgencyContactPersonAdmin extends ContactPair {
    agencyId: number;
    tenantId: number | null;
    traegerDefault: ContactPair;
    effectiveSource: ContactSource;
}

/** `GET /useradmin/tenants/{tenantId}/contactperson`. */
export interface TenantContactPerson extends ContactPair {
    tenantId: number;
    generalContactEmail?: string | null;
}

/** Body of both `PUT …/contactperson` calls; `null` or absent clears. */
export interface ContactPersonUpdate {
    contactAdminId?: string | null;
    deputyAdminId?: string | null;
}

export interface TenantContactPersonUpdate extends ContactPersonUpdate {
    generalContactEmail?: string | null;
}

/** One row of `POST /useradmin/agencycontacts/coverage`. */
export interface AgencyContactCoverage {
    agencyId: number;
    covered: boolean;
    source: ContactSource;
}
