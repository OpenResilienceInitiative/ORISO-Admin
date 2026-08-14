import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { EmailKitPreview } from './EmailKitPreview';

const t = (key: string, fallback?: string) => fallback ?? key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

afterEach(() => {
    document.documentElement.style.removeProperty('--m3-primary');
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

    it('renders the empty state with both hints instead of a broken frame', () => {
        render(<EmailKitPreview subject="" body="" previewLabel="E-Mail-Vorschau" />);
        const preview = screen.getByRole('region', { name: 'E-Mail-Vorschau' });
        expect(within(preview).getByText('Betreff der E-Mail')).toBeInTheDocument();
        expect(srcDoc(preview)).toContain('Inhalt der E-Mail');
    });
});
