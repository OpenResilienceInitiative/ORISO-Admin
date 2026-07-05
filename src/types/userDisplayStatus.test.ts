import { describe, expect, it } from 'vitest';
import { CounselorData } from './counselor';
import { resolveDisplayStatus } from './userDisplayStatus';

describe('resolveDisplayStatus', () => {
    it('keeps provisioning status CREATED separate from invite status', () => {
        expect(resolveDisplayStatus({ status: 'CREATED' } as CounselorData)).toBe('CREATED');
    });

    it('keeps provisioning status IN_PROGRESS separate from invite status', () => {
        expect(resolveDisplayStatus({ status: 'IN_PROGRESS' } as CounselorData)).toBe('IN_PROGRESS');
    });

    it('still prioritizes absence and disabled states', () => {
        expect(resolveDisplayStatus({ absent: true, status: 'CREATED' } as CounselorData)).toBe('ABSENT');
        expect(resolveDisplayStatus({ active: false, status: 'CREATED' } as CounselorData)).toBe('DISABLED');
    });
});
