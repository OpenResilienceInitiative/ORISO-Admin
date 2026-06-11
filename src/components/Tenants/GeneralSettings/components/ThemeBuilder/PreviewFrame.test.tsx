// @vitest-environment jsdom
/**
 * Theme preview via sandboxed iframe (decided 2026-06-11): the REAL
 * app renders its public sign-in screen with the draft seeds passed as
 * strictly-validated query params — one place to keep correct instead
 * of maintained replicas.
 *
 * Security constraints locked here:
 * - sandbox="allow-scripts allow-same-origin" and nothing else: no
 *   forms, no popups, no top navigation, no downloads. allow-same-origin
 *   is required because the app talks to its API same-origin (proxied);
 *   an opaque origin would send Origin: null and every call would fail
 *   CORS (verified against app.oriso.org). Admin cookies and Keycloak
 *   tokens stay unreachable either way: the app is cross-origin to the
 *   admin, so the same-origin policy isolates it regardless of sandbox.
 * - the frame is purely visual: pointer events are blocked.
 * - the URL carries bare hex colour values only.
 *
 * Traces: UAT-C.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildPreviewUrl } from './previewUrl';
import { PreviewFrameModal } from './PreviewFrameModal';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const DRAFT = { primary: '#A5000A', accent: '#646d78', signal: '#b1005e' };
const STORED = { primary: '#0061ff' };

describe('buildPreviewUrl', () => {
    it('carries the seeds as bare hex params on the theme-demo route', () => {
        expect(buildPreviewUrl('https://example.org', DRAFT)).toBe(
            'https://example.org/theme-demo?themePreviewPrimary=a5000a&themePreviewAccent=646d78&themePreviewSignal=b1005e',
        );
    });

    it('omits absent optional seeds', () => {
        expect(buildPreviewUrl('https://example.org', { primary: '#A5000A' })).toBe(
            'https://example.org/theme-demo?themePreviewPrimary=a5000a',
        );
    });

    it('returns null without a primary seed (nothing to preview)', () => {
        expect(buildPreviewUrl('https://example.org', {})).toBeNull();
    });
});

describe('PreviewFrameModal', () => {
    it('renders the sandboxed, non-interactive iframe with the draft seeds', () => {
        render(
            <PreviewFrameModal
                open
                onClose={() => {}}
                draftSeeds={DRAFT}
                storedSeeds={STORED}
                appBaseUrl="https://example.org"
            />,
        );
        const frame = screen.getByTitle('theme.builder.preview.frameTitle') as HTMLIFrameElement;
        expect(frame.src).toContain('/theme-demo?themePreviewPrimary=a5000a');
        // scripts + own origin only — no forms, popups, navigation, downloads
        expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
        expect(frame.getAttribute('sandbox')).not.toContain('allow-top-navigation');
        expect(frame.getAttribute('sandbox')).not.toContain('allow-popups');
        expect(frame.getAttribute('sandbox')).not.toContain('allow-forms');
        // purely visual
        expect(screen.getByTestId('preview-frame-shield')).toBeInTheDocument();
    });

    it('switches between Vorher (stored) and Nachher (draft)', () => {
        render(
            <PreviewFrameModal
                open
                onClose={() => {}}
                draftSeeds={DRAFT}
                storedSeeds={STORED}
                appBaseUrl="https://example.org"
            />,
        );
        fireEvent.click(screen.getByText('theme.builder.preview.current'));
        const frame = screen.getByTitle('theme.builder.preview.frameTitle') as HTMLIFrameElement;
        expect(frame.src).toContain('themePreviewPrimary=0061ff');
    });

    it('explains itself when there is nothing to preview yet', () => {
        render(
            <PreviewFrameModal
                open
                onClose={() => {}}
                draftSeeds={{}}
                storedSeeds={{}}
                appBaseUrl="https://example.org"
            />,
        );
        expect(screen.getByText('theme.builder.preview.empty')).toBeInTheDocument();
    });
});
