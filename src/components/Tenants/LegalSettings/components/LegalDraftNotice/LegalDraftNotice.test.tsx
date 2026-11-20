import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalDraftNotice, LegalDraftStatus } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            options ? `${key}:${Object.values(options).join(':')}` : key,
        i18n: { language: 'de' },
    }),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

describe('LegalDraftNotice (pop-up)', () => {
    it('renders nothing without a saved draft', () => {
        const { container } = render(<LegalDraftNotice onDiscard={vi.fn()} />);
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByTestId('legal-draft-notice')).not.toBeInTheDocument();
    });

    it('raises a pop-up that names when the draft was saved and that it is device-local', async () => {
        render(<LegalDraftNotice savedAt="2026-08-12T08:30:00.000Z" onDiscard={vi.fn()} />);
        const popup = await screen.findByTestId('legal-draft-notice');
        expect(within(popup).getByText('legal.draft.notice.title')).toBeInTheDocument();
        // The formatted timestamp is interpolated, not the raw ISO string.
        expect(popup).toHaveTextContent(/legal\.draft\.notice\.description:.*2026/);
        expect(popup).not.toHaveTextContent('legal.draft.notice.stale');
    });

    it('falls back to the raw value when the timestamp is unparseable', async () => {
        render(<LegalDraftNotice savedAt="kaputt" onDiscard={vi.fn()} />);
        expect(await screen.findByTestId('legal-draft-notice')).toHaveTextContent(
            'legal.draft.notice.description:kaputt',
        );
    });

    it('warns when a newer version was published since the draft was saved', async () => {
        render(<LegalDraftNotice savedAt="2026-08-12T08:30:00.000Z" stale onDiscard={vi.fn()} />);
        const popup = await screen.findByTestId('legal-draft-notice');
        expect(popup).toHaveTextContent('legal.draft.notice.stale');
        expect(popup).toHaveAttribute('data-severity', 'warning');
    });

    it('discards on request', async () => {
        const onDiscard = vi.fn();
        render(<LegalDraftNotice savedAt="2026-08-12T08:30:00.000Z" onDiscard={onDiscard} />);
        const popup = await screen.findByTestId('legal-draft-notice');
        await userEvent.click(within(popup).getByRole('button', { name: 'legal.draft.discard' }));
        expect(onDiscard).toHaveBeenCalledTimes(1);
    });

    it('stays quiet while dismissed, and reports the dismissal when closed', async () => {
        const onDismiss = vi.fn();
        const { rerender } = render(
            <LegalDraftNotice savedAt="2026-08-12T08:30:00.000Z" onDiscard={vi.fn()} onDismiss={onDismiss} />,
        );
        const popup = await screen.findByTestId('legal-draft-notice');
        await userEvent.click(within(popup).getByRole('button', { name: 'snackbar.close' }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
        rerender(<LegalDraftNotice savedAt="2026-08-12T08:30:00.000Z" onDiscard={vi.fn()} dismissed />);
        await waitFor(() => expect(screen.queryByTestId('legal-draft-notice')).not.toBeInTheDocument());
    });
});

describe('LegalDraftStatus (tile text)', () => {
    it('is plain text with a discard button, and offers to show the notice again once it was closed', async () => {
        const onReopen = vi.fn();
        const onDiscard = vi.fn();
        render(
            <LegalDraftStatus savedAt="2026-08-12T08:30:00.000Z" onDiscard={onDiscard} dismissed onReopen={onReopen} />,
        );
        expect(screen.getByTestId('legal-draft-status')).toHaveTextContent(/legal\.draft\.status:.*2026/);
        await userEvent.click(screen.getByRole('button', { name: 'legal.draft.notice.show' }));
        expect(onReopen).toHaveBeenCalledTimes(1);
        await userEvent.click(screen.getByRole('button', { name: 'legal.draft.discard' }));
        expect(onDiscard).toHaveBeenCalledTimes(1);
    });

    it('does not offer to re-show a notice that is still open', () => {
        render(<LegalDraftStatus savedAt="2026-08-12T08:30:00.000Z" onDiscard={vi.fn()} onReopen={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'legal.draft.notice.show' })).not.toBeInTheDocument();
    });

    it('marks a stale draft in the error tone and renders nothing without a draft', () => {
        const { rerender } = render(<LegalDraftStatus savedAt="2026-08-12T08:30:00.000Z" stale onDiscard={vi.fn()} />);
        expect(screen.getByTestId('legal-draft-status')).toHaveTextContent('legal.draft.notice.stale');
        rerender(<LegalDraftStatus onDiscard={vi.fn()} />);
        expect(screen.queryByTestId('legal-draft-status')).not.toBeInTheDocument();
    });
});
