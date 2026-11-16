import { describe, expect, it } from 'vite-plus/test';
import type { AgencyContactPersonAdmin, ContactAdmin } from '../../../types/contactPerson';
import { centresForAdmin, nextPair, planContactRoleChanges, roleOf } from './contactRolesModel';

const admin = (adminId: string, firstName: string): ContactAdmin => ({
    adminId,
    firstName,
    lastName: 'Muster',
    loginEmail: `${adminId}@example.org`,
    displayEmail: `${adminId}@example.org`,
    type: 'AGENCY',
    isConsultant: false,
});

const ME = 'me';
const OTHER = admin('other', 'Olga');
const SELF = admin(ME, 'Mia');

const pair = (agencyId: number, contact?: ContactAdmin, deputy?: ContactAdmin): AgencyContactPersonAdmin => ({
    agencyId,
    tenantId: 1,
    contact,
    deputy,
    traegerDefault: {},
    effectiveSource: contact ? 'OWN' : 'NONE',
});

describe('roleOf', () => {
    it('reads the role this admin holds at a centre', () => {
        expect(roleOf(pair(1, SELF, OTHER), ME)).toBe('CONTACT');
        expect(roleOf(pair(1, OTHER, SELF), ME)).toBe('DEPUTY');
        expect(roleOf(pair(1, OTHER), ME)).toBe('NONE');
        expect(roleOf(undefined, ME)).toBe('NONE');
    });
});

describe('centresForAdmin', () => {
    it('lists only centres whose pair loaded and names the current contact', () => {
        const rows = centresForAdmin(
            [
                { id: 1, name: 'Nord' },
                { id: '2', name: 'Süd' },
            ],
            { 1: pair(1, OTHER) },
            ME,
        );
        expect(rows).toEqual([{ agencyId: 1, agencyName: 'Nord', role: 'NONE', currentContactName: 'Olga Muster' }]);
    });
});

describe('nextPair', () => {
    it('makes the admin the contact and keeps the deputy', () => {
        expect(nextPair(pair(1, OTHER, admin('d', 'Dora')), ME, 'CONTACT')).toEqual({
            contactAdminId: ME,
            deputyAdminId: 'd',
        });
    });

    it('swaps roles when the deputy becomes the contact', () => {
        expect(nextPair(pair(1, OTHER, SELF), ME, 'CONTACT')).toEqual({ contactAdminId: ME, deputyAdminId: null });
    });

    it('refuses a deputy without another contact', () => {
        expect(nextPair(pair(1), ME, 'DEPUTY')).toEqual({ errorKey: 'admin.contactPersonFor.deputyNeedsContact' });
        expect(nextPair(pair(1, SELF), ME, 'DEPUTY')).toEqual({
            errorKey: 'admin.contactPersonFor.deputyNeedsContact',
        });
    });

    it('moves the deputy up when the contact steps down', () => {
        expect(nextPair(pair(1, SELF, OTHER), ME, 'NONE')).toEqual({ contactAdminId: 'other', deputyAdminId: null });
    });

    it('drops only the deputy when the deputy steps down', () => {
        expect(nextPair(pair(1, OTHER, SELF), ME, 'NONE')).toEqual({ contactAdminId: 'other', deputyAdminId: null });
    });
});

describe('planContactRoleChanges', () => {
    it('makes one call per changed row only', () => {
        const pairs = { 1: pair(1, OTHER), 2: pair(2, SELF), 3: pair(3) };
        const plan = planContactRoleChanges({
            adminId: ME,
            pairs,
            roles: { 1: 'DEPUTY', 2: 'CONTACT', 3: 'DEPUTY' },
        });
        expect(plan.updates).toEqual([{ agencyId: 1, update: { contactAdminId: 'other', deputyAdminId: ME } }]);
        expect(plan.errors).toEqual([{ agencyId: 3, errorKey: 'admin.contactPersonFor.deputyNeedsContact' }]);
    });

    it('ignores rows of centres that did not load', () => {
        expect(planContactRoleChanges({ adminId: ME, pairs: {}, roles: { 9: 'CONTACT' } })).toEqual({
            updates: [],
            errors: [],
        });
    });
});
