import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

describe('user assignment fields', () => {
    it('renders tenant and agency assignment only once when consultant topics are enabled', () => {
        expect(source.match(/name="tenantId"/g)).toHaveLength(1);
        expect(source.match(/name="agencies"/g)).toHaveLength(1);
        expect(source.match(/name="topicIds"/g)).toHaveLength(1);
    });
});

describe('personal-info fields (#994)', () => {
    it('renders each personal-info field exactly once', () => {
        expect(source.match(/name="salutation"/g)).toHaveLength(1);
        expect(source.match(/name="position"/g)).toHaveLength(1);
        expect(source.match(/name="title"/g)).toHaveLength(1);
        expect(source.match(/name="adminRemarks"/g)).toHaveLength(1);
    });

    it('gates the remarks field behind the tenant-level-admin check instead of only disabling it', () => {
        // Remarks are unreadable for roles below tenant admin, so the field must be
        // omitted entirely (not disabled) for them.
        const remarksBlock = source.slice(
            source.indexOf('{canManageAdminRemarks && ('),
            source.indexOf('name="adminRemarks"'),
        );
        expect(remarksBlock.length).toBeGreaterThan(0);
        expect(source.indexOf('{canManageAdminRemarks && (')).toBeLessThan(source.indexOf('name="adminRemarks"'));
    });

    it('derives the remarks permission from tenant-level admin roles', () => {
        expect(source).toContain('hasRole([UserRole.TenantAdmin, UserRole.SingleTenantAdmin])');
    });

    it('does not offer to clear the salutation, which would not persist', () => {
        // Clearing the select yields `undefined`; editCounselorData omits undefined and the
        // backend reads an omitted field as "leave unchanged", so the clear affordance would
        // silently do nothing. `not_specified` is the canonical "no salutation" value.
        const salutationField = source.slice(source.indexOf('name="salutation"'));
        const fieldEnd = salutationField.indexOf('/>');

        expect(salutationField.slice(0, fieldEnd)).not.toContain('allowClear');
        expect(source).toContain("'not_specified'");
    });
});
