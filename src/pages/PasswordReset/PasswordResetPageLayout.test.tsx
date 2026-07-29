import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordResetPageLayout } from './PasswordResetPageLayout';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));

vi.mock('../../components/LanguageSelector', () => ({
    LanguageSelector: () => <div data-testid="language-selector" />,
}));

vi.mock('../../components/LottieAnimation', () => ({
    LottieAnimation: () => <div data-testid="stage-animation" />,
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

    it('renders the stage as a side panel for long forms so it can never cover them on mobile', () => {
        render(
            <PasswordResetPageLayout variant="longForm">
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(stage()).toHaveClass('stage--panel');
        expect(stage()).not.toHaveClass('stage--animated');
    });

    it('aligns a long form to the top of the column so its first field is the first thing in view', () => {
        render(
            <PasswordResetPageLayout variant="longForm">
                <div data-testid="content" />
            </PasswordResetPageLayout>,
        );

        expect(document.querySelector('.ant-row')).toHaveClass('ant-row-top');
    });
});
