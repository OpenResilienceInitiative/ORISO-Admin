import { PostCodeRange } from '../api/agency/getAgencyPostCodeRange';
import { CounsellingRelation } from '../enums/CounsellingRelation';
import { PermissionToggleVisibility } from './PermissionToggleVisibility';
import { TenantSettings } from './tenant';
import { TopicData } from './topic';

/**
 * Platform-wide governance for agency-level toggles (a singleton, super-admin owned). The
 * backend injects it into every agency's `settings` on read; it is never persisted per agency.
 */
export interface AgencyAdminControls {
    permissionsPageEnabled?: boolean;
    allowedPermissionToggles?: PermissionToggleVisibility;
    enforcedPermissionToggles?: PermissionToggleVisibility;
}

/**
 * Agency-level feature settings — the same flag vocabulary as the tenant level (minus
 * tenant-only concerns like SMTP), plus the injected read-only platform controls.
 */
export type AgencySettings = Omit<TenantSettings, 'smtp' | 'tenantAdminControls'> & {
    agencyAdminControls?: AgencyAdminControls;
};

export interface AgencyDemographicsData {
    age?: string[];
    ageFrom?: number;
    ageTo?: number;
    genders?: string[];
}

export interface AgencyContact {
    nameAndLegalForm: string;
    street: string;
    postcode: string;
    city: string;
    phoneNumber: string;
    email: string;
}

export interface AgencyData {
    id: string | null;
    name: string;
    city: string;
    counsellingRelations: CounsellingRelation[];
    topics: TopicData[];
    // ADR-014: multi-select topic picker — the form field holds the agency's departments as
    // labelInValue Options (or undefined when the field never rendered, which is distinct from an
    // empty array). The lone-Option shape from the former single-select stays accepted.
    topicIds?: { value: string; label: string } | Array<{ value: string; label: string }> | string[];
    consultantIds?: Array<{ value: string; label: string }> | string[];
    consultantAssignmentFailed?: boolean;
    demographics?: AgencyDemographicsData;
    description: string;
    offline: boolean;
    online: boolean;
    postcode: string;
    street?: string;
    houseNumber?: string;
    floorBuilding?: string;
    country?: string;
    phone?: string;
    phoneSecondary?: string;
    email?: string;
    teamAgency: boolean;
    consultingType: string;
    status: string | undefined;
    deleteDate: string | null | undefined;
    createDate?: string; // Already returned by backend
    updateDate?: string; // Already returned by backend
    dioceseId?: string;
    postCodes?: PostCodeRange[];
    dataProtection: {
        dataProtectionResponsibleEntity:
            | 'AGENCY_RESPONSIBLE'
            | 'ALTERNATIVE_REPRESENTATIVE'
            | 'DATA_PROTECTION_OFFICER';
        agencyDataProtectionResponsibleContact: AgencyContact | null;
        alternativeDataProtectionRepresentativeContact: AgencyContact | null;
        dataProtectionOfficerContact: AgencyContact | null;
    };
    content?: {
        impressum?: Record<string, string>;
        privacy?: Record<string, string>;
        termsAndConditions?: Record<string, string>;
        confirmPrivacy?: boolean;
        confirmTermsAndConditions?: boolean;
    };
    agencyLogo: string | null;
    tenantId: number;
    tenantName?: string;
    settings?: AgencySettings;
}
