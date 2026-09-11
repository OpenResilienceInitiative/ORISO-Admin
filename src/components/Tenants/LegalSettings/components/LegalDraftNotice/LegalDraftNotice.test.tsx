import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalDraftNotice } from './index';

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

describe('LegalDraftNotice', () => {
    it('renders nothing without a saved draft', () => {
        const { container } = render(<LegalDraftNotice onDiscard={vi.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('names when the draft was saved and warns that it is device-local', () => {
        render(<LegalDraftNotice savedAt="2026-08-12T08:30:00.000Z" onDiscard={vi.fn()} />);
        expect(screen.getByText('legal.draft.notice.title')).toBeInTheDocument();
        // The formatted timestamp is interpolated, not the raw ISO string.
        expect(screen.getByText(/legal\.draft\.notice\.description:.*2026/)).toBeInTheDocument();
        expect(screen.queryByText('legal.draft.notice.stale')).not.toBeInTheDocument();
    });

    it('falls back to the raw value when the timestamp is unparseable', () => {
        render(<LegalDraftNotice savedAt="kaputt" onDiscard={vi.fn()} />);
        expect(screen.getByText('legal.draft.notice.description:kaputt')).toBeInTheDocument();
    });

    it('warns when a newer version was published since the draft was saved', () => {
        render(<LegalDraftNotice savedAt="2026-08-12T08:30:00.000Z" stale onDiscard={vi.fn()} />);
        expect(screen.getByText('legal.draft.notice.stale')).toBeInTheDocument();
    });

    it('discards on request', async () => {
        const onDiscard = vi.fn();
        render(<LegalDraftNotice savedAt="2026-08-12T08:30:00.000Z" onDiscard={onDiscard} />);
        await userEvent.click(screen.getByRole('button', { name: 'legal.draft.discard' }));
        expect(onDiscard).toHaveBeenCalledTimes(1);
    });
});
