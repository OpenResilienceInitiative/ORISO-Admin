import { describe, expect, it } from 'vite-plus/test';
import type { AgencyData } from '../../../types/agency';
import {
    dataProtectionContactTileStatus,
    imprintTileStatus,
    privacyTileStatus,
    responsibleTileStatus,
} from './agencyLegalTileStatus';

const contact = { nameAndLegalForm: 'Nordlicht e. V.', postcode: '10115', city: 'Berlin', phoneNumber: '030 1' };
const agency = (patch: Record<string, unknown>) => patch as unknown as AgencyData;

describe('agency legal tile status', () => {
    it('reports the responsible contact as complete only when its required fields are filled', () => {
        expect(
            responsibleTileStatus(agency({ dataProtection: { agencyDataProtectionResponsibleContact: contact } })).key,
        ).toBe('agency.legal.status.complete');
        const incomplete = responsibleTileStatus(
            agency({ dataProtection: { agencyDataProtectionResponsibleContact: { ...contact, city: '' } } }),
        );
        expect(incomplete).toEqual({ key: 'agency.legal.status.missing', tone: 'attention' });
    });

    it('shows the Träger DPO as inherited while the Beratungsstelle names none', () => {
        const status = dataProtectionContactTileStatus(
            agency({ dataProtection: { dataProtectionResponsibleEntity: 'DATA_PROTECTION_OFFICER' } }),
            { nameAndLegalForm: 'Träger DSB' },
        );
        expect(status.key).toBe('tenants.legal.departmentDataProtection.status.inheritedFromTraeger');
    });

    it('asks for details when no data protection contact exists anywhere', () => {
        expect(dataProtectionContactTileStatus(agency({}), null).tone).toBe('attention');
    });

    it('calls a document published only when the agency-wide text has content', () => {
        expect(imprintTileStatus(agency({ content: { impressum: { de: '<p>Text</p>' } } })).key).toBe(
            'legal.status.published',
        );
        expect(imprintTileStatus(agency({ content: { impressum: { de: ' ' } } })).key).toBe('legal.status.empty');
        expect(privacyTileStatus(agency({ content: { privacy: {} } })).key).toBe(
            'tenants.legal.departmentDataProtection.status.inheritedFromTraeger',
        );
    });
});
