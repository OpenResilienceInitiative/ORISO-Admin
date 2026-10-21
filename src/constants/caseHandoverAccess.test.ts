import { describe, expect, it } from 'vite-plus/test';
import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import {
    canEditCaseHandoverReasonPolicies,
    canReadCaseHandoverAdmin,
    canSeeSupervisorLogs,
} from './caseHandoverAccess';

const canReadConsultant = (action: PermissionAction | PermissionAction[], resource: Resource) =>
    action === PermissionAction.Read && resource === Resource.Consultant;

describe('canSeeSupervisorLogs', () => {
    it('allows every admin with consultant read access', () => {
        expect(canSeeSupervisorLogs(false, canReadConsultant)).toBe(true);
    });

    it('includes Beratungsstellen-Admins, who hold consultant read through `user-admin`', () => {
        // `restricted-agency-admin` is always paired with `user-admin` (see the UserService's
        // CreateAdminService), so consultant read is what decides — not the agency-scoped role.
        expect(canSeeSupervisorLogs(false, canReadConsultant)).toBe(true);
    });

    it('denies super admins and admins without consultant read', () => {
        expect(canSeeSupervisorLogs(true, canReadConsultant)).toBe(false);
        expect(canSeeSupervisorLogs(false, () => false)).toBe(false);
    });
});

describe('canReadCaseHandoverAdmin', () => {
    it('allows super admins regardless of consultant permissions', () => {
        expect(canReadCaseHandoverAdmin(true, () => false)).toBe(true);
    });

    it('allows every consultant reader, Beratungsstellen-Admins included', () => {
        expect(canReadCaseHandoverAdmin(false, canReadConsultant)).toBe(true);
        expect(canReadCaseHandoverAdmin(false, () => false)).toBe(false);
    });
});

describe('canEditCaseHandoverReasonPolicies', () => {
    // The rules are Träger settings (FE#1725): Träger write access decides, not consultant admin.
    it('allows super admins and Träger updaters, not consultant updaters alone (BST admins)', () => {
        const canUpdate = (target: Resource) => (action: PermissionAction | PermissionAction[], resource: Resource) =>
            action === PermissionAction.Update && resource === target;

        expect(canEditCaseHandoverReasonPolicies(true, () => false)).toBe(true);
        expect(canEditCaseHandoverReasonPolicies(false, canUpdate(Resource.Tenant))).toBe(true);
        expect(canEditCaseHandoverReasonPolicies(false, canUpdate(Resource.Consultant))).toBe(false);
        expect(canEditCaseHandoverReasonPolicies(false, () => false)).toBe(false);
    });
});
