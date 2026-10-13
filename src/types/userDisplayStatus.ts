import { CounselorData } from './counselor';
import { Status } from './status';

/** UI-facing status values for the user management table. */
export type DisplayStatus = Status | 'INVITED' | 'ABSENT' | 'DISABLED';

export const resolveDisplayStatus = (record: CounselorData): DisplayStatus => {
    // Provisioning and deletion are separate from the account's login/absence state.
    if (record.status === 'IN_PROGRESS' || record.status === 'ERROR' || record.status === 'IN_DELETION') {
        return record.status;
    }
    if (record.active === false || record.status === 'INACTIVE') {
        return 'DISABLED';
    }
    if (record.absent) {
        return 'INACTIVE';
    }
    if (record.active === true) {
        return 'ACTIVE';
    }
    return record.status === 'ACTIVE' ? 'null' : record.status || 'null';
};
