// @vitest-environment jsdom
/**
 * Theme preview via sandboxed iframe (decided 2026-06-11): the REAL
 * app renders /theme-demo with the draft seeds passed as
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
 * Tests pass a stub `appBaseUrl` and never fall back to configured `appURL`.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeEditorModal } from '.';
import { buildPreviewUrl } from './previewUrl';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const STUB_APP_BASE_URL = 'https://theme-preview.test';
const DRAFT = { accentDark: '#A5000A', accentLight: '#646d78', signal: '#b1005e' };
const STORED = { accentDark: '#0061ff' };

describe('buildPreviewUrl', () => {
    it('carries the seeds as bare hex params on the theme-demo route', () => {
        expect(
            buildPreviewUrl(STUB_APP_BASE_URL, {
                accentDark: '#A5000A',
                accentLight: '#646d78',
                signal: '#b1005e',
            }),
        ).toBe(
            `${STUB_APP_BASE_URL}/theme-demo?themePreviewPrimary=a5000a&themePreviewAccent=646d78&themePreviewSignal=b1005e`,
        );
    });

    it('omits absent optional seeds', () => {
        expect(buildPreviewUrl(STUB_APP_BASE_URL, { accentDark: '#A5000A' })).toBe(
            `${STUB_APP_BASE_URL}/theme-demo?themePreviewPrimary=a5000a`,
        );
    });

    it('returns null without a primary seed (nothing to preview)', () => {
        expect(buildPreviewUrl(STUB_APP_BASE_URL, {})).toBeNull();
    });

    it('still builds a URL when only the deprecated primary alias is set', () => {
        expect(buildPreviewUrl(STUB_APP_BASE_URL, { primary: '#A5000A', accent: '#646d78' })).toBe(
            `${STUB_APP_BASE_URL}/theme-demo?themePreviewPrimary=a5000a&themePreviewAccent=646d78`,
        );
    });
});

describe('PhoneThemePreview iframe', () => {
    it('renders the sandboxed, non-interactive iframe with the draft seeds', () => {
        render(
            <ThemeEditorModal
                open
                appBaseUrl={STUB_APP_BASE_URL}
                initialValues={{
                    theming: {
                        primaryColor: DRAFT.accentDark,
                        accent: DRAFT.accentLight,
                        signal: DRAFT.signal,
                    },
                }}
                storedSeeds={STORED}
                locks={{ accentDark: false, accentLight: false, signal: false }}
                onCancel={() => {}}
                onSubmit={() => {}}
            />,
        );

        const frames = screen.getAllByTestId('preview-frame') as HTMLIFrameElement[];
        expect(frames).toHaveLength(2);

        const draftFrame = frames.find((frame) => frame.src.includes('themePreviewPrimary=a5000a'));
        expect(draftFrame).toBeTruthy();
        expect(draftFrame!.src).toContain(`${STUB_APP_BASE_URL}/theme-demo?themePreviewPrimary=a5000a`);
        expect(draftFrame!.src).toContain('themePreviewAccent=646d78');
        expect(draftFrame!.src).toContain('themePreviewSignal=b1005e');
        expect(draftFrame!.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
        expect(draftFrame!.getAttribute('sandbox')).not.toContain('allow-top-navigation');
        expect(draftFrame!.getAttribute('sandbox')).not.toContain('allow-popups');
        expect(draftFrame!.getAttribute('sandbox')).not.toContain('allow-forms');
        expect(screen.getAllByTestId('preview-frame-shield')).toHaveLength(2);
    });

    it('explains itself when there is nothing to preview yet', () => {
        render(
            <ThemeEditorModal
                open
                appBaseUrl={STUB_APP_BASE_URL}
                initialValues={{ theming: {} }}
                storedSeeds={{}}
                locks={{ accentDark: false, accentLight: false, signal: false }}
                onCancel={() => {}}
                onSubmit={() => {}}
            />,
        );
        expect(screen.getAllByText('theme.builder.preview.empty').length).toBeGreaterThan(0);
    });
});
