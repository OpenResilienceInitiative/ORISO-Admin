import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelfAssignDialog } from './SelfAssignDialog';
import { getSessionAccessToken, setSessionTokens } from '../../api/auth/tokenSessionStore';
import { tryRefreshAccessToken } from '../../api/auth/auth';
import i18n from '../../i18n';

vi.mock('../../api/auth/auth', async () => {
    const store = await import('../../api/auth/tokenSessionStore');
    return { getAccessTokenForRequests: () => store.getSessionAccessToken(), tryRefreshAccessToken: vi.fn() };
});
vi.mock('../../api/auth/logout', () => ({ default: vi.fn() }));

const token = (sub: string, revision: number) =>
    `e30.${btoa(JSON.stringify({ sub, iss: 'https://auth.example.test', revision }))}.test`;
const fetchMock = vi.fn<typeof fetch>();
const assigned = { role: 'COUNSELLOR', agencyId: 12, userId: 'self-admin', consultantIdentityCreated: true };
const success = () => new Response(JSON.stringify(assigned), { headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.mocked(tryRefreshAccessToken).mockReset();
    setSessionTokens(token('self-admin', 1), 'test-refresh');
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    setSessionTokens(null, null);
});

const openDialog = async () => {
    const onAssigned = vi.fn(() => expect(getSessionAccessToken()).toBe(token('self-admin', 2)));
    const onClose = vi.fn();
    render(
        <SelfAssignDialog
            initialAgency={{ id: 12, name: 'Beratungsstelle Springfield Mitte' }}
            loadAgencyTopics={async () => [{ id: 3, name: 'Sucht' }]}
            loadAssignments={async () => ({ agencyAdminAgencyIds: [], counsellorAgencyIds: [] })}
            onAssigned={onAssigned}
            onClose={onClose}
        />,
    );
    const confirm = screen.getByRole('button', { name: String(i18n.t('links.selfAssign.confirm')) });
    await waitFor(() => expect(confirm).toBeEnabled());
    return { confirm, onAssigned, onClose };
};

describe('mounted self-assignment with the actual request path', () => {
    it('updates the same-human session before the completion callback reads the new identity', async () => {
        fetchMock.mockResolvedValueOnce(success());
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token('self-admin', 2), 'test-refresh');
            return true;
        });
        const { confirm, onAssigned, onClose } = await openDialog();

        await userEvent.click(confirm);

        await waitFor(() => expect(onAssigned).toHaveBeenCalledExactlyOnceWith(assigned));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('recovers an uncertain grant with the same key before closing the real dialog', async () => {
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(success());
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token('self-admin', 2), 'test-refresh');
            return true;
        });
        const { confirm, onAssigned, onClose } = await openDialog();

        await userEvent.click(confirm);

        await waitFor(() => expect(onAssigned).toHaveBeenCalledExactlyOnceWith(assigned));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const first = new Request(...fetchMock.mock.calls[0]);
        const retry = new Request(...fetchMock.mock.calls[1]);
        expect(first.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
        expect(retry.headers.get('Idempotency-Key')).toBe(first.headers.get('Idempotency-Key'));
        expect(await retry.text()).toBe(await first.text());
    });

    it('keeps the dialog open without assigning under a changed person', async () => {
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token('another-admin', 2), 'other-refresh');
            return true;
        });
        const { confirm, onAssigned, onClose } = await openDialog();

        await userEvent.click(confirm);

        expect(await screen.findByText(String(i18n.t('accountOperation.identityChanged')))).toBeInTheDocument();
        expect(onAssigned).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
