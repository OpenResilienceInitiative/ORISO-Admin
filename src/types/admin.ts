import { AgencyData } from './agency';
import { Status } from './status';

export interface AdminData {
    lastname: string;
    firstname: string;
    email: string;
    /** Read-only login flag; null/omitted means that the identity status is unknown. */
    active?: boolean | null;
    gender: string;
    id: string;
    phone: string;
    agencies: Array<Partial<AgencyData>>;
    agencyIds: string[];
    username: string;
    key: string;
    deleteDate?: string | null;
    status: Status;
    twoFactorAuth?: boolean;
    agencyAssignmentFailed?: boolean;
}
