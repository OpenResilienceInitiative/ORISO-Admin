import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { AUTH_BFF_REQUEST_TIMEOUT_MS } from '../../api/auth/authBffClient';
import { getSessionAccessToken, clearSessionTokens, setSessionTokens } from '../../api/auth/tokenSessionStore';
import { UserRole } from '../../enums/UserRole';
import type { LoginData } from '../../types/loginData';
import { AccessDenied } from './AccessDenied';

const mocks = vi.hoisted(() => ({ logout: vi.fn(), bootstrap: vi.fn() }));
vi.mock('../../api/auth/authBffClient', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/auth/authBffClient')>()),
    bootstrapAuthSessionViaBff: mocks.bootstrap,
}));
vi.mock('../../api/auth/logout', () => ({ default: mocks.logout }));
vi.mock('../../components/Layout/PublicPageLayoutWrapper', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const tokenFor = (role: UserRole) => {
    const payload = btoa(JSON.stringify({ realm_access: { roles: [role] }, exp: Math.floor(Date.now() / 1_000) + 60 }));
    return `header.${payload}.signature`;
};

const sessionFor = (role: UserRole): LoginData => ({
    data: {},
    access_token: tokenFor(role),
    refresh_token: tokenFor(role),
    expires_in: 60,
    refresh_expires_in: 120,
});

const holdBootstrap = () => {
    let finish!: (value: LoginData | null) => void;
    mocks.bootstrap.mockReturnValue(
        new Promise<LoginData | null>((resolve) => {
            finish = resolve;
        }),
    );
    return finish;
};

const bootSignal = (): AbortSignal => {
    expect(mocks.bootstrap).toHaveBeenCalledTimes(1);
    return mocks.bootstrap.mock.calls[0][0];
};

const homeLink = () => screen.getByRole('link', { name: 'toHomePage' });
const pendingHome = () => screen.getByRole('button', { name: 'toHomePage' });

beforeEach(() => {
    mocks.logout.mockReset();
    mocks.bootstrap.mockReset().mockResolvedValue(null);
});

afterEach(() => {
    clearSessionTokens();
    vi.useRealTimers();
});

describe('AccessDenied return navigation', () => {
    it.each([
        UserRole.AgencyAdmin,
        UserRole.RestrictedAgencyAdmin,
        UserRole.UserAdmin,
        UserRole.TopicAdmin,
        UserRole.SingleTenantAdmin,
        UserRole.TenantAdmin,
        UserRole.StatisticsReader,
    ])('returns a signed-in %s to the Admin entry without a BFF request', (role) => {
        const token = tokenFor(role);
        setSessionTokens(token, token);

        render(<AccessDenied />);

        expect(homeLink()).toHaveAttribute('href', '/admin');
        expect(mocks.bootstrap).not.toHaveBeenCalled();
    });

    it('keeps the app fallback for a non-Admin session in memory', () => {
        const token = tokenFor(UserRole.Consultant);
        setSessionTokens(token, token);

        render(<AccessDenied />);

        expect(homeLink()).toHaveAttribute('href', '/app');
        expect(mocks.bootstrap).not.toHaveBeenCalled();
    });

    it('restores a restricted Admin on a direct load before offering Home', async () => {
        const finish = holdBootstrap();
        render(<AccessDenied />);

        expect(pendingHome()).toBeDisabled();
        expect(bootSignal().aborted).toBe(false);
        const session = sessionFor(UserRole.RestrictedAgencyAdmin);
        await act(async () => finish(session));

        expect(homeLink()).toHaveAttribute('href', '/admin');
        expect(getSessionAccessToken()).toBe(session.access_token);
    });

    it('keeps the app fallback when a restored account does not have an Admin role', async () => {
        mocks.bootstrap.mockResolvedValue(sessionFor(UserRole.Consultant));
        render(<AccessDenied />);

        expect(await screen.findByRole('link', { name: 'toHomePage' })).toHaveAttribute('href', '/app');
        expect(mocks.bootstrap).toHaveBeenCalledTimes(1);
    });

    it('offers a usable fallback if no session was found', async () => {
        render(<AccessDenied />);

        expect(await screen.findByRole('link', { name: 'toHomePage' })).toHaveAttribute('href', '/app');
    });

    it('keeps the app fallback when a partial Admin token cannot be restored to a session', async () => {
        setSessionTokens(tokenFor(UserRole.TenantAdmin), null);
        render(<AccessDenied />);

        expect(await screen.findByRole('link', { name: 'toHomePage' })).toHaveAttribute('href', '/app');
        expect(mocks.bootstrap).toHaveBeenCalledTimes(1);
    });

    it('offers a usable fallback if the BFF rejects the restore', async () => {
        mocks.bootstrap.mockRejectedValue(new Error('synthetic BFF failure'));
        render(<AccessDenied />);

        expect(await screen.findByRole('link', { name: 'toHomePage' })).toHaveAttribute('href', '/app');
    });

    it('aborts a stalled restore, then offers the app fallback and keeps Logout available', async () => {
        vi.useFakeTimers();
        const finish = holdBootstrap();
        render(<AccessDenied />);
        const signal = bootSignal();

        await act(async () => vi.advanceTimersByTimeAsync(AUTH_BFF_REQUEST_TIMEOUT_MS - 1));
        expect(pendingHome()).toBeDisabled();
        expect(signal.aborted).toBe(false);
        await act(async () => vi.advanceTimersByTimeAsync(1));

        expect(homeLink()).toHaveAttribute('href', '/app');
        expect(screen.getByRole('button', { name: 'logout' })).toBeEnabled();
        expect(signal.aborted).toBe(true);
        await act(async () => finish(sessionFor(UserRole.TenantAdmin)));
        expect(getSessionAccessToken()).toBe('');
        expect(homeLink()).toHaveAttribute('href', '/app');
    });

    it('aborts a cold restore before explicit logout and rejects its late token write', async () => {
        vi.useFakeTimers();
        const finish = holdBootstrap();
        render(<AccessDenied />);
        const signal = bootSignal();
        mocks.logout.mockImplementation(() => {
            expect(signal.aborted).toBe(true);
            // Let a due deadline fire before React commits the sign-out state and cleans up the effect.
            vi.advanceTimersByTime(AUTH_BFF_REQUEST_TIMEOUT_MS);
        });

        fireEvent.click(screen.getByRole('button', { name: 'logout' }));

        expect(mocks.logout).toHaveBeenCalledExactlyOnceWith(true, undefined, 'explicit');
        await act(async () => finish(sessionFor(UserRole.AgencyAdmin)));
        expect(getSessionAccessToken()).toBe('');
        expect(pendingHome()).toBeDisabled();
    });

    it('aborts a cold restore on unmount and rejects its late token write', async () => {
        const finish = holdBootstrap();
        const { unmount } = render(<AccessDenied />);
        const signal = bootSignal();

        unmount();
        expect(signal.aborted).toBe(true);
        await act(async () => finish(sessionFor(UserRole.AgencyAdmin)));
        expect(getSessionAccessToken()).toBe('');
    });

    it('still explicitly logs out a warm Admin session', () => {
        const token = tokenFor(UserRole.TenantAdmin);
        setSessionTokens(token, token);
        render(<AccessDenied />);

        fireEvent.click(screen.getByRole('button', { name: 'logout' }));

        expect(mocks.logout).toHaveBeenCalledExactlyOnceWith(true, undefined, 'explicit');
        expect(pendingHome()).toBeDisabled();
    });
});
