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
    roleMenuFor,
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

    describe('roleMenuFor (the role chip in the table)', () => {
        const open = (patch: Partial<AccountInviteDTO> = {}) => invite({ inviteStatus: 'EMAIL_SENT', ...patch });
        const accepted = (patch: Partial<AccountInviteDTO> = {}) =>
            invite({
                inviteStatus: 'ACCEPTED',
                acceptedAt: '2026-09-20T10:00:00Z',
                provisionedUserId: 'c-31',
                ...patch,
            });

        it('swaps Berater:in and BST-Admin on an open invite; Träger-Admin needs a new invite', () => {
            expect(roleMenuFor(open(), 'tenant', 'counsellor')).toEqual({
                mode: 'change',
                entries: [
                    { action: 'change', role: 'COUNSELLOR', current: true },
                    { action: 'change', role: 'AGENCY_ADMIN', current: false },
                    { action: 'change', role: 'TENANT_ADMIN', current: false, disabledReason: 'needsNewInvite' },
                ],
                pointsToUsers: false,
            });
        });

        it('keeps a Träger-Admin invite into an existing Träger where it is: other roles need a new invite', () => {
            const { entries } = roleMenuFor(
                open({ targetRole: 'TENANT_ADMIN', tenantIdAllocationMode: 'EXISTING' }),
                'platform',
                'counsellor',
            );
            expect(entries.map((entry) => entry.disabledReason)).toEqual([
                'needsNewInvite',
                'needsNewInvite',
                undefined,
            ]);
        });

        it('treats drafts and invites waiting for a unit as open', () => {
            expect(roleMenuFor(open({ inviteStatus: 'DRAFT' }), 'platform', 'counsellor').mode).toBe('change');
            expect(roleMenuFor(open({ inviteStatus: 'WAITING_FOR_UNIT' }), 'platform', 'counsellor').mode).toBe(
                'change',
            );
        });

        it('shows the roles an agency admin may not hand out, disabled with the reason', () => {
            expect(roleMenuFor(open(), 'agency', 'counsellor').entries).toEqual([
                { action: 'change', role: 'COUNSELLOR', current: true },
                { action: 'change', role: 'AGENCY_ADMIN', current: false, disabledReason: 'notInvitable' },
                { action: 'change', role: 'TENANT_ADMIN', current: false, disabledReason: 'notInvitable' },
            ]);
        });

        it('only adds "auch BST-Admin" once the account exists; removal points to the users area', () => {
            expect(roleMenuFor(accepted(), 'tenant', 'counsellor')).toEqual({
                mode: 'add',
                entries: [
                    { action: 'add', role: 'AGENCY_ADMIN', current: false },
                    { action: 'change', role: 'COUNSELLOR', current: true, disabledReason: 'accountExists' },
                    { action: 'change', role: 'AGENCY_ADMIN', current: false, disabledReason: 'accountExists' },
                    { action: 'change', role: 'TENANT_ADMIN', current: false, disabledReason: 'accountExists' },
                ],
                pointsToUsers: true,
            });
        });

        it('offers the added role disabled once the account already has it', () => {
            expect(roleMenuFor(accepted({ targetRole: 'AGENCY_ADMIN' }), 'tenant', 'counsellor').entries[0]).toEqual({
                action: 'add',
                role: 'AGENCY_ADMIN',
                current: false,
                disabledReason: 'alreadyHasRole',
            });
            // The list carries the account's roles, so this survives a reload.
            expect(
                roleMenuFor(accepted({ accountRoles: ['COUNSELLOR', 'AGENCY_ADMIN'] }), 'tenant', 'counsellor')
                    .entries[0].disabledReason,
            ).toBe('alreadyHasRole');
        });

        it('keeps "auch BST-Admin" disabled for a viewer who may not hand it out', () => {
            expect(roleMenuFor(accepted(), 'agency', 'counsellor').entries[0].disabledReason).toBe('notInvitable');
        });

        it('waits for the account before adding a role to it', () => {
            expect(
                roleMenuFor(accepted({ provisionedUserId: null }), 'tenant', 'counsellor').entries[0].disabledReason,
            ).toBe('accountPending');
        });

        it('locks the chip of an inactive invite and of a Träger founder', () => {
            const expired = roleMenuFor(open({ inviteStatus: 'EXPIRED' }), 'platform', 'counsellor');
            expect(expired.mode).toBe('locked');
            expect(expired.lockedReason).toBe('inactive');
            expect(expired.entries.every((entry) => entry.disabledReason === 'inactive')).toBe(true);

            const founder = roleMenuFor(
                open({ targetRole: 'TENANT_ADMIN', tenantIdAllocationMode: 'AUTO' }),
                'platform',
                'tenant',
            );
            expect(founder).toEqual({
                mode: 'locked',
                lockedReason: 'foundsTenant',
                entries: [{ action: 'change', role: 'TENANT_ADMIN', current: true, disabledReason: 'foundsTenant' }],
                pointsToUsers: false,
            });
        });
    });
});
