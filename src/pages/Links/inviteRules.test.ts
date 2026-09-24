import { describe, expect, it } from 'vitest';
import type { AccountInviteDTO } from '../../api/accountInvites/accountInvites';
import {
    allocationModeOf,
    counsellorNeedsUnitAdmin,
    csvSendOrder,
    fieldsForRole,
    invitableRoles,
    isBulkSelectable,
    isValidEmail,
    listedOnTab,
    SELF_ASSIGN_ROLES,
} from './inviteRules';

const invite = (patch: Partial<AccountInviteDTO>) => ({ targetRole: 'COUNSELLOR', ...patch } as AccountInviteDTO);

describe('inviteRules', () => {
    it.each([
        ['platform', 'counsellor', ['COUNSELLOR', 'AGENCY_ADMIN', 'TENANT_ADMIN']],
        ['tenant', 'counsellor', ['COUNSELLOR', 'AGENCY_ADMIN', 'TENANT_ADMIN']],
        ['agency', 'counsellor', ['COUNSELLOR']],
        ['platform', 'tenant', ['TENANT_ADMIN']],
    ] as const)('lets a %s viewer on the %s tab invite %j', (viewer, tab, roles) => {
        expect(invitableRoles(viewer, tab)).toEqual(roles);
    });

    it('allows self-assignment as counsellor only', () => {
        expect(SELF_ASSIGN_ROLES).toEqual(['COUNSELLOR']);
    });

    it.each([
        ['COUNSELLOR', 'counsellor', { agency: true, topics: true, alsoCounsellor: false }],
        ['AGENCY_ADMIN', 'counsellor', { agency: true, topics: false, alsoCounsellor: true }],
        ['TENANT_ADMIN', 'counsellor', { agency: false, topics: false, alsoCounsellor: false }],
        ['TENANT_ADMIN', 'tenant', { agency: false, topics: false, alsoCounsellor: false }],
    ] as const)('shows the fields of a %s invite on the %s tab', (role, tab, fields) => {
        expect(fieldsForRole(role, tab)).toEqual(fields);
    });

    it.each([
        ['auto', 'AUTO'],
        ['manual', 'MANUAL'],
        ['existing', 'EXISTING'],
    ] as const)('sends the %s id field as %s', (mode, wire) => {
        expect(allocationModeOf(mode)).toBe(wire);
    });

    it.each([
        ['COUNSELLOR', 'auto', 'auto', true],
        ['COUNSELLOR', 'manual', 'available', true],
        ['COUNSELLOR', 'manual', 'reserved', false],
        ['COUNSELLOR', 'existing', 'existing', false],
        ['AGENCY_ADMIN', 'auto', 'auto', false],
    ] as const)('a %s into a %s agency (%s) needs a unit admin first: %s', (role, mode, validation, expected) => {
        expect(counsellorNeedsUnitAdmin(role, { mode, validation })).toBe(expected);
    });

    it.each([
        ['a@b.de', true],
        [' a@b.de ', true],
        ['a@b', false],
        ['a b@c.de', false],
    ])('checks the address %j: %s', (email, valid) => {
        expect(isValidEmail(email)).toBe(valid);
    });

    it('sends founding admins first: new Träger, then new agency, then the rest', () => {
        expect(csvSendOrder('TENANT_ADMIN', 'NEW')).toBeLessThan(csvSendOrder('AGENCY_ADMIN', 'NEW'));
        expect(csvSendOrder('AGENCY_ADMIN', 'NEW')).toBeLessThan(csvSendOrder('COUNSELLOR', 'NEW'));
        expect(csvSendOrder('AGENCY_ADMIN', 'EXISTING')).toBe(csvSendOrder('COUNSELLOR', 'NEW'));
    });

    it.each([
        ['DRAFT', true],
        ['EMAIL_SENT', true],
        ['WAITING_FOR_UNIT', false],
        ['ACCEPTED', false],
        ['REVOKED', false],
    ] as const)('lets a %s invite into the bulk selection: %s', (inviteStatus, selectable) => {
        expect(isBulkSelectable(invite({ inviteStatus }))).toBe(selectable);
    });

    it.each([
        [{ targetRole: 'TENANT_ADMIN', tenantIdAllocationMode: 'AUTO' }, 'tenant', 'platform', true],
        [{ targetRole: 'TENANT_ADMIN', tenantIdAllocationMode: 'EXISTING' }, 'tenant', 'platform', false],
        [{ targetRole: 'TENANT_ADMIN', tenantIdAllocationMode: 'EXISTING' }, 'counsellor', 'platform', true],
        [{ targetRole: 'AGENCY_ADMIN' }, 'counsellor', 'tenant', true],
        [{ targetRole: 'AGENCY_ADMIN' }, 'counsellor', 'agency', false],
        [{ targetRole: 'ADVICE_SEEKER' }, 'counsellor', 'platform', false],
    ] as const)('lists %j on the %s tab for a %s viewer: %s', (patch, tab, viewer, listed) => {
        expect(listedOnTab(invite(patch as Partial<AccountInviteDTO>), tab, viewer)).toBe(listed);
    });
});
