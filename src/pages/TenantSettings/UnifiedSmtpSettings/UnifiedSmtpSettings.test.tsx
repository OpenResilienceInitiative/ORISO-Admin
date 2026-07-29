import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    useUserRoles: vi.fn(),
    useTenantData: vi.fn(),
    previewProps: vi.fn(),
}));

vi.mock('../../GlobalSettings', () => ({
    GlobalSmtpSettingsPage: () => <div data-testid="global-smtp-settings" />,
}));
vi.mock('../SmtpSettings', () => ({
    SmtpSettingsPage: () => <div data-testid="tenant-smtp-settings" />,
}));
vi.mock('../../../components/EmailPreview/BrandedEmailPreview', () => ({
    BrandedEmailPreview: (props: { tenantId?: number }) => {
        mocks.previewProps(props);
        return <div data-testid="branded-email-preview" />;
    },
}));
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: mocks.useUserRoles }));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: mocks.useTenantData }));

// eslint-disable-next-line import/first
import { UnifiedSmtpSettingsPage } from './index';

describe('UnifiedSmtpSettingsPage', () => {
    beforeEach(() => {
        mocks.previewProps.mockReset();
        mocks.useTenantData.mockReturnValue({ data: undefined });
    });

    it('previews platform branding for a super admin — they configure the platform SMTP', () => {
        mocks.useUserRoles.mockReturnValue({ isSuperAdmin: true, tenantId: 0 });

        render(<UnifiedSmtpSettingsPage />);

        expect(screen.getByTestId('global-smtp-settings')).toBeInTheDocument();
        expect(screen.getByTestId('branded-email-preview')).toBeInTheDocument();
        expect(mocks.previewProps).toHaveBeenCalledWith({ tenantId: undefined });
    });

    it("previews the tenant admin's own tenant branding", () => {
        mocks.useUserRoles.mockReturnValue({ isSuperAdmin: false, tenantId: 7 });

        render(<UnifiedSmtpSettingsPage />);

        expect(screen.getByTestId('tenant-smtp-settings')).toBeInTheDocument();
        expect(mocks.previewProps).toHaveBeenCalledWith({ tenantId: 7 });
    });

    it('falls back to the resolved tenant when the token carries no usable tenant id', () => {
        mocks.useUserRoles.mockReturnValue({ isSuperAdmin: false, tenantId: null });
        mocks.useTenantData.mockReturnValue({ data: { id: 3 } });

        render(<UnifiedSmtpSettingsPage />);

        expect(mocks.previewProps).toHaveBeenCalledWith({ tenantId: 3 });
    });

    it('waits for the tenant instead of previewing platform branding to a tenant admin', () => {
        mocks.useUserRoles.mockReturnValue({ isSuperAdmin: false, tenantId: null });
        mocks.useTenantData.mockReturnValue({ data: undefined, isPending: true });

        render(<UnifiedSmtpSettingsPage />);

        expect(screen.getByTestId('tenant-smtp-settings')).toBeInTheDocument();
        expect(screen.queryByTestId('branded-email-preview')).not.toBeInTheDocument();
        expect(mocks.previewProps).not.toHaveBeenCalled();
    });

    it('never falls back to the platform preview when tenant resolution failed', () => {
        mocks.useUserRoles.mockReturnValue({ isSuperAdmin: false, tenantId: null });
        // `useTenantData` swallows its own errors and settles on a body without an id.
        mocks.useTenantData.mockReturnValue({ data: { settings: {} }, isPending: false });

        render(<UnifiedSmtpSettingsPage />);

        expect(screen.queryByTestId('branded-email-preview')).not.toBeInTheDocument();
        expect(mocks.previewProps).not.toHaveBeenCalled();
    });
});
