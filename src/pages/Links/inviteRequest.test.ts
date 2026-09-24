import { describe, expect, it, vi } from 'vitest';
import { toCreateInviteRequest, type InviteDraft, type InviteRequestContext } from './inviteRequest';

vi.mock('../../api/accountInvites/accountInvites', () => ({
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
        expect(founding.tenantIdAllocationMode).toBeUndefined();
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

    it('omits an empty topic cell so the server decides', () => {
        expect(toCreateInviteRequest(row, counsellorTab)).not.toHaveProperty('topicPermission', expect.anything());
    });
});
