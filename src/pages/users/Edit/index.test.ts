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
});

describe('dual display names (#996)', () => {
    it('renders both name inputs exactly once', () => {
        expect(source.match(/name="displayName"/g)).toHaveLength(1);
        expect(source.match(/name="internalDisplayName"/g)).toHaveLength(1);
    });

    it('explains the fallback on both fields via helper text', () => {
        expect(source).toContain("helpText={t('counselor.displayName.hint')}");
        expect(source).toContain("helpText={t('counselor.internalDisplayName.hint')}");
    });
});
