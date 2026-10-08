import { describe, expect, it } from 'vitest';
import { buildTenantRequestBody } from './useAddOrUpdateTenant.hook';
import { TenantAdminData } from '../types/TenantAdminData';

const STORED = {
    id: 7,
    name: 'Caritas Musterstadt',
    subdomain: 'musterstadt',
    address: 'Musterstraße 1, 12345 Musterstadt',
    legalName: 'Caritasverband für die Erzdiözese Musterstadt e.V.',
    contactEmail: 'beratung@caritas-musterstadt.de',
    contactPhone: '+49 761 200-0',
    licensing: { allowedNumberOfUsers: 5 },
    settings: {},
} as unknown as TenantAdminData;

const form = (overrides: Record<string, unknown> = {}) =>
    ({
        name: 'Caritas Musterstadt',
        licensing: { allowedNumberOfUsers: 5 },
        settings: {},
        ...overrides,
    } as unknown as TenantAdminData);

describe('buildTenantRequestBody — Träger sender block', () => {
    it('sends the legal name and contact the form carries', () => {
        const body = buildTenantRequestBody(
            STORED,
            form({ legalName: 'Neuer Name e.V.', contactEmail: 'neu@example.org', contactPhone: '0761 1' }),
            'musterstadt',
        );

        expect(body).toMatchObject({
            legalName: 'Neuer Name e.V.',
            contactEmail: 'neu@example.org',
            contactPhone: '0761 1',
        });
    });

    it('keeps the stored values when the saving form does not carry the fields', () => {
        // Absent is not empty: a form without these fields must not blank them (Admin#715 pattern).
        const body = buildTenantRequestBody(STORED, form(), 'musterstadt');

        expect(body).toMatchObject({
            legalName: 'Caritasverband für die Erzdiözese Musterstadt e.V.',
            contactEmail: 'beratung@caritas-musterstadt.de',
            contactPhone: '+49 761 200-0',
        });
    });

    it('sends an emptied field as an empty string, which TenantService stores as "not entered"', () => {
        const body = buildTenantRequestBody(STORED, form({ contactPhone: '' }), 'musterstadt');

        expect(body.contactPhone).toBe('');
        expect(body.legalName).toBe('Caritasverband für die Erzdiözese Musterstadt e.V.');
    });

    it('never forwards the frontend-only topic field and keeps name, subdomain and address', () => {
        const body = buildTenantRequestBody(STORED, form({ topic: 'Sucht', address: 'Neue Straße 2' }), 'musterstadt');

        expect(body).not.toHaveProperty('topic');
        expect(body).toMatchObject({
            name: 'Caritas Musterstadt',
            subdomain: 'musterstadt',
            address: 'Neue Straße 2',
        });
    });
});

describe('buildTenantRequestBody — Träger DPO (Admin#1067)', () => {
    const dpo = { nameAndLegalForm: 'Dr. Maria Muster', email: 'dsb@example.org' };

    it('sends the DPO the form carries', () => {
        const body = buildTenantRequestBody(STORED, form({ dataProtectionOfficer: dpo }), 'musterstadt');
        expect(body.dataProtectionOfficer).toEqual(dpo);
    });

    it('keeps the stored DPO when the saving form does not carry it', () => {
        const stored = { ...STORED, dataProtectionOfficer: dpo } as TenantAdminData;
        const body = buildTenantRequestBody(stored, form(), 'musterstadt');
        expect(body.dataProtectionOfficer).toEqual(dpo);
    });
});
