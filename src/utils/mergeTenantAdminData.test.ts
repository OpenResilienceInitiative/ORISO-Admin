import { describe, expect, it } from 'vitest';
import { mergeTenantAdminData } from './mergeTenantAdminData';
import { TenantAdminData } from '../types/TenantAdminData';

const baseTenantAdminData = (): TenantAdminData => ({
    id: 1,
    name: 'Demo tenant',
    isSuperAdmin: false,
    userRoles: [],
    adminEmails: [],
    settings: {
        featureAnonymousChatEnabled: false,
    },
    theming: {
        logo: 'logo.png',
        favicon: 'favicon.png',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
    },
    content: {
        impressum: { de: 'Impressum' },
        privacy: { de: 'Privacy' },
        termsAndConditions: { de: 'Terms' },
        claim: { de: 'Claim' },
        confirmTermsAndConditions: false,
        confirmPrivacy: false,
    },
});

describe('mergeTenantAdminData', () => {
    it('merges partial settings updates into the current tenant admin payload', () => {
        const merged = mergeTenantAdminData(baseTenantAdminData(), {
            settings: {
                featureAnonymousChatEnabled: true,
            },
        });

        expect(merged.settings.featureAnonymousChatEnabled).toBe(true);
        expect(merged.content.impressum).toEqual({ de: 'Impressum' });
    });

    it('supports updates when no current tenant admin payload is available', () => {
        const merged = mergeTenantAdminData(undefined, {
            settings: {
                featureAnonymousChatEnabled: true,
            },
        });

        expect(merged.settings.featureAnonymousChatEnabled).toBe(true);
        expect(merged.content).toEqual({});
    });

    it('removes translate helpers from content before returning', () => {
        const merged = mergeTenantAdminData(
            {
                ...baseTenantAdminData(),
                content: {
                    ...baseTenantAdminData().content,
                    impressum: {
                        de: 'Impressum',
                        translate: true,
                    } as unknown as TenantAdminData['content']['impressum'],
                },
            },
            {},
        );

        expect(merged.content.impressum).toEqual({ de: 'Impressum' });
    });
});
