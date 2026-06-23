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
    deleteDate?: string;
    status: Status;
    twoFactorAuth?: boolean;
    isGroupchatConsultant?: boolean;
    isSupervisor?: boolean;
    hasOtherIdentity?: boolean;
    tenantId: string;
    tenantName: string;
    tenantSubdomain?: string;
    createDate?: string;
    updateDate?: string;
    topics?: TopicData[];
    topicIds?: Array<{ value: string; label: string }> | string[];
}
