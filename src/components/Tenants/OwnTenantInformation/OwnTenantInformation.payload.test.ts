import { describe, expect, it } from 'vite-plus/test';
import { serializeTenantAdminDataUpdate } from '../../../utils/mergeTenantAdminData';
import { TenantAdminData } from '../../../types/TenantAdminData';

/**
 * TenantService refuses a Träger admin's PUT that changes the subdomain or the licence number, and it
 * replaces every field it is sent. The card sends only its own fields; the shared mutation lays them
 * onto a fresh full read. This pins that the result still carries the stored subdomain and licence.
 */
describe('Träger information save payload (ORISO-Admin#1466)', () => {
    const stored = {
        id: 7,
        name: 'Caritas Springfield',
        subdomain: 'springfield',
        licensing: { allowedNumberOfUsers: 5 },
        address: 'Evergreen Terrace 742',
        description: 'old',
        legalName: 'Caritas Springfield e. V.',
        theming: { primaryColor: '#123456' },
        content: { claim: { de: 'Slogan' } },
        settings: { featureToolsEnabled: true },
    } as unknown as TenantAdminData;

    it('changes the card fields and leaves subdomain, licence, name, branding and settings as stored', () => {
        const body = JSON.parse(
            serializeTenantAdminDataUpdate(stored, {
                address: 'Ahornweg 1',
                description: '',
                dataProtectionOfficer: { nameAndLegalForm: 'Datenschutz GmbH' },
            } as Partial<TenantAdminData>),
        );

        expect(body.address).toBe('Ahornweg 1');
        expect(body.description).toBe('');
        expect(body.dataProtectionOfficer).toEqual({ nameAndLegalForm: 'Datenschutz GmbH' });
        expect(body.subdomain).toBe('springfield');
        expect(body.licensing).toEqual({ allowedNumberOfUsers: 5 });
        expect(body.name).toBe('Caritas Springfield');
        expect(body.legalName).toBe('Caritas Springfield e. V.');
        expect(body.theming).toEqual({ primaryColor: '#123456' });
        expect(body.content.claim).toEqual({ de: 'Slogan' });
        expect(body.settings).toEqual({ featureToolsEnabled: true });
    });
});
