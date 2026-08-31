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
    isGroupchatConsultant?: boolean;
    isSupervisor?: boolean;
    /**
     * Supervision (auto-assigned), ADR-008: the consultant id of this counsellor's standing
     * supervisor, auto-attached read-only to every case the counsellor accepts. At most one.
     * Backend semantics: omitted/null keeps the stored value, '' clears it.
     */
    assignedSupervisorId?: string;
    /** The PUBLIC display name — the name advice seekers see. */
    displayName?: string;
    /** Optional internal display name; internal surfaces fall back to displayName when empty. */
    internalDisplayName?: string;
    salutation?: string;
    position?: string;
    title?: string;
    /** Only present/writable for tenant-level admins (tenant admin / platform admin). */
    adminRemarks?: string;
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
