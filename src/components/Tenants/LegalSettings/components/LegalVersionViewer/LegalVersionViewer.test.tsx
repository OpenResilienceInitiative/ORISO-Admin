import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalVersion, LegalVersionViewer } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

// TipTap pulls heavy editor deps; stub it to a plain node that echoes its value.
vi.mock('../../../../FormPluginEditor/TiptapEditor', () => ({
    default: ({ value }: { value: string }) => <div data-testid="editor" data-value={value} />,
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

const versions: LegalVersion[] = [
    { id: '2026-07-13T10:22', label: '13 Jul 2026', content: '<p>latest</p>' },
    { id: '2026-06-01T09:00', label: '01 Jun 2026', content: '<p>older</p>' },
];

describe('LegalVersionViewer', () => {
    it('renders null when there are no versions', () => {
        const { container } = render(<LegalVersionViewer versions={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the newest version by default', () => {
        render(<LegalVersionViewer versions={versions} />);
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>latest</p>');
    });

    it('honours defaultVersionId', () => {
        render(<LegalVersionViewer versions={versions} defaultVersionId="2026-06-01T09:00" />);
        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>older</p>');
    });

    it('shows the content of the version picked in the select', async () => {
        const user = userEvent.setup();
        render(<LegalVersionViewer versions={versions} />);

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByText('01 Jun 2026'));

        expect(screen.getByTestId('editor')).toHaveAttribute('data-value', '<p>older</p>');
    });
});
