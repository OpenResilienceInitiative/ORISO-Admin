import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailKitPreview } from './EmailKitPreview';

const t = (key: string, fallback?: string) => fallback ?? key;

// Mutable so single tests can switch the active locale (the preview derives the
// language it asks the renderer for from it).
const i18nMock = { language: 'de' };

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: i18nMock }),
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

/** The language the component actually asked the renderer for. */
const requestedLanguage = () => mocks.previewInviteEmailTemplateContent.mock.calls.at(-1)?.[0]?.language;

beforeEach(() => {
    mocks.previewInviteEmailTemplateContent.mockReset();
    mocks.previewInviteEmailTemplateContent.mockResolvedValue(previewResponse());
});

afterEach(() => {
    i18nMock.language = 'de';
});

describe('EmailKitPreview', () => {
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

    /*
     * PR #727 post-merge review: srcDoc documents inherit the parent origin, so
     * scripts inside the frame could reach the admin session. The sandbox keeps
     * same-origin (useFittedFrame needs contentDocument) but drops scripting.
     */
    it('sandboxes the preview frame to same-origin without script execution', async () => {
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

    /*
     * The four language cases below are #751's, kept alive across the E2 change.
     * They used to assert `<html lang="…">` in a locally built document; the
     * document now comes from the backend, so the same guarantees are asserted at
     * the boundary that decides them — the language the renderer is asked for.
     */
    describe('language resolution (#746/#751, re-pointed at the renderer)', () => {
        it('derives the language from the active locale instead of hardcoding de', async () => {
            i18nMock.language = 'en';
            render(<EmailKitPreview body="B" previewLabel="E-Mail-Vorschau" subject="A" />);
            await waitFor(() => expect(requestedLanguage()).toBe('en'));
        });

        it('prefers the template language over the admin UI locale', async () => {
            i18nMock.language = 'de';
            render(<EmailKitPreview body="B" language="en" previewLabel="E-Mail-Vorschau" subject="A" />);
            await waitFor(() => expect(requestedLanguage()).toBe('en'));
        });

        it('falls back to the UI locale when the template has no language', async () => {
            i18nMock.language = 'en';
            render(<EmailKitPreview body="B" language="  " previewLabel="E-Mail-Vorschau" subject="A" />);
            await waitFor(() => expect(requestedLanguage()).toBe('en'));
        });

        /*
         * #751 review: the template language is free text an admin types. It used
         * to land in `<html lang="…">`; it now lands in a request to the backend,
         * which is if anything a better reason to validate it. A payload must
         * never leave this component.
         */
        it('rejects a poisoned template language instead of forwarding it', async () => {
            i18nMock.language = 'en';
            render(
                <EmailKitPreview
                    body="B"
                    language='de"><img src="https://example.test/x">'
                    previewLabel="E-Mail-Vorschau"
                    subject="A"
                />,
            );

            await waitFor(() => expect(requestedLanguage()).toBe('en'));
            expect(requestedLanguage()).not.toContain('example.test');
            expect(requestedLanguage()).not.toContain('<img');
        });

        it('falls back to German when no locale is resolvable', async () => {
            i18nMock.language = '';
            render(<EmailKitPreview body="B" previewLabel="E-Mail-Vorschau" subject="A" />);
            await waitFor(() => expect(requestedLanguage()).toBe('de'));
        });
    });
});
