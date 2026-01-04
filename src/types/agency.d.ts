import { PostCodeRange } from '../api/agency/getAgencyPostCodeRange';
import { CounsellingRelation } from '../enums/CounsellingRelation';
import { TopicData } from './topic';

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
    topicIds: Array<{ value: string; label: string }> | string[];
    demographics?: AgencyDemographicsData;
    description: string;
    offline: boolean;
    online: boolean;
    postcode: string;
    teamAgency: boolean;
    consultingType: string;
    status: string | undefined;
    deleteDate: string | undefined;
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
    agencyLogo: string | null;
    tenantId: number;
}
