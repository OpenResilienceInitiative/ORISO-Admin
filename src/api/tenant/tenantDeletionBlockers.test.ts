import { describe, expect, it, vi } from 'vite-plus/test';
import {
    TenantDeletionError,
    readTenantDeletionBlockers,
    tenantDeletionBlockerLines,
    toTenantDeletionError,
} from './tenantDeletionBlockers';

const NONE = { agencies: 0, consultants: 0, adviceSeekers: 0, agencyAdmins: 0, tenantAdmins: 0, openInvites: 0 };

const t = (key: string, options?: { count?: number }) => `${key}:${options?.count}`;

describe('readTenantDeletionBlockers (UserService#1466)', () => {
    it('reads the counts TenantService sends with its 409', async () => {
        const response = new Response(JSON.stringify({ ...NONE, deletable: false, agencies: 1, openInvites: 2 }), {
            status: 409,
            headers: { 'X-Reason': 'TENANT_HAS_DEPENDENTS' },
        });

        await expect(readTenantDeletionBlockers(response)).resolves.toEqual({ ...NONE, agencies: 1, openInvites: 2 });
    });

    it('treats a missing or non-numeric count as zero', async () => {
        const response = new Response(JSON.stringify({ agencies: 3, consultants: 'x' }), { status: 409 });

        await expect(readTenantDeletionBlockers(response)).resolves.toEqual({ ...NONE, agencies: 3 });
    });

    it('gives null for a 409 without a readable body', async () => {
        await expect(readTenantDeletionBlockers(new Response('', { status: 409 }))).resolves.toBeNull();
        await expect(readTenantDeletionBlockers(new Response('not json', { status: 409 }))).resolves.toBeNull();
    });
});

describe('toTenantDeletionError', () => {
    it('turns a 409 response into an error carrying the counts', async () => {
        const response = new Response(JSON.stringify({ ...NONE, tenantAdmins: 1 }), { status: 409 });

        const error = await toTenantDeletionError(response);

        expect(error).toEqual(expect.objectContaining({ reason: 'blocked' }));
        expect((error as TenantDeletionError).blockers).toEqual({ ...NONE, tenantAdmins: 1 });
    });

    it('turns the 503 of an unreachable UserService into an "unavailable" error', async () => {
        expect(await toTenantDeletionError(new Error('SERVICE_UNAVAILABLE'))).toEqual(
            expect.objectContaining({ reason: 'unavailable' }),
        );
    });

    it('passes any other failure through unchanged', async () => {
        const other = new Error('API call error: 500');
        expect(await toTenantDeletionError(other)).toBe(other);
    });

    it('does not read the body of a non-409 response', async () => {
        const response = new Response('{}', { status: 500 });
        const json = vi.spyOn(response, 'json');

        const error = await toTenantDeletionError(response);

        expect(json).not.toHaveBeenCalled();
        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(TenantDeletionError);
    });
});

describe('tenantDeletionBlockerLines', () => {
    it('lists only what is left, in the order an admin removes it', () => {
        const lines = tenantDeletionBlockerLines(
            { ...NONE, openInvites: 1, agencies: 2, tenantAdmins: 1, adviceSeekers: 4 },
            t,
        );

        expect(lines).toEqual([
            'tenants.list.deleteMessage.blockers.agencies:2',
            'tenants.list.deleteMessage.blockers.adviceSeekers:4',
            'tenants.list.deleteMessage.blockers.tenantAdmins:1',
            'tenants.list.deleteMessage.blockers.openInvites:1',
        ]);
    });

    it('is empty when nothing is left', () => {
        expect(tenantDeletionBlockerLines(NONE, t)).toEqual([]);
    });
});
