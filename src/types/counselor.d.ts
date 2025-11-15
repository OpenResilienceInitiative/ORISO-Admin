import { AgencyData } from './agency';
import { Status } from './status';

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
    tenantId: string;
    tenantName: string;
}
