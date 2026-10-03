import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import OtpResendLink, {
    RESEND_ERROR_ALREADY_SHOWN,
    RESEND_FALLBACK_COOLDOWN_SECONDS,
    RESEND_NOT_ATTEMPTED,
    ResendError,
} from './OtpResendLink';

const translations: Record<string, string> = {
    'login.otp.resend.action': 'Send a new code',
    'login.otp.resend.requested': 'Request sent. Please use the newest code from your inbox.',
    'login.otp.resend.onlyNewest': 'Only the most recently sent code is valid.',
    'login.otp.resend.failed': 'The code could not be requested. Please try again.',
};

const t = (key: string, options?: Record<string, unknown>) =>
    key === 'login.otp.resend.actionIn' ? `Send a new code (${options?.countdown})` : translations[key] || key;

vi.mock('react-i18next', () => ({
    useTranslation: () => Object.assign([t], { t, i18n: { language: 'en' } }),
}));

const link = () => screen.getByRole('button') as HTMLButtonElement;

/**
 * ORISO-UserService#1338. The admin login had no way to ask for a new code at all,
 * so an expired code meant reloading and retyping the password.
 */
describe('OtpResendLink', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('confirms only after the realm has answered, never on the click', async () => {
        let answer: () => void = () => undefined;
        const onResend = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    answer = resolve;
                }),
        );
        render(<OtpResendLink onResend={onResend} />);

        await act(async () => {
            link().click();
        });
        expect(onResend).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();

        await act(async () => {
            answer();
        });

        expect(await screen.findByRole('status')).toHaveTextContent(
            'Request sent. Please use the newest code from your inbox.',
        );
    });

    it('says the request failed instead of claiming a code is on its way', async () => {
        render(<OtpResendLink onResend={() => Promise.reject(new Error('offline'))} />);

        await act(async () => {
            link().click();
        });

        expect(await screen.findByRole('alert')).toHaveTextContent('The code could not be requested.');
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('stays quiet when the caller already named the reason itself, but still waits', async () => {
        // the form shows "too many attempts, wait 12 minutes" as a toast; a second
        // generic line under the link would only add noise. The wait itself has to
        // be served, or the link invites the next attempt the realm will refuse.
        render(<OtpResendLink onResend={() => Promise.reject(new ResendError(RESEND_ERROR_ALREADY_SHOWN, 720))} />);

        await act(async () => {
            link().click();
        });

        await waitFor(() => expect(link()).toBeDisabled());
        expect(link()).toHaveTextContent('Send a new code (12:00)');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('counts the realm cooldown down and refuses a click while it runs', async () => {
        const onResend = vi.fn(() => Promise.resolve());
        render(<OtpResendLink onResend={onResend} cooldownSeconds={3} />);

        // the realm already said "wait 3 s", so the link is dead before any click
        expect(link()).toBeDisabled();
        expect(link()).toHaveTextContent('Send a new code (0:03)');

        await act(async () => {
            link().click();
        });
        expect(onResend).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        await waitFor(() => expect(link()).toBeEnabled());
        expect(link()).toHaveTextContent('Send a new code');

        await act(async () => {
            link().click();
        });
        expect(onResend).toHaveBeenCalledTimes(1);
    });

    it('falls back to its own wait when the realm reports none', async () => {
        render(<OtpResendLink onResend={() => Promise.resolve()} />);

        await act(async () => {
            link().click();
        });

        await waitFor(() => expect(link()).toBeDisabled());
        expect(link()).toHaveTextContent(`Send a new code (0:${RESEND_FALLBACK_COOLDOWN_SECONDS})`);
    });

    it('lets the realm extend a running wait but never shorten it', async () => {
        const { rerender } = render(<OtpResendLink onResend={() => Promise.resolve()} cooldownSeconds={60} />);
        expect(link()).toHaveTextContent('Send a new code (1:00)');

        rerender(<OtpResendLink onResend={() => Promise.resolve()} cooldownSeconds={5} />);

        // a shorter figure would invite a click the realm then refuses
        expect(link()).toHaveTextContent('Send a new code (1:00)');
    });

    it('serves the wait the newest answer named, not one that already ran out', async () => {
        // The realm refused for ten minutes, that wait ran out, and the next answer
        // grants thirty seconds. Reading the wait off the prop re-armed the ten
        // minutes and cost the user the nine and a half the realm had given back.
        render(<OtpResendLink onResend={() => Promise.resolve(30)} cooldownSeconds={600} />);
        expect(link()).toHaveTextContent('Send a new code (10:00)');

        await act(async () => {
            vi.advanceTimersByTime(600_000);
        });
        await waitFor(() => expect(link()).toBeEnabled());

        await act(async () => {
            link().click();
        });

        await waitFor(() => expect(link()).toBeDisabled());
        expect(link()).toHaveTextContent('Send a new code (0:30)');
    });

    it('keeps the link alive when the request never left the browser', async () => {
        // No request, no code on its way, nothing to wait for — and a dead link
        // would hide the only control that can put it right.
        render(<OtpResendLink onResend={() => Promise.reject(new ResendError(RESEND_NOT_ATTEMPTED))} />);

        await act(async () => {
            link().click();
        });

        await waitFor(() => expect(link()).toBeEnabled());
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('always states that only the newest code works', () => {
        // starting a second login silently invalidates the first code, and nothing
        // on either login screen used to say so
        render(<OtpResendLink onResend={() => Promise.resolve()} />);

        expect(screen.getByText('Only the most recently sent code is valid.')).toBeInTheDocument();
    });
});
