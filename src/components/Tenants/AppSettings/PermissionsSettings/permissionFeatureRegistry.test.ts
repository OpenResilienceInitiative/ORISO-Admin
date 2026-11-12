import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import { agencyPermissionPolicies } from './agencyPermissionPolicies';
import { CHAT_TYPE_CARDS } from './chatTypeCards';
import { PERMISSION_FEATURE_KEYS, splitPermissionFeatureWrites } from './permissionFeatureRegistry';
import {
    DEFAULT_PERMISSION_SETTINGS,
    PLATFORM_TOGGLE_FIELDS,
    permissionPolicySource,
    resolvePermissionPolicy,
} from './permissionsSettingsUtils';

const DEFAULT_KEYS = Object.keys(DEFAULT_PERMISSION_SETTINGS);
const FEATURES = [...PERMISSION_FEATURE_KEYS];

describe('permission feature registry (drift guard, ORISO-TenantService#363)', () => {
    it('every toggle family field is a known feature with a default', () => {
        Object.values(PLATFORM_TOGGLE_FIELDS)
            .flat()
            .forEach((field) => expect(DEFAULT_KEYS).toContain(field));
    });

    it('every feature with a default belongs to a toggle family, except direct invite', () => {
        const familyFields = new Set(Object.values(PLATFORM_TOGGLE_FIELDS).flat());
        const outside = DEFAULT_KEYS.filter((field) => !familyFields.has(field));
        expect(outside.sort()).toEqual([
            'featureDirectInviteAudioEnabled',
            'featureDirectInviteChatEnabled',
            'featureDirectInviteVideoEnabled',
        ]);
    });

    it('every feature switch on a tile is a registered feature', () => {
        CHAT_TYPE_CARDS.forEach((card) => {
            [card.masterField, ...card.toggles.map((toggle) => toggle.field)]
                .filter(Boolean)
                .forEach((field) => expect(FEATURES).toContain(field![1]));
        });
    });
});

const suggestion = (value: boolean): PolicyValue<boolean> => ({ value, mode: 'SUGGESTED', inherited: true });
const none: ReadonlySet<string> = new Set();

describe.each(FEATURES)('effective value contract for %s', (field) => {
    describe('Träger level', () => {
        const resolve = (policy: PolicyValue<boolean> | undefined, own: unknown, restricted = none) =>
            resolvePermissionPolicy(policy && { [field]: policy }, field, own ?? policy?.value, restricted, own);

        it('stored own off beats an inherited suggestion on', () => {
            const policy = resolve(suggestion(true), false);
            expect(policy.value).toBe(false);
            expect(permissionPolicySource(policy)).toBe('own');
        });
        it('without an own choice the suggestion is the value', () => {
            const policy = resolve(suggestion(true), undefined);
            expect(policy.value).toBe(true);
            expect(permissionPolicySource(policy)).toBe('suggested');
        });
        it('an enforced policy from above is locked on', () => {
            const policy = resolve({ value: true, mode: 'ENFORCED', inherited: true }, false);
            expect(policy).toMatchObject({ value: true, mode: 'ENFORCED' });
            expect(permissionPolicySource(policy)).toBe('enforced');
        });
        it('a forbidden feature is locked off', () => {
            const policy = resolvePermissionPolicy(undefined, field, false, new Set([field]), true);
            expect(policy).toMatchObject({ value: false, mode: 'ENFORCED' });
            expect(permissionPolicySource(policy)).toBe('forbidden');
        });
    });

    describe('Beratungsstelle level', () => {
        it('stored own off beats the Träger suggestion on', () => {
            const policy = agencyPermissionPolicies({
                [field]: false,
                permissionPolicies: { [field]: suggestion(true) },
            } as never)[field];
            expect(policy.value).toBe(false);
            expect(permissionPolicySource(policy)).toBe('own');
        });
        it('without an own choice the Träger suggestion is the value', () => {
            const policy = agencyPermissionPolicies({ permissionPolicies: { [field]: suggestion(true) } } as never)[
                field
            ];
            expect(policy.value).toBe(true);
            expect(permissionPolicySource(policy)).toBe('suggested');
        });
        it('a Träger requirement stays locked on over an own off', () => {
            const policy = agencyPermissionPolicies({
                [field]: false,
                permissionPolicies: { [field]: { value: true, mode: 'ENFORCED', inherited: true } },
            } as never)[field];
            expect(permissionPolicySource(policy)).toBe('enforced');
        });
        it('a Träger ban stays locked off over an own on', () => {
            const policy = agencyPermissionPolicies({
                [field]: true,
                permissionPolicies: { [field]: { value: false, mode: 'ENFORCED', inherited: true } },
            } as never)[field];
            expect(policy.value).toBe(false);
            expect(permissionPolicySource(policy)).toBe('forbidden');
        });
    });
});

describe('single writer for permission features', () => {
    it('a changed feature becomes an own policy and leaves the settings write', () => {
        const { rest, changed } = splitPermissionFeatureWrites(
            { featureSupervisionEnabled: false, featureTopicsEnabled: true },
            { featureSupervisionEnabled: true },
            { featureSupervisionEnabled: suggestion(true) },
        );
        expect(rest).toEqual({ featureTopicsEnabled: true });
        expect(changed).toEqual({ featureSupervisionEnabled: { value: false, mode: 'SUGGESTED', inherited: false } });
    });

    // Screens outside the permissions panel must not put a feature key into a raw settings save.
    it('no Admin screen writes a permission feature as a raw setting', () => {
        const root = join(__dirname, '../../../..');
        const allowed = [
            'components/Tenants/AppSettings/PermissionsSettings/',
            'types/',
            'context/FeatureContext.tsx',
            'enums/FeatureFlag.ts',
            'locales/',
        ];
        const files: string[] = [];
        const walk = (dir: string) =>
            readdirSync(dir).forEach((name) => {
                const path = join(dir, name);
                if (statSync(path).isDirectory()) walk(path);
                else if (/\.(ts|tsx)$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name)) files.push(path);
            });
        walk(root);
        const offenders = files.filter((file) => {
            const rel = relative(root, file);
            if (allowed.some((prefix) => rel.startsWith(prefix))) return false;
            const source = readFileSync(file, 'utf8');
            if (!FEATURES.some((field) => source.includes(`'${field}'`))) return false;
            // A screen that shows a feature switch must route its save through the policy writer.
            return !source.includes('splitPermissionFeatureWrites');
        });
        expect(offenders).toEqual([]);
    });
});
