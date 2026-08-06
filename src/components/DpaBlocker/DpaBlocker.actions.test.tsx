import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DpaBlocker } from './DpaBlocker';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

/**
 * #594.10 — every button on the blocker must have a purpose the person looking
 * at it can understand, or it goes.
 *
 * Two survive, and only two:
 *   • "Already signed? Check again" — the authorised signatory may sign through
 *     the DPA forwarding link, and the blocked admin must be able to pick that
 *     up WITHOUT logging out and back in. The label now says so.
 *   • "Log out" — the way off a screen that otherwise has no exit.
 * A visible sentence explains both, so the justification lives on the screen
 * and not only in a code comment.
 */
describe('DpaBlocker — secondary actions', () => {
    const props = {
        reason: 'STATUS_UNAVAILABLE' as const,
        signable: false,
        onRetry: vi.fn(),
        onLogout: vi.fn(),
    };

    it('offers exactly the two justified exits', () => {
        render(<DpaBlocker {...props} />);

        const buttons = screen.getAllByRole('button').map((b) => b.textContent);
        expect(buttons).toEqual(['dpaBlocker.retry', 'dpaBlocker.logout']);
    });

    it('states on screen what each exit is for', () => {
        render(<DpaBlocker {...props} />);

        expect(screen.getByTestId('dpa-blocker-actions-hint')).toHaveTextContent('dpaBlocker.actionsHint');
    });

    it('re-checks the status without ending the session', async () => {
        const onRetry = vi.fn();
        const onLogout = vi.fn();
        const user = userEvent.setup();
        render(<DpaBlocker {...props} onRetry={onRetry} onLogout={onLogout} />);

        await user.click(screen.getByRole('button', { name: 'dpaBlocker.retry' }));

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onLogout).not.toHaveBeenCalled();
    });

    it('keeps the exits reachable while the sign form is shown', () => {
        render(<DpaBlocker {...props} reason="UNSIGNED" signable dpaContent={JSON.stringify({ de: '<p>AVV</p>' })} />);

        expect(screen.getByRole('button', { name: 'dpaBlocker.sign.submit' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'dpaBlocker.retry' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'dpaBlocker.logout' })).toBeInTheDocument();
    });
});
