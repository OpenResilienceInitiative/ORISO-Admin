import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { DpaPendingSignatureDialog } from './DpaPendingSignatureDialog';
import { DpaUnlockDialog } from './DpaUnlockDialog';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

/**
 * A blocking dialog is an accessibility hazard: it is the whole screen, so a
 * missing name or an unreachable control locks the tenant out for real. Same
 * rule sets the Storybook a11y addon runs with (`test: 'error'`).
 */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const violations = async () => {
    const results = await axe.run(document.body, { runOnly: WCAG });
    return results.violations.map((violation) => `${violation.id}: ${violation.nodes.length} node(s)`);
};

const LINK = { signUrl: 'https://app.example.org/dpa-sign/token', expiresAt: '2026-08-29T14:31:07' };

describe('DPA gate dialogs — accessibility', () => {
    it('the pending-signature gate has an accessible name and no axe violations', async () => {
        render(
            <DpaPendingSignatureDialog
                ensureSignLink={async () => LINK}
                forward={async () => ({ link: LINK, mailFailed: false })}
                onLogout={() => {}}
            />,
        );

        const dialog = await screen.findByRole('dialog');
        // The house Modal names the dialog by its whole title block, so the
        // one-line purpose is announced with the headline.
        expect(dialog).toHaveAccessibleName('dpaPending.title dpaPending.description');
        expect(await violations()).toEqual([]);
    });

    it('the unlock gate has an accessible name and no axe violations', async () => {
        render(<DpaUnlockDialog onUnlock={() => {}} onLogout={() => {}} />);

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveAccessibleName('dpaUnlock.title dpaUnlock.description');
        // Both exits are real, reachable buttons — not clickable divs.
        expect(screen.getByRole('button', { name: 'dpaUnlock.action' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'dpaBlocker.logout' })).toBeEnabled();
        expect(await violations()).toEqual([]);
    });
});
