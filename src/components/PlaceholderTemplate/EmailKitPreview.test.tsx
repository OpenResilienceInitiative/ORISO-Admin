import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailKitPreview } from './EmailKitPreview';

const t = (key: string, fallback?: string) => fallback ?? key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

const mocks = vi.hoisted(() => ({
    previewInviteEmailTemplateContent: vi.fn(),
}));

vi.mock('../../api/accountInvites/accountInvites', () => ({
    previewInviteEmailTemplateContent: mocks.previewInviteEmailTemplateContent,
}));

const previewResponse = (overrides: Record<string, unknown> = {}) => ({
    templateId: null,
    templateName: null,
    kind: 'TENANT_INVITE',
    language: 'de',
    subject: 'Ihre Einladung für Maren',
    html: '<!doctype html><html><body>RENDERED BY THE BACKEND</body></html>',
    plainText: 'RENDERED BY THE BACKEND',
    sampleAcceptUrl: 'https://admin.example/tenant-onboarding/SAMPLE',
    ...overrides,
});

const frameOf = (preview: HTMLElement): HTMLIFrameElement | null => preview.querySelector('iframe');

describe('EmailKitPreview', () => {
    beforeEach(() => {
        mocks.previewInviteEmailTemplateContent.mockReset();
        mocks.previewInviteEmailTemplateContent.mockResolvedValue(previewResponse());
    });

    // The point of E2: the preview must be the send path's own output, not an
    // Admin-side re-implementation of the mail frame.
    it('renders the document the backend renderer returned, verbatim', async () => {
        render(
            <EmailKitPreview
                body="Hallo {{firstName}}"
                kind="TENANT_INVITE"
                previewLabel="E-Mail-Vorschau"
                subject="Einladung für {{firstName}}"
            />,
        );

        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        await waitFor(() =>
            expect(frameOf(preview)).toHaveAttribute(
                'srcdoc',
                '<!doctype html><html><body>RENDERED BY THE BACKEND</body></html>',
            ),
        );
        expect(frameOf(preview)).toHaveAttribute('title', 'E-Mail-Vorschau');
    });

    // Tokens are substituted by the backend for the preview AND for the sent
    // mail, so the authored text must travel unresolved.
    it('sends the authored text raw, with the tokens unresolved', async () => {
        render(
            <EmailKitPreview
                body="Hallo {{firstName}}"
                kind="COUNSELLOR_INVITE"
                previewLabel="E-Mail-Vorschau"
                subject="Einladung für {{firstName}}"
            />,
        );

        await waitFor(() =>
            expect(mocks.previewInviteEmailTemplateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: 'Hallo {{firstName}}',
                    kind: 'COUNSELLOR_INVITE',
                    subject: 'Einladung für {{firstName}}',
                }),
            ),
        );
    });

    it('shows the subject the renderer produced, not the one that was typed', async () => {
        render(<EmailKitPreview body="x" previewLabel="E-Mail-Vorschau" subject="Einladung für {{firstName}}" />);

        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(await within(preview).findByText('Ihre Einladung für Maren')).toBeInTheDocument();
        expect(within(preview).queryByText('Einladung für {{firstName}}')).not.toBeInTheDocument();
    });

    // A mail document is untrusted markup as far as the Admin app is concerned.
    // `allow-same-origin` is present so the frame can be fitted to its content;
    // `allow-scripts` must never join it, or the sandbox is defeated.
    it('sandboxes the rendered document without ever allowing scripts', async () => {
        render(<EmailKitPreview body="x" previewLabel="E-Mail-Vorschau" subject="y" />);

        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        await waitFor(() => expect(frameOf(preview)).toHaveAttribute('srcdoc', expect.stringContaining('RENDERED')));
        expect(frameOf(preview)).toHaveAttribute('sandbox', 'allow-same-origin');
        expect(frameOf(preview)?.getAttribute('sandbox')).not.toContain('allow-scripts');
    });

    // A silent local fallback would look plausible and lie about what is sent.
    it('states the failure and offers a retry instead of approximating locally', async () => {
        mocks.previewInviteEmailTemplateContent.mockRejectedValueOnce(new Error('boom'));
        const user = userEvent.setup();
        render(<EmailKitPreview body="x" previewLabel="E-Mail-Vorschau" subject="y" />);

        expect(await screen.findByText('Preview could not be rendered.')).toBeInTheDocument();
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(frameOf(preview)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Retry' }));
        await waitFor(() => expect(frameOf(preview)).toHaveAttribute('srcdoc', expect.stringContaining('RENDERED')));
    });

    // Only shows up on a slow connection: a render for stale input must never
    // win the race against a newer one.
    it('never lets a late response for older input overwrite a newer preview', async () => {
        let resolveStale: (value: unknown) => void = () => {};
        mocks.previewInviteEmailTemplateContent.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveStale = resolve;
                }),
        );
        mocks.previewInviteEmailTemplateContent.mockResolvedValue(
            previewResponse({ html: '<html><body>NEW</body></html>', subject: 'new' }),
        );

        const { rerender } = render(<EmailKitPreview body="old" previewLabel="E-Mail-Vorschau" subject="old" />);
        await waitFor(() => expect(mocks.previewInviteEmailTemplateContent).toHaveBeenCalledTimes(1));

        rerender(<EmailKitPreview body="new" previewLabel="E-Mail-Vorschau" subject="new" />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        await waitFor(() => expect(frameOf(preview)).toHaveAttribute('srcdoc', '<html><body>NEW</body></html>'));

        // The first request only now comes back — it must be ignored.
        resolveStale(previewResponse({ html: '<html><body>STALE</body></html>', subject: 'stale' }));
        await waitFor(() => expect(frameOf(preview)).toHaveAttribute('srcdoc', '<html><body>NEW</body></html>'));
        expect(within(preview).queryByText('stale')).not.toBeInTheDocument();
    });
});
