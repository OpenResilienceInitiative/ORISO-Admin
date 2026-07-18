import { describe, expect, it } from 'vitest';
import { TypeOfUser } from '../enums/TypeOfUser';
import { canGrantConsultantIdentity } from './canGrantConsultantIdentity';
import { CounselorData } from '../types/counselor';

const admin = (hasOtherIdentity: boolean) => ({ id: 'a-1', hasOtherIdentity }) as CounselorData;

describe('canGrantConsultantIdentity', () => {
    it('allows granting for an edited tenant admin without a consultant identity', () => {
        expect(canGrantConsultantIdentity(true, TypeOfUser.TenantAdmins, admin(false))).toBe(true);
    });

    it('allows granting for an edited agency admin without a consultant identity', () => {
        expect(canGrantConsultantIdentity(true, TypeOfUser.AgencyAdmins, admin(false))).toBe(true);
    });

    it('denies granting when the admin already has the other identity', () => {
        expect(canGrantConsultantIdentity(true, TypeOfUser.TenantAdmins, admin(true))).toBe(false);
    });

    it('denies granting while creating a new user', () => {
        expect(canGrantConsultantIdentity(false, TypeOfUser.TenantAdmins, admin(false))).toBe(false);
    });

    it('denies granting on non-admin forms', () => {
        expect(canGrantConsultantIdentity(true, TypeOfUser.Consultants, admin(false))).toBe(false);
        expect(canGrantConsultantIdentity(true, TypeOfUser.PlatformAdmins, admin(false))).toBe(false);
    });

    it('denies granting when the edited row is not loaded', () => {
        expect(canGrantConsultantIdentity(true, TypeOfUser.TenantAdmins, undefined)).toBe(false);
    });
});
