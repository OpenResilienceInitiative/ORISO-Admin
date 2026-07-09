import { describe, expect, it } from 'vitest';
import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import { UserRole } from '../enums/UserRole';
import {
    canEditCaseHandoverReasonPolicies,
    canReadCaseHandoverAdmin,
    canSeeSupervisorLogs,
} from './caseHandoverAccess';

describe('canSeeSupervisorLogs', () => {
    it('allows tenant agency admins with consultant read access', () => {
        const can = (action: PermissionAction | PermissionAction[], resource: Resource) =>
            action === PermissionAction.Read && resource === Resource.Consultant;

        expect(canSeeSupervisorLogs(false, () => false, can)).toBe(true);
    });

    it('denies super admins, restricted agency admins, and users without consultant read', () => {
        const can = () => false;
        const canReadConsultant = (action: PermissionAction | PermissionAction[], resource: Resource) =>
            action === PermissionAction.Read && resource === Resource.Consultant;

        expect(canSeeSupervisorLogs(true, () => false, canReadConsultant)).toBe(false);
        expect(canSeeSupervisorLogs(false, (role) => role === UserRole.RestrictedAgencyAdmin, canReadConsultant)).toBe(
            false,
        );
        expect(canSeeSupervisorLogs(false, () => false, can)).toBe(false);
    });
});

describe('canReadCaseHandoverAdmin', () => {
    it('allows super admins regardless of consultant permissions', () => {
        const can = () => false;
        const hasRole = () => false;

        expect(canReadCaseHandoverAdmin(true, hasRole, can)).toBe(true);
    });

    it('allows consultant readers except restricted agency admins', () => {
        const can = (action: PermissionAction | PermissionAction[], resource: Resource) =>
            action === PermissionAction.Read && resource === Resource.Consultant;

        expect(canReadCaseHandoverAdmin(false, () => false, can)).toBe(true);
        expect(canReadCaseHandoverAdmin(false, (role) => role === UserRole.RestrictedAgencyAdmin, can)).toBe(false);
        expect(
            canReadCaseHandoverAdmin(
                false,
                () => false,
                () => false,
            ),
        ).toBe(false);
    });
});

describe('canEditCaseHandoverReasonPolicies', () => {
    it('allows super admins and consultant updaters', () => {
        const canUpdateConsultant = (action: PermissionAction | PermissionAction[], resource: Resource) =>
            action === PermissionAction.Update && resource === Resource.Consultant;

        expect(canEditCaseHandoverReasonPolicies(true, () => false)).toBe(true);
        expect(canEditCaseHandoverReasonPolicies(false, canUpdateConsultant)).toBe(true);
        expect(canEditCaseHandoverReasonPolicies(false, () => false)).toBe(false);
    });
});
