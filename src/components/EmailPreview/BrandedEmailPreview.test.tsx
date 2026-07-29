import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InviteEmailPreviewDTO } from '../../api/accountInvites/accountInvites';

const mocks = vi.hoisted(() => ({
    getInviteEmailPreview: vi.fn(),
    useSingleTenantData: vi.fn(),
    language: { current: 'de' },
}));

vi.mock('../../api/accountInvites/accountInvites', () => ({
    getInviteEmailPreview: mocks.getInviteEmailPreview,
}));
vi.mock('../../hooks/useSingleTenantData', () => ({ useSingleTenantData: mocks.useSingleTenantData }));
vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return {
        useTranslation: () =>
            Object.assign([t, { language: mocks.language.current }, true], {
                t,
                i18n: { language: mocks.language.current, resolvedLanguage: mocks.language.current },
            }),
        Trans: ({ i18nKey }: { i18nKey?: string }) => i18nKey ?? null,
        initReactI18next: { type: '3rdParty', init: () => undefined },
    };
});

// eslint-disable-next-line import/first
import { BrandedEmailPreview } from './BrandedEmailPreview';

const PREVIEW: InviteEmailPreviewDTO = {
    templateId: null,
    templateName: null,
    kind: 'TENANT_INVITE',
    language: 'de',
    subject: 'Ihre Einladung zu ORISO',
    html: '<!doctype html><html lang="de"><body>mail</body></html>',
    plainText: 'ORISO',
    sampleAcceptUrl: 'https://admin.oriso.org/admin/tenant-onboarding/SAMPLE-PREVIEW-TOKEN',
};

const renderPreview = (tenantId?: number) =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <BrandedEmailPreview tenantId={tenantId} />
        </QueryClientProvider>,
    );

describe('BrandedEmailPreview', () => {
    beforeEach(() => {
        mocks.language.current = 'de';
        mocks.getInviteEmailPreview.mockReset().mockResolvedValue(PREVIEW);
        mocks.useSingleTenantData.mockReset().mockReturnValue({ data: undefined });
    });

    it('requests the tenant branding and the current UI language', async () => {
        mocks.language.current = 'en';
        renderPreview(7);

        await waitFor(() => expect(mocks.getInviteEmailPreview).toHaveBeenCalledWith({ tenantId: 7, language: 'en' }));
    });

    it('falls back to the German frame for any unsupported UI language', async () => {
        mocks.language.current = 'fr';
        renderPreview();

        await waitFor(() =>
            expect(mocks.getInviteEmailPreview).toHaveBeenCalledWith({ tenantId: undefined, language: 'de' }),
        );
    });

    it('renders the backend HTML once the preview arrives', async () => {
        renderPreview();

        const frame = await screen.findByTestId('branded-email-preview-frame');
        expect(frame).toHaveAttribute('srcdoc', PREVIEW.html);
    });

    it('explains the wordmark fallback when the tenant logo cannot be used in e-mail', async () => {
        mocks.useSingleTenantData.mockReturnValue({ data: { theming: { logo: 'data:image/png;base64,AAA' } } });
        renderPreview(7);

        expect(await screen.findByText('tenants.appSettings.emailPreview.branding.logoNotRemote')).toBeInTheDocument();
    });

    it('shows no branding hint for a platform preview, even without tenant data', async () => {
        renderPreview();

        await screen.findByTestId('branded-email-preview-frame');
        expect(screen.queryByText(/emailPreview\.branding/)).not.toBeInTheDocument();
    });

    it('surfaces a failed render inline instead of leaving the card blank', async () => {
        mocks.getInviteEmailPreview.mockRejectedValue(new Error('CATCH_ALL_SILENT'));
        renderPreview();

        expect(await screen.findByText('tenants.appSettings.emailPreview.error')).toBeInTheDocument();
    });
});
