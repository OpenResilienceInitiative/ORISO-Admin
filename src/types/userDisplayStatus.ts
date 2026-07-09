import { CounselorData } from './counselor';
import { Status } from './status';

/** UI-facing status values for the user management table. */
export type DisplayStatus = Status | 'INVITED' | 'ABSENT' | 'DISABLED';

export const resolveDisplayStatus = (record: CounselorData): DisplayStatus => {
    if (record.absent) {
        return 'ABSENT';
    }
    if (record.active === false || record.status === 'INACTIVE') {
        return 'DISABLED';
    }
    if (record.status === 'ACTIVE' || record.active === true) {
        return 'ACTIVE';
    }
    return record.status || 'ACTIVE';
};
