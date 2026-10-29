import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AccountInviteDTO } from '../../api/accountInvites/accountInvites';
import { useInviteBulk } from './useInviteBulk';

const t = (_key: string, fallback: string) => fallback;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));
const invite = (id: number): AccountInviteDTO => ({
    id,
    targetRole: 'TENANT_ADMIN',
    tenantId: 2,
    recipientEmail: `mona.simpson+${id}@trail.ist`,
    firstName: 'Mona',
    lastName: 'Simpson',
    agencyId: null,
    departmentId: null,
    provisioningStatus: null,
    inviteStatus: 'EMAIL_SENT',
    emailVerificationStatus: 'PENDING',
    emailDeliveryStatus: 'SENT',
    twoFactorStatus: 'NOT_REQUIRED',
    accessGateStatus: 'BLOCKED_INVITE',
    expiresAt: null,
    acceptedAt: null,
    revokedAt: null,
    supersededAt: null,
    twoFactorWaivedBy: null,
    twoFactorWaivedAt: null,
    twoFactorWaiverReason: null,
    createDate: '2026-10-29T10:00:00Z',
});
const options = { reload: vi.fn(), explain: vi.fn(), rememberGeneratedLink: vi.fn() };

describe('invitation selection across server pages', () => {
    it('retains selected records from earlier pages for the bulk action', async () => {
        const first = invite(1);
        const second = invite(21);
        const { result, rerender } = renderHook(
            ({ rows }) => useInviteBulk({ ...options, invites: rows, selectionScope: 'tenant||all' }),
            {
                initialProps: { rows: [first] },
            },
        );
        act(() => result.current.setSelectedIds([1]));
        rerender({ rows: [second] });
        await waitFor(() => expect(result.current.selectedIds).toEqual([1]));
        act(() => result.current.setSelectedIds([1, 21]));
        expect(result.current.selectedInvites).toEqual([first, second]);
    });

    it('clears prior-page targets when query or lifecycle scope changes', async () => {
        const rows = [invite(1)];
        const { result, rerender } = renderHook(
            ({ scope }) => useInviteBulk({ ...options, invites: rows, selectionScope: scope }),
            {
                initialProps: { scope: 'tenant||all' },
            },
        );
        act(() => result.current.setSelectedIds([1]));
        expect(result.current.selectedInvites).toHaveLength(1);
        rerender({ scope: 'tenant|other query|all' });
        await waitFor(() => expect(result.current.selectedIds).toEqual([]));
        expect(result.current.selectedInvites).toEqual([]);
    });
});
