import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    findStoredCsvInvite,
    toCreateInviteRequest,
    type InviteDraft,
    type InviteRequestContext,
} from './inviteRequest';

const listAccountInvites = vi.hoisted(() => vi.fn());
vi.mock('../../api/accountInvites/accountInvites', () => ({
    listAccountInvites,
    acceptBaseUrlForRole: (role: string) => `https://admin.test/accept/${role}`,
}));

const draft = (patch: Partial<InviteDraft> = {}): InviteDraft => ({
    kind: 'draft',
    role: 'COUNSELLOR',
    recipientEmail: 'lisa@example.org',
    firstName: 'Lisa',
    lastName: 'Simpson',
    tenant: { mode: 'existing', id: 79 },
    agency: { mode: 'existing', id: 14 },
    alsoCounsellor: true,
    topicPermission: 'CREATE',
    templateId: 7,
    ...patch,
});
const counsellorTab: InviteRequestContext = {
    tab: 'counsellor',
    viewer: 'tenant',
    sendMode: 'direct',
    ownTenantId: 79,
};
const tenantTab: InviteRequestContext = { tab: 'tenant', viewer: 'platform', sendMode: 'direct' };

describe('toCreateInviteRequest from the bar', () => {
    it('sends a counsellor into an existing agency with the topic permission shown', () => {
        expect(toCreateInviteRequest(draft(), counsellorTab)).toEqual({
            acceptBaseUrl: 'https://admin.test/accept/COUNSELLOR',
            expiresInDays: 30,
            targetRole: 'COUNSELLOR',
            recipientEmail: 'lisa@example.org',
            firstName: 'Lisa',
            lastName: 'Simpson',
            tenantId: 79,
            tenantIdAllocationMode: 'EXISTING',
            agencyId: 14,
            agencyIdAllocationMode: 'EXISTING',
            topicPermission: 'CREATE',
            templateId: 7,
        });
    });

    it('sends "Berät auch" only for an agency admin, and no topic permission', () => {
        const request = toCreateInviteRequest(draft({ role: 'AGENCY_ADMIN', agency: { mode: 'auto' } }), counsellorTab);
        expect(request).toMatchObject({ alsoCounsellor: true, agencyIdAllocationMode: 'AUTO' });
        expect(request.topicPermission).toBeUndefined();
        expect(request.agencyId).toBeUndefined();
    });

    it('sends no agency for a Träger admin, and no template when only creating', () => {
        const request = toCreateInviteRequest(draft({ role: 'TENANT_ADMIN' }), {
            ...counsellorTab,
            sendMode: 'createOnly',
        });
        expect(request.agencyId).toBeUndefined();
        expect(request.agencyIdAllocationMode).toBeUndefined();
        expect(request.templateId).toBeUndefined();
    });

    it('founds a new Träger with AUTO or a pinned number on the Träger tab', () => {
        expect(
            toCreateInviteRequest(draft({ role: 'TENANT_ADMIN', tenant: { mode: 'auto' } }), tenantTab),
        ).toMatchObject({ tenantIdAllocationMode: 'AUTO', tenantId: undefined });
        expect(
            toCreateInviteRequest(draft({ role: 'TENANT_ADMIN', tenant: { mode: 'manual', id: 21 } }), tenantTab),
        ).toMatchObject({ tenantIdAllocationMode: 'MANUAL', tenantId: 21 });
    });

    it('sends no Träger mode when the Träger field is empty on the counsellor tab', () => {
        const request = toCreateInviteRequest(draft({ tenant: { mode: 'auto' } }), {
            ...counsellorTab,
            viewer: 'platform',
        });
        expect(request.tenantIdAllocationMode).toBeUndefined();
    });
});

