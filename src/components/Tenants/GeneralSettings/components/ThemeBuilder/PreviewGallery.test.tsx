// @vitest-environment jsdom
/**
 * Multi-screen preview gallery (THB-04 iteration 2, 2026-06-11):
 * the inline preview stays the live desktop view; a "Vorschau" button
 * opens a modal gallery to page through Chat-Verlauf, mobile Chatraum
 * and Login — each painted by the engine, with a Vorher/Nachher
 * comparison.
 *
 * Traces: UAT-C.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { computeOrisoPalette } from '../../../../../utils/theme/orisoScheme';
import { AppPreview } from './AppPreview';
import { PreviewGalleryModal } from './PreviewGalleryModal';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const SEEDS = { primary: '#a5000a' };
const STORED = { primary: '#0061ff' };

describe('AppPreview screens', () => {
    it('renders the desktop composite by default', () => {
        render(<AppPreview seeds={SEEDS} />);
        expect(screen.getAllByTestId('app-preview-session').length).toBeGreaterThanOrEqual(3);
    });

    it('renders the large chat history screen with real bubble pair', () => {
        render(<AppPreview seeds={SEEDS} screen="chatHistory" />);
        expect(screen.getByTestId('app-preview-message-own')).toBeInTheDocument();
        expect(screen.getByTestId('app-preview-message-client')).toBeInTheDocument();
        // the own bubble rides the light brand tint (Primary Fixed)
        const { tokens } = computeOrisoPalette(SEEDS, 'light');
        expect(screen.getByTestId('app-preview').style.getPropertyValue('--m3-primary-fixed')).toBe(
            tokens['--m3-primary-fixed'],
        );
    });

    it('renders the mobile chat room inside a device frame', () => {
        render(<AppPreview seeds={SEEDS} screen="mobile" />);
        expect(screen.getByTestId('app-preview-device')).toBeInTheDocument();
        expect(screen.getByTestId('app-preview-message-own')).toBeInTheDocument();
    });

    it('renders the login screen with form and primary action', () => {
        render(<AppPreview seeds={SEEDS} screen="login" />);
        expect(screen.getByText('theme.builder.preview.login.headline')).toBeInTheDocument();
        expect(screen.getByText('theme.builder.preview.login.submit')).toBeInTheDocument();
    });
});

describe('PreviewGalleryModal', () => {
    it('pages through the four screens', () => {
        render(<PreviewGalleryModal open onClose={() => {}} draftSeeds={SEEDS} storedSeeds={STORED} />);
        expect(screen.getByText('theme.builder.preview.screen.desktop')).toBeInTheDocument();
        const next = screen.getByTestId('gallery-next');
        fireEvent.click(next);
        expect(screen.getByText('theme.builder.preview.screen.chatHistory')).toBeInTheDocument();
        fireEvent.click(next);
        expect(screen.getByText('theme.builder.preview.screen.mobile')).toBeInTheDocument();
        fireEvent.click(next);
        expect(screen.getByText('theme.builder.preview.screen.login')).toBeInTheDocument();
    });

    it('compares Vorher/Nachher inside the gallery', () => {
        render(<PreviewGalleryModal open onClose={() => {}} draftSeeds={SEEDS} storedSeeds={STORED} />);
        const draft = computeOrisoPalette(SEEDS, 'light').tokens;
        const stored = computeOrisoPalette(STORED, 'light').tokens;
        // default: Nachher (draft)
        expect(screen.getByTestId('app-preview').style.getPropertyValue('--m3-primary')).toBe(draft['--m3-primary']);
        fireEvent.click(screen.getByText('theme.builder.preview.current'));
        expect(screen.getByTestId('app-preview').style.getPropertyValue('--m3-primary')).toBe(stored['--m3-primary']);
    });
});
