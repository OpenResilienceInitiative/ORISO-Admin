import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountOperationIntent } from '../../utils/accountOperationIntent';
import { grantConsultantIdentityData } from '../admins/grantConsultantIdentityData';
import { addConsultantRole } from './inviteRoles';
import { createSelfAssignment } from './selfAssignments';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: mocks.fetchData };
});

interface RoleOperationCase {
    name: string;
    send: (intent: AccountOperationIntent) => Promise<unknown>;
}

const cases: RoleOperationCase[] = [
    {
        name: 'granting a consultant identity to an admin',
        send: (intent) => grantConsultantIdentityData('admin-1', { agencyIds: ['12'], topicIds: ['3'] }, intent),
    },
    {
        name: 'adding agency administration to a consultant',
        send: (intent) => addConsultantRole('consultant-1', { role: 'AGENCY_ADMIN', agencyId: 12 }, intent),
    },
    {
        name: 'granting a consultant identity through self-assignment',
        send: (intent) => createSelfAssignment({ role: 'COUNSELLOR', agencyId: 12, topicIds: [3] }, intent),
    },
];

describe('existing role operation request intents', () => {
    beforeEach(() => mocks.fetchData.mockReset());

    it.each(cases)('keeps the exact operation and body after a lost reply when $name', async ({ send }) => {
        const intent = new AccountOperationIntent('81000000-0000-4000-8000-000000000001');
        const timeout = new Error('TIMEOUT');
        mocks.fetchData.mockRejectedValueOnce(timeout).mockResolvedValueOnce({
            status: 200,
            json: () => Promise.resolve({ userId: 'same-account' }),
        });

        await expect(send(intent)).rejects.toBe(timeout);
        await expect(send(intent)).resolves.toBeDefined();

        expect(mocks.fetchData).toHaveBeenCalledTimes(2);
        const [first, retry] = mocks.fetchData.mock.calls.map(([request]) => request);
        expect(first.headersData).toEqual({ 'Idempotency-Key': intent.id });
        expect(retry.headersData).toEqual(first.headersData);
        expect(retry.bodyData).toBe(first.bodyData);
        expect(retry.url).toBe(first.url);
        expect(retry.method).toBe(first.method);
    });
});
