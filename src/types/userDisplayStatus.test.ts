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

    it('still recognizes absence and disabled states', () => {
        expect(resolveDisplayStatus({ absent: true, status: 'CREATED' } as CounselorData)).toBe('INACTIVE');
        expect(resolveDisplayStatus({ active: false, status: 'CREATED' } as CounselorData)).toBe('DISABLED');
    });
    it('shows a locked login as disabled even when the counsellor is absent', () => {
        expect(resolveDisplayStatus({ absent: true, active: false, status: 'CREATED' } as CounselorData)).toBe(
            'DISABLED',
        );
    });

    it('shows an enabled but absent account as inactive', () => {
        expect(resolveDisplayStatus({ absent: true, active: true, status: 'CREATED' } as CounselorData)).toBe(
            'INACTIVE',
        );
    });

    it('shows a confirmed enabled account as active', () => {
        expect(resolveDisplayStatus({ active: true, status: 'CREATED' } as CounselorData)).toBe('ACTIVE');
    });

    it('does not invent an active account when the login status is missing', () => {
        expect(resolveDisplayStatus({} as CounselorData)).toBe('null');
        expect(resolveDisplayStatus({ active: null } as CounselorData)).toBe('null');
        expect(resolveDisplayStatus({ active: null, status: 'ACTIVE' } as CounselorData)).toBe('null');
        expect(resolveDisplayStatus({ status: 'ACTIVE' } as CounselorData)).toBe('null');
    });

    it('does not mark a returned colleague inactive merely because an old absence note remains', () => {
        expect(resolveDisplayStatus({ active: true, absent: false, absenceMessage: 'Old note' } as CounselorData)).toBe(
            'ACTIVE',
        );
    });

    it.each(['IN_PROGRESS', 'ERROR', 'IN_DELETION'] as const)(
        'does not hide lifecycle state %s behind an enabled login',
        (status) => {
            expect(resolveDisplayStatus({ active: true, status } as CounselorData)).toBe(status);
            expect(resolveDisplayStatus({ active: false, absent: true, status } as CounselorData)).toBe(status);
        },
    );
});
