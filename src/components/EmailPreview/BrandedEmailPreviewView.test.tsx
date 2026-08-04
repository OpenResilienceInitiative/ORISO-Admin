import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { InviteEmailPreviewDTO } from '../../api/accountInvites/accountInvites';
import { BrandedEmailPreviewView } from './BrandedEmailPreviewView';

// Identity t so assertions read the raw i18n keys.
vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return {
        useTranslation: () => Object.assign([t, { language: 'de' }, true], { t, i18n: { language: 'de' } }),
        Trans: ({ i18nKey }: { i18nKey?: string }) => i18nKey ?? null,
        initReactI18next: { type: '3rdParty', init: () => undefined },
    };
});

const HTML = '<!doctype html><html lang="de"><body><p>Hallo Erika</p></body></html>';

const PREVIEW: InviteEmailPreviewDTO = {
    templateId: null,
    templateName: null,
    kind: 'TENANT_INVITE',
    language: 'de',
    subject: 'Ihre Einladung zu ORISO',
    html: HTML,
    plainText: 'ORISO\n=====',
    sampleAcceptUrl: 'https://admin.oriso.org/admin/tenant-onboarding/SAMPLE-PREVIEW-TOKEN',
};

const renderView = (props: Partial<React.ComponentProps<typeof BrandedEmailPreviewView>> = {}) =>
    render(
        <BrandedEmailPreviewView preview={PREVIEW} isLoading={false} isError={false} onRetry={vi.fn()} {...props} />,
    );

describe('BrandedEmailPreviewView', () => {
    it('hands the backend HTML to the frame verbatim — no re-styling, no rewriting', () => {
        renderView();

        const frame = screen.getByTestId('branded-email-preview-frame');
        expect(frame).toHaveAttribute('srcdoc', HTML);
    });

    it('isolates the mail: own sandboxed origin, so Admin CSS cannot leak in and links cannot navigate', () => {
        renderView();

        const frame = screen.getByTestId('branded-email-preview-frame');
        expect(frame).toHaveAttribute('sandbox', '');
        expect(frame).toHaveAccessibleName('tenants.appSettings.emailPreview.frameTitle');
    });

    it('shows the rendered subject and the sample accept URL', () => {
        renderView();

        expect(screen.getByText('Ihre Einladung zu ORISO')).toBeInTheDocument();
        expect(screen.getByText(/SAMPLE-PREVIEW-TOKEN/)).toBeInTheDocument();
    });

    it('renders an inline error with a retry instead of a global toast', async () => {
        const onRetry = vi.fn();
        renderView({ isError: true, preview: null, onRetry });

        expect(screen.getByText('tenants.appSettings.emailPreview.error')).toBeInTheDocument();
        expect(screen.queryByTestId('branded-email-preview-frame')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'tenants.appSettings.emailPreview.retry' }));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render the frame while loading', () => {
        renderView({ isLoading: true, preview: null });

        expect(screen.queryByTestId('branded-email-preview-frame')).not.toBeInTheDocument();
    });

    it('explains the wordmark fallback when the tenant has no logo', () => {
        renderView({ logoFallbackReason: 'NO_LOGO' });

        expect(screen.getByText('tenants.appSettings.emailPreview.branding.noLogo')).toBeInTheDocument();
        expect(screen.getByTestId('branded-email-preview-frame')).toBeInTheDocument();
    });

    it('distinguishes an unusable (non-remote) logo from a missing one', () => {
        renderView({ logoFallbackReason: 'LOGO_NOT_REMOTE' });

        expect(screen.getByText('tenants.appSettings.emailPreview.branding.logoNotRemote')).toBeInTheDocument();
    });

    it('shows no branding hint for the platform preview or a tenant with a usable logo', () => {
        const { rerender } = renderView({ logoFallbackReason: undefined });
        expect(screen.queryByText(/emailPreview\.branding/)).not.toBeInTheDocument();

        rerender(
            <BrandedEmailPreviewView
                preview={PREVIEW}
                isLoading={false}
                isError={false}
                onRetry={vi.fn()}
                logoFallbackReason={null}
            />,
        );
        expect(screen.queryByText(/emailPreview\.branding/)).not.toBeInTheDocument();
    });

    it('shows an empty state when the backend returns nothing to render', () => {
        renderView({ preview: null });

        expect(screen.getByText('tenants.appSettings.emailPreview.empty')).toBeInTheDocument();
    });
});
