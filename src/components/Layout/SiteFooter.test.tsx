import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SiteFooter from './SiteFooter';
import { runtimeConfig } from '../../config/runtimeConfig';

const changeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de', on: vi.fn(), off: vi.fn(), changeLanguage: vi.fn() },
    }),
}));

vi.mock('../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        language: 'de',
        options: [
            { value: 'de', label: '(DE) Deutsch', title: '' },
            { value: 'en', label: '(EN) English', title: '' },
        ],
        changeLanguage,
    }),
}));

const menuItems = () => screen.getAllByRole('menuitem').map((item) => item.textContent);

/**
 * #594.15b — the footer menu was DEAD.
 *
 * Its antd items carried a label and a placeholder key (`item-1`, `split`,
 * `submenu`) and no `onClick`, no route and no handler anywhere, so clicking
 * Imprint or Privacy did nothing at all; the red underline in the screenshot
 * was antd's default selection state, not a working link. On the public
 * sign-in/sign-up surface the same menu also has to carry the language
 * selector, because moving that control out of the light column is what frees
 * the space the form column needs to centre (#594.16a).
 */
describe('SiteFooter', () => {
    it.each(['default', 'stage'] as const)('shows the full identity in the %s footer', (variant) => {
        vi.stubEnv('VITE_BUILD_COMMIT', 'a6b74669b6fe20a515c277228bdb42d67eb5a9a9');
        const previousRelease = runtimeConfig.platformVersion;
        runtimeConfig.platformVersion = 'v2.0.6';
        try {
            render(<SiteFooter variant={variant} />);
            const identity = screen.getByText('v2.0.6 - a6b7466');
            expect(identity).toHaveAttribute('data-build-commit', 'a6b74669b6fe20a515c277228bdb42d67eb5a9a9');
            expect(identity).toHaveAttribute('data-platform-version', 'v2.0.6');
        } finally {
            runtimeConfig.platformVersion = previousRelease;
            vi.unstubAllEnvs();
        }
    });

    it('changes the displayed identity between builds with the same release', () => {
        const previousRelease = runtimeConfig.platformVersion;
        runtimeConfig.platformVersion = 'v2.0.6';
        vi.stubEnv('VITE_BUILD_COMMIT', 'a'.repeat(40));
        try {
            const { rerender } = render(<SiteFooter />);
            expect(screen.getByTestId('build-identity')).toHaveTextContent('v2.0.6 - aaaaaaa');
            vi.stubEnv('VITE_BUILD_COMMIT', 'b'.repeat(40));
            rerender(<SiteFooter />);
            expect(screen.getByTestId('build-identity')).toHaveTextContent('v2.0.6 - bbbbbbb');
            vi.stubEnv('VITE_BUILD_COMMIT', 'invalid');
            rerender(<SiteFooter />);
            expect(screen.getByTestId('build-identity')).toHaveTextContent('v2.0.6 - unknown');
            expect(screen.getByTestId('build-identity')).toHaveAttribute('data-build-commit', '');
        } finally {
            runtimeConfig.platformVersion = previousRelease;
            vi.unstubAllEnvs();
        }
    });

    it('opens the imprint in its own dialog instead of doing nothing', async () => {
        render(<SiteFooter />);

        await userEvent.click(screen.getByText('footer.label.imprint'));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByTestId('legal-notice-imprint')).toBeInTheDocument();
    });

    it('opens the privacy text in its own dialog', async () => {
        render(<SiteFooter />);

        await userEvent.click(screen.getByText('footer.label.privacy'));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByTestId('legal-notice-privacy')).toBeInTheDocument();
    });

    /**
     * The `' | '` item was focusable and announced to screen readers as a menu
     * entry. A separator is styling, not an entry.
     */
    it('exposes only real entries — no separator pseudo-item', () => {
        render(<SiteFooter />);

        expect(menuItems()).toEqual(['footer.label.imprint', 'footer.label.privacy']);
    });

    it('gives every entry a meaningful key', () => {
        const { container } = render(<SiteFooter />);

        const keys = [...container.querySelectorAll('[data-menu-id]')].map((node) =>
            (node.getAttribute('data-menu-id') ?? '').split('-').pop(),
        );

        expect(keys).toEqual(['imprint', 'privacy']);
        expect(keys).not.toContain('item');
        expect(keys).not.toContain('split');
        expect(keys).not.toContain('submenu');
    });

    describe('stage variant (public sign-in/sign-up surface)', () => {
        it('marks itself so it can be placed in the dark panel', () => {
            const { container } = render(<SiteFooter variant="stage" />);

            expect(container.querySelector('.layoutFooter')).toHaveClass('stageFooter');
        });

        /**
         * The language selector used to be a submenu ENTRY of this menu. That
         * is what made the row wrap at 100% zoom, painted antd's red active bar
         * under it and anchored its popup beside the trigger. It is now its own
         * control next to the menu — the menu itself is legal texts only.
         */
        it('keeps the legal menu to legal texts and puts the language beside it', () => {
            render(<SiteFooter variant="stage" />);

            expect(menuItems()).toEqual(['footer.label.imprint', 'footer.label.privacy']);
            expect(screen.getByRole('button', { name: /language\.selectAriaLabel/ })).toBeInTheDocument();
        });

        it('shows the language code on the trigger and the full name in its options', async () => {
            render(<SiteFooter variant="stage" />);

            const trigger = screen.getByRole('button', { name: /language\.selectAriaLabel/ });
            expect(trigger).toHaveTextContent('DE');
            expect(trigger).not.toHaveTextContent('Deutsch');

            await userEvent.click(trigger);

            expect(await screen.findByText('(DE) Deutsch')).toBeInTheDocument();
            expect(await screen.findByText('(EN) English')).toBeInTheDocument();
        });

        it('switches the language from that control', async () => {
            render(<SiteFooter variant="stage" />);

            await userEvent.click(screen.getByRole('button', { name: /language\.selectAriaLabel/ }));
            await userEvent.click(await screen.findByText('(EN) English'));

            expect(changeLanguage).toHaveBeenCalledWith('en');
        });

        it('keeps the language out of the in-flow footer, which has its own selector elsewhere', () => {
            render(<SiteFooter />);

            expect(screen.queryByRole('button', { name: /language\.selectAriaLabel/ })).toBeNull();
        });
    });
});
