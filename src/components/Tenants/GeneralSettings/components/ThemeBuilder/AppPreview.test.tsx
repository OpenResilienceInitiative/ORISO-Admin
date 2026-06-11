// @vitest-environment jsdom
/**
 * AppPreview (THB-04 iteration, 2026-06-11): the theme preview is a
 * miniature of the real counselling app — navigation rail, session
 * list with topic chips, chat history, message editor — painted
 * exclusively through the --m3-* tokens of the OrisoScheme engine.
 *
 * Traces: UAT-C (Test #14 in THB — Test Logic).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { computeOrisoPalette } from '../../../../../utils/theme/orisoScheme';
import { AppPreview } from './AppPreview';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

describe('engine painting (Test #14 — same engine as the live app)', () => {
    it('paints the preview with the engine palette for the given seeds', () => {
        const { tokens } = computeOrisoPalette({ primary: '#a5000a' }, 'light');
        render(<AppPreview seeds={{ primary: '#a5000a' }} />);
        const preview = screen.getByTestId('app-preview');
        expect(preview.style.getPropertyValue('--m3-primary')).toBe(tokens['--m3-primary']);
        expect(preview.style.getPropertyValue('--m3-surface')).toBe(tokens['--m3-surface']);
        expect(preview.style.getPropertyValue('--m3-secondary-container')).toBe(tokens['--m3-secondary-container']);
    });

    it('repaints when the seed changes (live recompute on drag)', () => {
        const { rerender } = render(<AppPreview seeds={{ primary: '#a5000a' }} />);
        const next = computeOrisoPalette({ primary: '#0061ff' }, 'light');
        rerender(<AppPreview seeds={{ primary: '#0061ff' }} />);
        expect(screen.getByTestId('app-preview').style.getPropertyValue('--m3-primary')).toBe(
            next.tokens['--m3-primary'],
        );
    });

    it('renders a placeholder instead of crashing without a primary seed', () => {
        render(<AppPreview seeds={{}} />);
        expect(screen.queryByTestId('app-preview')).not.toBeInTheDocument();
    });
});

describe('the preview replicates the counselling app', () => {
    it('shows the navigation rail with the app sections', () => {
        render(<AppPreview seeds={{ primary: '#a5000a' }} />);
        expect(screen.getByText('theme.builder.preview.nav.enquiries')).toBeInTheDocument();
        expect(screen.getByText('theme.builder.preview.nav.sessions')).toBeInTheDocument();
        expect(screen.getByText('theme.builder.preview.nav.profile')).toBeInTheDocument();
    });

    it('shows the session list with topic chips and counselling types', () => {
        render(<AppPreview seeds={{ primary: '#a5000a' }} />);
        expect(screen.getAllByText('Familienberatung').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Suchtberatung')).toBeInTheDocument();
        expect(screen.getAllByText('theme.builder.preview.type.liveChat').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('theme.builder.preview.type.oneOnOne')).toBeInTheDocument();
    });

    it('shows the chat pane with both message directions and the editor', () => {
        render(<AppPreview seeds={{ primary: '#a5000a' }} />);
        // counsellor message (own, primary-container) and client message
        expect(screen.getByTestId('app-preview-message-own')).toBeInTheDocument();
        expect(screen.getByTestId('app-preview-message-client')).toBeInTheDocument();
        expect(screen.getByText('theme.builder.preview.editor.placeholder')).toBeInTheDocument();
        expect(screen.getByText('theme.builder.preview.editor.send')).toBeInTheDocument();
    });

    it('clicking a session entry selects it (click-through nuance)', () => {
        render(<AppPreview seeds={{ primary: '#a5000a' }} />);
        const entries = screen.getAllByTestId('app-preview-session');
        expect(entries.length).toBeGreaterThanOrEqual(3);
        expect(entries[0].getAttribute('data-selected')).toBe('true');
        fireEvent.click(entries[1]);
        expect(entries[1].getAttribute('data-selected')).toBe('true');
        expect(entries[0].getAttribute('data-selected')).toBe('false');
    });
});
