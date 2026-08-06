import { describe, expect, it } from 'vitest';
import { mapTenantDataToTenantAdminData } from './mapTenantDataToTenantAdminData';
import { TenantData } from '../types/tenant';

const baseTenantData = (): TenantData => ({
    id: 1,
    name: 'Demo tenant',
    isSuperAdmin: false,
    userRoles: [],
    settings: {
        featureAnonymousChatEnabled: true,
    },
    theming: {
        logo: 'logo.png',
        favicon: 'favicon.png',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
    },
    content: {
        impressum: 'Impressum text',
        privacy: 'Privacy text',
        termsAndConditions: 'Terms text',
        claim: 'Claim text',
    },
});

describe('mapTenantDataToTenantAdminData', () => {
    it('maps tenant-service strings into admin translatable content records', () => {
        const mapped = mapTenantDataToTenantAdminData(baseTenantData());

        expect(mapped.adminEmails).toEqual([]);
        expect(mapped.content.impressum).toEqual({ de: 'Impressum text' });
        expect(mapped.content.privacy).toEqual({ de: 'Privacy text' });
        expect(mapped.content.termsAndConditions).toEqual({ de: 'Terms text' });
        expect(mapped.content.claim).toEqual({ de: 'Claim text' });
        expect(mapped.settings.featureAnonymousChatEnabled).toBe(true);
    });

    it('preserves already-translated admin content objects', () => {
        const mapped = mapTenantDataToTenantAdminData({
            ...baseTenantData(),
            content: {
                impressum: { de: 'DE', en: 'EN' },
                privacy: { de: 'DE privacy' },
                termsAndConditions: { de: 'DE terms' },
                claim: { de: 'DE claim' },
            } as unknown as TenantData['content'],
        });

        expect(mapped.content.impressum).toEqual({ de: 'DE', en: 'EN' });
        expect(mapped.content.privacy).toEqual({ de: 'DE privacy' });
    });

    it('falls back to top-level legal fields returned by /service/tenant', () => {
        const tenant = {
            ...baseTenantData(),
            content: {
                impressum: null,
                privacy: null,
                termsAndConditions: null,
                claim: '',
            },
            impressum: 'Top-level impressum',
            privacy: 'Top-level privacy',
            termsAndConditions: 'Top-level terms',
            claim: 'Top-level claim',
        } as TenantData;

        const mapped = mapTenantDataToTenantAdminData(tenant);

        expect(mapped.content.impressum).toEqual({ de: 'Top-level impressum' });
        expect(mapped.content.privacy).toEqual({ de: 'Top-level privacy' });
        expect(mapped.content.termsAndConditions).toEqual({ de: 'Top-level terms' });
        expect(mapped.content.claim).toEqual({ de: 'Top-level claim' });
    });
});
