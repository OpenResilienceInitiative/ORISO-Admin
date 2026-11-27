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
    /**
     * ORISO-Admin#1534: shown to counsellors instead of the login e-mail. On save,
     * absent keeps the stored value and "" clears it.
     */
    contactEmail?: string | null;
    agencyAssignmentFailed?: boolean;
}
