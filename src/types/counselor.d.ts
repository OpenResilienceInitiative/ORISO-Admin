import { AgencyData } from './agency';
import { Status } from './status';
import { TopicData } from './topic';

export interface CounselorData {
    lastname: string;
    firstname: string;
    email: string;
    active: boolean;
    gender: string;
    id: string;
    phone: string;
    agencies: Array<Partial<AgencyData>>;
    agencyIds: string[];
    username: string;
    key: string;
    formalLanguage: boolean;
    absent: boolean;
    absenceMessage?: string;
    deleteDate?: string | null;
    status: Status;
    twoFactorAuth?: boolean;
    secondFactorStatus?: 'PENDING_2FA' | 'ACTIVE' | 'UNAVAILABLE';
    /**
     * ADR-018: the authoritative operational state of a Global Support Admin. Only ACTIVE may
     * initiate support access; everything else means the account is blocked or unfinished.
     */
    provisioningStatus?: 'INVITED' | 'PENDING_2FA' | 'ACTIVE' | 'DISABLING' | 'DISABLED' | 'PROVISIONING_FAILED';
    isGroupchatConsultant?: boolean;
    isSupervisor?: boolean;
    publicSlug?: string;
    pendingPublicSlug?: string;
    publicSlugStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectPendingPublicSlug?: boolean;
    hasOtherIdentity?: boolean;
    otherIdentityTypes?: ('TENANT_ADMIN' | 'AGENCY_ADMIN')[];
    tenantId: string;
    tenantName: string;
    tenantSubdomain?: string;
    createDate?: string;
    updateDate?: string;
    topics?: TopicData[];
    topicIds?: Array<{ value: string; label: string }> | string[];
}
