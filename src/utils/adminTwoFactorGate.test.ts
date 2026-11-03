import { describe, expect, it } from 'vitest';
import { UserRole } from '../enums/UserRole';
import { UserData } from '../types/user';
import {
    hasMandatoryTwoFactorRole,
    MANDATORY_TWO_FACTOR_ROLES,
    requiresMandatoryTwoFactor,
} from './adminTwoFactorGate';

const userData = (isActive: boolean): UserData =>
    ({
        username: 'maggie',
        twoFactorAuth: { isEnabled: true, isActive, isToEncourage: true, qrCode: '', secret: '', type: 'APP' },
    } as UserData);

const gate = (over: Partial<Parameters<typeof requiresMandatoryTwoFactor>[0]> = {}) =>
    requiresMandatoryTwoFactor({
        roles: [],
        isTechnicalAccount: false,
        tokenUnreadable: false,
        userData: userData(true),
        ...over,
    });

describe('requiresMandatoryTwoFactor (#891)', () => {
    describe('roles in scope', () => {
        it.each(MANDATORY_TWO_FACTOR_ROLES)('blocks %s without an active factor', (role) => {
            expect(gate({ roles: [role], userData: userData(false) })).toBe(true);
        });

        it.each(MANDATORY_TWO_FACTOR_ROLES)('lets %s through once the factor is active', (role) => {
            expect(gate({ roles: [role], userData: userData(true) })).toBe(false);
        });

        // The report's case: Maggie Simpson reaching the tenant-admin area with
        // 2FA disabled. The old gate only covered platform admins.
        it('blocks a tenant-scoped tenant-admin, which the previous gate let through', () => {
            expect(gate({ roles: [UserRole.TenantAdmin], userData: userData(false) })).toBe(true);
        });

        // Platform (super) admins: tenant-admin + agency-admin with tenantId 0
        // (useUserRoles.isSuperAdmin). Mandatory for them too (ORISO-Frontend#1931
        // product decision); the role sets are the ones UserService and the Helm
        // break-glass runbook actually grant, so a narrower set would still be caught.
        describe.each([
            ['created by UserService', [UserRole.UserAdmin, UserRole.AgencyAdmin, UserRole.TenantAdmin]],
            [
                'with topic-admin (multi-domain)',
                [UserRole.UserAdmin, UserRole.AgencyAdmin, UserRole.TenantAdmin, UserRole.TopicAdmin],
            ],
            [
                'break-glass (every admin role)',
                [
                    UserRole.UserAdmin,
                    UserRole.TenantAdmin,
                    UserRole.SingleTenantAdmin,
                    UserRole.AgencyAdmin,
                    UserRole.TopicAdmin,
                    UserRole.RestrictedAgencyAdmin,
                ],
            ],
        ])('platform admin %s', (_label, roles) => {
            it('is held on the enrolment screen without an active factor', () => {
                expect(hasMandatoryTwoFactorRole(roles)).toBe(true);
                expect(gate({ roles, userData: userData(false) })).toBe(true);
            });

            it('is held while the 2FA state is unknown', () => {
                expect(gate({ roles, userData: undefined })).toBe(true);
            });

            it('passes once the factor is active', () => {
                expect(gate({ roles, userData: userData(true) })).toBe(false);
            });
        });

        it('covers mixed-role accounts through their admin role', () => {
            const roles = [UserRole.TopicAdmin, UserRole.AgencyAdmin];
            expect(gate({ roles, userData: userData(false) })).toBe(true);
        });
    });

    describe('roles out of scope', () => {
        it.each([UserRole.TopicAdmin, UserRole.UserAdmin])('leaves %s alone', (role) => {
            expect(gate({ roles: [role], userData: userData(false) })).toBe(false);
        });

        it('leaves an account with no roles alone', () => {
            expect(gate({ roles: [], userData: userData(false) })).toBe(false);
        });

        // Machine accounts cannot enrol a TOTP factor; blocking them would take
        // the integration down rather than secure anything.
        it('exempts technical accounts even when they carry an admin role', () => {
            const input = { roles: [UserRole.TenantAdmin], isTechnicalAccount: true, userData: userData(false) };
            expect(gate(input)).toBe(false);
        });
    });

    describe('fails closed on missing evidence', () => {
        it('blocks when the token cannot be decoded, so roles are unknown', () => {
            // No way to prove the account is not an administrator.
            expect(gate({ roles: [], tokenUnreadable: true, userData: userData(true) })).toBe(true);
        });

        it('blocks an admin whose profile has not loaded', () => {
            expect(gate({ roles: [UserRole.AgencyAdmin], userData: undefined })).toBe(true);
        });

        it('blocks an admin whose profile carries no twoFactorAuth block', () => {
            expect(gate({ roles: [UserRole.AgencyAdmin], userData: {} as UserData })).toBe(true);
        });

        // A truthy-but-not-true value must not read as "enrolled".
        it.each([undefined, null, 'true', 1])('blocks when isActive is %p rather than true', (value) => {
            const data = { twoFactorAuth: { isActive: value } } as unknown as UserData;
            expect(gate({ roles: [UserRole.TenantAdmin], userData: data })).toBe(true);
        });
    });

    describe('no deferral path exists', () => {
        // The old gate honoured a sessionStorage "set up later" flag. Nothing in
        // the input can re-open that door, so a tampered browser store cannot
        // move the answer.
        it('ignores any extra caller-supplied flags', () => {
            const blocked = requiresMandatoryTwoFactor({
                roles: [UserRole.TenantAdmin],
                isTechnicalAccount: false,
                tokenUnreadable: false,
                userData: userData(false),
                ...({ isSetupDeferred: true, skip: true } as object),
            });
            expect(blocked).toBe(true);
        });

        it('still blocks when the account is merely "encouraged" to enrol', () => {
            const data = {
                twoFactorAuth: { isEnabled: true, isActive: false, isToEncourage: false },
            } as UserData;
            expect(gate({ roles: [UserRole.TenantAdmin], userData: data })).toBe(true);
        });
    });
});

describe('hasMandatoryTwoFactorRole', () => {
    it('recognises the scoped variants, not just the two named roles', () => {
        expect(hasMandatoryTwoFactorRole([UserRole.SingleTenantAdmin])).toBe(true);
        expect(hasMandatoryTwoFactorRole([UserRole.RestrictedAgencyAdmin])).toBe(true);
    });

    it('is false for roles outside the administrator set', () => {
        expect(hasMandatoryTwoFactorRole([UserRole.Technical, UserRole.TopicAdmin])).toBe(false);
    });
});
