import { describe, expect, it } from 'vitest';
import { mergeTenantAdminData, serializeTenantAdminDataUpdate } from './mergeTenantAdminData';
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

describe('serializeTenantAdminDataUpdate', () => {
    it('omits only the unchanged null quota and preserves unrelated payload and cache shape', () => {
        const base = { ...baseTenantAdminData(), licensing: { allowedNumberOfUsers: null } };
        const patch = { settings: { featureSystemNotificationEmailsEnabled: true } };
        const merged = mergeTenantAdminData(base, patch);
        const expected = { ...merged };
        delete expected.licensing;
        expect(JSON.parse(serializeTenantAdminDataUpdate(base, patch))).toEqual(expected);
        expect(base.licensing).toEqual({ allowedNumberOfUsers: null });
        expect(merged.licensing).toEqual({ allowedNumberOfUsers: null });
    });

    it.each([0, 12])('preserves a configured quota of %s', (allowedNumberOfUsers) => {
        const base = { ...baseTenantAdminData(), licensing: { allowedNumberOfUsers } };
        expect(JSON.parse(serializeTenantAdminDataUpdate(base, {})).licensing).toEqual(base.licensing);
    });

    it.each([{ allowedNumberOfUsers: null }, { allowedNumberOfUsers: 25 }])(
        'preserves an explicit licensing update %j',
        (licensing) => {
            const base = { ...baseTenantAdminData(), licensing: { allowedNumberOfUsers: 12 } };
            expect(JSON.parse(serializeTenantAdminDataUpdate(base, { licensing })).licensing).toEqual(licensing);
        },
    );

    it('preserves additional licensing fields even when the quota is null', () => {
        const base = { ...baseTenantAdminData(), licensing: { allowedNumberOfUsers: null, videoFeature: false } };
        expect(JSON.parse(serializeTenantAdminDataUpdate(base, {})).licensing).toEqual(base.licensing);
    });

    it('does not materialize missing licensing', () => {
        expect(JSON.parse(serializeTenantAdminDataUpdate(baseTenantAdminData(), {}))).not.toHaveProperty('licensing');
    });

    it('replaces legal language maps instead of restoring removed languages', () => {
        const current = {
            content: {
                impressum: { de: 'Impressum', en: 'Imprint' },
                privacyConsent: { de: 'Ja', en: 'Yes' },
                claim: { de: 'Claim' },
            },
        } as any;
        const merged = mergeTenantAdminData(current, {
            content: { impressum: { de: 'Neu' }, privacyConsent: {} },
        } as any);
        expect(merged.content.impressum).toEqual({ de: 'Neu' });
        expect(merged.content.privacyConsent).toEqual({});
        expect(merged.content.claim).toEqual({ de: 'Claim' });
    });

    it("does not write a partial legal map into the caller's data", () => {
        const current = { content: { impressum: { de: 'Alt', en: 'Old' } } } as any;
        const merged = mergeTenantAdminData(current, { content: { impressum: { de: 'Neu' } } } as any);
        expect(merged.content.impressum).toEqual({ de: 'Neu' });
        expect(current.content.impressum).toEqual({ de: 'Alt', en: 'Old' });
    });
});
