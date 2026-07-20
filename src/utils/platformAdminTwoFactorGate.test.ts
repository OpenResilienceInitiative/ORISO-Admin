import { describe, expect, it } from 'vitest';
import { UserData } from '../types/user';
import { requiresPlatformAdminTwoFactor } from './platformAdminTwoFactorGate';

const userData = (isActive: boolean, isToEncourage = true) =>
    ({
        twoFactorAuth: { isActive, isToEncourage },
    } as UserData);

describe('platform-admin two-factor gate', () => {
    it('blocks a platform admin until 2FA is active', () => {
        expect(requiresPlatformAdminTwoFactor(true, userData(false))).toBe(true);
    });

    it('unblocks a platform admin after 2FA activation', () => {
        expect(requiresPlatformAdminTwoFactor(true, userData(true))).toBe(false);
    });

    it('fails closed while platform-admin policy data is unavailable', () => {
        expect(requiresPlatformAdminTwoFactor(true, undefined)).toBe(true);
    });

    it('does not impose the platform policy on tenant-scoped admins', () => {
        expect(requiresPlatformAdminTwoFactor(false, userData(false))).toBe(false);
    });
});
