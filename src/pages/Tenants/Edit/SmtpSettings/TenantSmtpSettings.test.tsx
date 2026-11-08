import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({ previewProps: vi.fn() }));

vi.mock('../../../../components/Tenants/AppSettings/SmtpSettings', () => ({
    SmtpSettings: ({ tenantId }: { tenantId: string }) => <div data-testid="smtp">{tenantId}</div>,
}));
vi.mock('../../../../components/EmailPreview/BrandedEmailPreview', () => ({
    BrandedEmailPreview: (props: { tenantId?: number }) => {
        mocks.previewProps(props);
        return <div data-testid="branded-email-preview" />;
    },
}));

// eslint-disable-next-line import/first
import { TenantSmtpSettings } from './index';

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/admin/tenants/:id/smtp" element={<TenantSmtpSettings />} />
            </Routes>
        </MemoryRouter>,
    );

// Same wrapper as the Träger admin's own Email Server tab: SMTP tile plus the branded preview.
describe('platform admin editing a Träger: Email Server page', () => {
    it('shows the SMTP tile and previews the branding of the Träger in the route', () => {
        mocks.previewProps.mockReset();
        renderAt('/admin/tenants/7/smtp');

        expect(screen.getByTestId('smtp')).toHaveTextContent('7');
        expect(screen.getByTestId('branded-email-preview')).toBeInTheDocument();
        expect(mocks.previewProps).toHaveBeenCalledWith({ tenantId: 7 });
    });

    it('withholds the preview while the route id is not a Träger id, so it never shows platform branding', () => {
        mocks.previewProps.mockReset();
        renderAt('/admin/tenants/add/smtp');

        expect(screen.queryByTestId('branded-email-preview')).toBeNull();
    });
});
