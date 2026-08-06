import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TenantAdminOnboardingPage } from './TenantAdminOnboardingPage';

const mocks = vi.hoisted(() => ({
    layoutProps: [] as { variant?: string }[],
    onboardingProps: [] as { inviteToken: string }[],
}));

vi.mock('../PasswordReset/PasswordResetPageLayout', () => ({
    PasswordResetPageLayout: ({ children, variant }: React.PropsWithChildren<{ variant?: string }>) => {
        mocks.layoutProps.push({ variant });

        return <div data-testid="public-layout">{children}</div>;
    },
}));

vi.mock('./TenantAdminOnboarding', () => ({
    TenantAdminOnboarding: ({ inviteToken }: { inviteToken: string }) => {
        mocks.onboardingProps.push({ inviteToken });

        return <div data-testid="onboarding" />;
    },
}));

const renderPage = (token: string) =>
    render(
        <MemoryRouter initialEntries={[`/admin/tenant-onboarding/${token}`]}>
            <Routes>
                <Route path="/admin/tenant-onboarding/:token" element={<TenantAdminOnboardingPage />} />
            </Routes>
        </MemoryRouter>,
    );

describe('TenantAdminOnboardingPage', () => {
    it('hosts the tall onboarding flow in the scrollable long-form layout (#569)', () => {
        renderPage('raw-token');

        expect(screen.getByTestId('onboarding')).toBeInTheDocument();
        expect(mocks.layoutProps.at(-1)?.variant).toBe('longForm');
    });

    it('passes the trimmed invite token through', () => {
        renderPage('raw-token');

        expect(mocks.onboardingProps.at(-1)?.inviteToken).toBe('raw-token');
    });
});
