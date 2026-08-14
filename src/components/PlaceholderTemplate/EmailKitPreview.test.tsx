import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { EmailKitPreview } from './EmailKitPreview';

const t = (key: string, fallback?: string) => fallback ?? key;

// Mutable so single tests can switch the active locale (the preview derives
// its document lang from it).
const i18nMock = { language: 'de' };

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: i18nMock }),
}));

afterEach(() => {
    document.documentElement.style.removeProperty('--m3-primary');
    i18nMock.language = 'de';
});

const srcDoc = (preview: HTMLElement): string => preview.querySelector('iframe')?.getAttribute('srcdoc') ?? '';

describe('EmailKitPreview', () => {
    it('renders the subject in the inbox strip and the body into the mail document', () => {
        render(<EmailKitPreview subject="Ihre Einladung" body="Hallo Lisa Beispiel" previewLabel="E-Mail-Vorschau" />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(within(preview).getByText('Ihre Einladung')).toBeInTheDocument();
        expect(preview.querySelector('iframe')).toHaveAttribute('title', 'E-Mail-Vorschau');
        expect(srcDoc(preview)).toContain('Hallo Lisa Beispiel');
    });

    it('shows unresolved subject tokens as chips in the inbox strip', () => {
        render(<EmailKitPreview subject="Hallo {{wer}}" body="x" previewLabel="E-Mail-Vorschau" />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(within(preview).getByText('{{wer}}')).toBeInTheDocument();
    });

    it('applies the tenant primary colour from the admin theme to the shell', () => {
        document.documentElement.style.setProperty('--m3-primary', '#336699');
        render(<EmailKitPreview subject="A" body="B" previewLabel="E-Mail-Vorschau" />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(srcDoc(preview)).toContain('#336699');
        expect(srcDoc(preview)).not.toContain('#a5000a');
    });

    /*
     * PR #727 post-merge review: srcDoc documents inherit the parent origin, so
     * scripts inside the frame could reach the admin session. The sandbox keeps
     * same-origin (useFittedFrame needs contentDocument) but drops scripting.
     */
    it('sandboxes the preview frame to same-origin without script execution', () => {
        render(<EmailKitPreview subject="A" body="B" previewLabel="E-Mail-Vorschau" />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(preview.querySelector('iframe')).toHaveAttribute('sandbox', 'allow-same-origin');
    });

    it('derives the mail document language from the active locale instead of hardcoding de', () => {
        i18nMock.language = 'en';
        render(<EmailKitPreview subject="A" body="B" previewLabel="E-Mail-Vorschau" />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(srcDoc(preview)).toContain('<html lang="en">');
    });

    it('falls back to German when no locale is resolvable', () => {
        i18nMock.language = '';
        render(<EmailKitPreview subject="A" body="B" previewLabel="E-Mail-Vorschau" />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(srcDoc(preview)).toContain('<html lang="de">');
    });

    it('renders the empty state with both hints instead of a broken frame', () => {
        render(<EmailKitPreview subject="" body="" previewLabel="E-Mail-Vorschau" />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(within(preview).getByText('Betreff der E-Mail')).toBeInTheDocument();
        expect(srcDoc(preview)).toContain('Inhalt der E-Mail');
    });
});
