import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordResetPageLayout } from './PasswordResetPageLayout';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de', on: vi.fn(), off: vi.fn(), changeLanguage: vi.fn() },
    }),
}));

vi.mock('../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ data: undefined }),
}));

vi.mock('../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: {} }),
}));

vi.mock('../../api/tenant/getPublicTenantData', () => ({
    default: vi.fn(),
}));

const stage = () => document.getElementById('loginLogoWrapper');

/**
 * #569 chain fix: the tenant-admin onboarding page reuses this layout for a
 * ~1270px tall multi-step form. The app shell locks document scrolling
 * (html/body overflow hidden), so a public page that does not own a scroll
 * container simply truncates — on 390x844 the invitee could reach neither the
 * organisation fields nor the "Continue" button, and the full-viewport branding
 * stage painted over what was left.
 */
describe('PasswordResetPageLayout', () => {
    it('gives every public page its own scroll container instead of relying on the locked document', () => {
        render(
            <PasswordResetPageLayout>
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(screen.getByTestId('content').closest('.publicLayout')).not.toBeNull();
    });

    it('keeps the animated full-viewport branding intro for the short login-style default', () => {
        render(
            <PasswordResetPageLayout>
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(stage()).toHaveClass('stage--animated');
        expect(stage()).not.toHaveClass('stage--panel');
    });

    /**
     * #594.3: the reviewer wants the Admin fade to play on the onboarding page
     * too. It is fixed-position and its keyframes settle it off-canvas below
     * xl (stage.less), so it plays once and then never covers the form.
     */
    it('plays the branding fade on the long-form variant as well', () => {
        render(
            <PasswordResetPageLayout variant="longForm">
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(stage()).toHaveClass('stage--animated');
        expect(stage()).toHaveClass('stage--ready');
    });

    it('aligns a long form to the top of the column so its first field is the first thing in view', () => {
        render(
            <PasswordResetPageLayout variant="longForm">
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(document.querySelector('.ant-row')).toHaveClass('ant-row-top');
    });

    /**
     * Desktop centring (#594.3) is done with auto block margins on the column,
     * NOT with a centred row: a form taller than the viewport would otherwise
     * lose its first line above the top of the scroll container (#569).
     */
    it('centres the long form via the column, not by centring the row', () => {
        render(
            <PasswordResetPageLayout variant="longForm">
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(screen.getByTestId('content').closest('.ant-col')?.className).toMatch(/longFormColumn/);
        expect(document.querySelector('.ant-row')).not.toHaveClass('ant-row-middle');
    });

    /**
     * loginForm.less caps EVERY public column at the 320px sign-in width from
     * md up. That is right for a login form and unreadable for a 60-page
     * agreement, so the long-form variant opts out by class (#594.3).
     */
    it('opts a long form out of the 320px sign-in column cap', () => {
        render(
            <PasswordResetPageLayout variant="longForm">
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(screen.getByTestId('content').closest('.publicContent')).toHaveClass('publicLongForm');
    });

    it('keeps the sign-in column for the default login variant', () => {
        render(
            <PasswordResetPageLayout>
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(screen.getByTestId('content').closest('.publicContent')).not.toHaveClass('publicLongForm');
    });

    /**
     * #594.15b / #594.16a: the language switcher used to be a fixed control in
     * the top-right corner of the LIGHT column. It reserved horizontal space
     * there, which is why every attempt to centre the form column produced
     * "centred, but only on the short steps". It is an entry of the stage
     * footer menu now, so nothing occupies the light column any more.
     */
    it('no longer floats a language selector over the form column', () => {
        render(
            <PasswordResetPageLayout variant="longForm">
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(document.querySelector('.loginLanguageSelector')).toBeNull();
    });

    it('renders the footer menu in its stage variant on every public page', () => {
        render(
            <PasswordResetPageLayout variant="longForm">
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(document.querySelector('.layoutFooter')).toHaveClass('stageFooter');
    });
});
