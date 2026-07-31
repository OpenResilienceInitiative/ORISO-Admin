import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalNoticeDialog } from './LegalNoticeDialog';

/**
 * `t` echoes the key, so a MISSING key is visible as a raw key in the output —
 * which is exactly the defect this suite pins down.
 */
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de', on: vi.fn(), off: vi.fn(), changeLanguage: vi.fn() },
    }),
}));

describe('LegalNoticeDialog', () => {
    /**
     * The action was wired to `btn.close`, a key that exists in no locale, so
     * the button rendered the literal string "btn.close" to every visitor of
     * the sign-in page. `footer.legal.close` ("Schließen" / "Close") is the key
     * that was actually translated for this dialog.
     */
    it('labels the close action with a key that exists', () => {
        render(<LegalNoticeDialog kind="privacy" onClose={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'footer.legal.close' })).toBeInTheDocument();
        expect(screen.queryByText('btn.close')).toBeNull();
    });

    it('closes through that action', async () => {
        const onClose = vi.fn();
        render(<LegalNoticeDialog kind="imprint" onClose={onClose} />);

        screen.getByRole('button', { name: 'footer.legal.close' }).click();

        expect(onClose).toHaveBeenCalled();
    });

    /**
     * The published legal texts are pages long. The text — not the dialog — is
     * what scrolls, so the title and the close action stay reachable.
     */
    it('scrolls the text instead of the sheet, and exposes it as a landmark', () => {
        render(<LegalNoticeDialog kind="privacy" onClose={vi.fn()} />);

        const body = screen.getByTestId('legal-notice-privacy');

        expect(body).toHaveAttribute('role', 'region');
        expect(body).toHaveAttribute('tabindex', '0');
    });

    /**
     * Both notices used one generic MUI gavel — a courtroom symbol, and the only
     * icon on the public surface sourced from outside the ORISO set. Each notice
     * now shows the product's own icon for that document, the same one the legal
     * editor card uses.
     */
    it('uses the product legal icon of the notice it shows', () => {
        const iconMarkup = (kind: 'imprint' | 'privacy') => {
            const { unmount } = render(<LegalNoticeDialog kind={kind} onClose={vi.fn()} />);
            const icon = document.querySelector('.ant-modal-header .anticon svg');
            const markup = icon?.innerHTML ?? '';
            unmount();
            return markup;
        };

        const imprint = iconMarkup('imprint');
        const privacy = iconMarkup('privacy');

        expect(imprint).not.toBe('');
        expect(privacy).not.toBe('');
        expect(imprint).not.toBe(privacy);
    });
});
