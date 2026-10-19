import { describe, expect, it } from 'vitest';
import { agencySetupLoginForInvite } from './agencySetupContinuation';
import type { CounsellorOnboardingInviteDTO } from '../api/counsellorOnboarding/counsellorOnboarding';

type Origin = Pick<
    CounsellorOnboardingInviteDTO,
    'onboardingPurpose' | 'targetRole' | 'agencyIdAllocationMode' | 'agencyId'
>;
const founder: Origin = {
    onboardingPurpose: 'INVITE',
    targetRole: 'AGENCY_ADMIN',
    agencyIdAllocationMode: 'AUTO',
    agencyId: 5,
};

describe('immutable invitation origin for centre setup', () => {
    it.each(['AUTO', 'MANUAL'] as const)('routes a founding %s invitation to its numeric centre', (mode) => {
        expect(agencySetupLoginForInvite({ ...founder, agencyIdAllocationMode: mode })).toBe(
            '/admin/login?agencySetupId=5',
        );
    });

    it.each(['EXISTING', null, undefined] as const)('keeps normal completion for origin %s', (mode) => {
        expect(agencySetupLoginForInvite({ ...founder, agencyIdAllocationMode: mode })).toBeNull();
    });

    it.each(['EXISTING_ACCOUNT_SETUP', undefined] as const)(
        'keeps normal completion for purpose %s even with a reserved origin',
        (purpose) => {
            expect(agencySetupLoginForInvite({ ...founder, onboardingPurpose: purpose })).toBeNull();
        },
    );

    it.each(['COUNSELLOR', undefined] as const)(
        'keeps normal completion for role %s even with a reserved origin',
        (role) => {
            expect(agencySetupLoginForInvite({ ...founder, targetRole: role })).toBeNull();
        },
    );

    it.each([null, 0, -1, 1.5, 9007199254740992])(
        'does not construct a setup destination for agencyId %s',
        (agencyId) => {
            expect(agencySetupLoginForInvite({ ...founder, agencyId })).toBeNull();
        },
    );

    it('keeps normal completion without a resolved invitation', () => {
        expect(agencySetupLoginForInvite(null)).toBeNull();
        expect(agencySetupLoginForInvite(undefined)).toBeNull();
    });
});