describe('toCreateInviteRequest from a CSV row', () => {
    const row = {
        kind: 'csv' as const,
        recipientEmail: 'a@example.org',
        role: 'COUNSELLOR' as const,
        target: 'NEW' as const,
    };

    it.each([
        [
            { id: 42, target: 'EXISTING' },
            { agencyId: 42, agencyIdAllocationMode: 'EXISTING' },
        ],
        [{ id: 900 }, { agencyId: 900, agencyIdAllocationMode: 'MANUAL' }],
        [{}, { agencyId: undefined, agencyIdAllocationMode: 'AUTO' }],
    ] as const)('addresses the agency of %j as %j, inside the own Träger', (patch, expected) => {
        expect(toCreateInviteRequest({ ...row, ...patch }, counsellorTab)).toMatchObject({
            ...expected,
            tenantId: 79,
            tenantIdAllocationMode: 'EXISTING',
        });
    });

    it('invites a Träger admin row into the own Träger', () => {
        const request = toCreateInviteRequest({ ...row, role: 'TENANT_ADMIN', id: 5 }, counsellorTab);
        expect(request).toMatchObject({ tenantId: 79, tenantIdAllocationMode: 'EXISTING' });
        expect(request.agencyId).toBeUndefined();
    });

    it('reads the id column as the Träger on the Träger tab', () => {
        expect(
            toCreateInviteRequest({ ...row, role: 'TENANT_ADMIN', id: 9, target: 'EXISTING' }, tenantTab),
        ).toMatchObject({
            tenantId: 9,
            tenantIdAllocationMode: 'EXISTING',
        });
        const founding = toCreateInviteRequest({ ...row, role: 'TENANT_ADMIN', id: 21 }, tenantTab);
        expect(founding.tenantId).toBe(21);
        // A pinned number for a new Träger is MANUAL, as the bar sends it; an empty cell is AUTO.
        expect(founding.tenantIdAllocationMode).toBe('MANUAL');
        const auto = toCreateInviteRequest({ ...row, role: 'TENANT_ADMIN', id: undefined }, tenantTab);
        expect(auto).toMatchObject({ tenantIdAllocationMode: 'AUTO' });
        expect(auto.tenantId).toBeUndefined();
    });

    it('uses the row template, else the bar template, and none when only creating', () => {
        expect(
            toCreateInviteRequest({ ...row, templateId: 3 }, { ...counsellorTab, fallbackTemplateId: 7 }).templateId,
        ).toBe(3);
        expect(toCreateInviteRequest(row, { ...counsellorTab, fallbackTemplateId: 7 }).templateId).toBe(7);
        expect(
            toCreateInviteRequest({ ...row, templateId: 3 }, { ...counsellorTab, sendMode: 'createOnly' }).templateId,
        ).toBeUndefined();
    });

    // Same rule as the bar: "Berät auch" belongs to an agency admin, topics to a counsellor.
    it('sends "Berät auch" only for an agency-admin row and topics only for a counsellor row', () => {
        const counsellor = toCreateInviteRequest(
            { ...row, alsoCounsellor: false, topicPermission: 'CREATE' },
            counsellorTab,
        );
        expect(counsellor).toMatchObject({ topicPermission: 'CREATE' });
        expect(counsellor.alsoCounsellor).toBeUndefined();

        const agencyAdmin = toCreateInviteRequest(
            { ...row, role: 'AGENCY_ADMIN', alsoCounsellor: false, topicPermission: 'CREATE' },
            counsellorTab,
        );
        expect(agencyAdmin).toMatchObject({ alsoCounsellor: false });
        expect(agencyAdmin.topicPermission).toBeUndefined();
    });

    it('omits an empty topic cell so the server decides', () => {
        expect(toCreateInviteRequest(row, counsellorTab)).not.toHaveProperty('topicPermission', expect.anything());
    });
});

describe('CSV failed-operation recovery', () => {
    beforeEach(() => {
        listAccountInvites.mockReset();
    });
    const row = { recipientEmail: ' Hidden@Example.org ', role: 'TENANT_ADMIN' as const, target: 'NEW' as const };
    it('finds the exact open recipient beyond a page of historical or partial matches without table filters', async () => {
        listAccountInvites.mockResolvedValueOnce({
            content: [
                { recipientEmail: 'hidden@example.org', inviteStatus: 'EXPIRED' },
                { recipientEmail: 'extra-hidden@example.org', inviteStatus: 'DRAFT' },
            ],
            totalPages: 2,
        });
        const stored = { id: 81, recipientEmail: 'HIDDEN@example.org', inviteStatus: 'DRAFT', tenantId: 8 };
        listAccountInvites.mockResolvedValueOnce({ content: [stored], totalPages: 2 });
        expect(await findStoredCsvInvite(row)).toEqual(stored);
        expect(listAccountInvites.mock.calls.map(([params]) => params)).toEqual([
            { query: 'hidden@example.org', tab: 'TENANT', targetRole: 'TENANT_ADMIN', page: 0, size: 100 },
            { query: 'hidden@example.org', tab: 'TENANT', targetRole: 'TENANT_ADMIN', page: 1, size: 100 },
        ]);
    });
    it.each(['TENANT_ADMIN', 'AGENCY_ADMIN', 'COUNSELLOR'] as const)(
        'routes recovery by imported role %s',
        async (role) => {
            listAccountInvites.mockResolvedValue({ content: [], totalPages: 1 });
            await findStoredCsvInvite({ ...row, role });
            expect(listAccountInvites).toHaveBeenCalledWith(
                expect.objectContaining({ targetRole: role, tab: role === 'TENANT_ADMIN' ? 'TENANT' : 'UNIT' }),
            );
        },
    );
    it('proves absence only after reading all matching pages', async () => {
        listAccountInvites.mockResolvedValue({ content: [], totalPages: 1 });
        expect(await findStoredCsvInvite(row)).toBeUndefined();
    });
    it('propagates an unavailable owner instead of returning an unsafe absence', async () => {
        listAccountInvites.mockRejectedValue(new Error('owner offline'));
        await expect(findStoredCsvInvite(row)).rejects.toThrow('owner offline');
    });
});
