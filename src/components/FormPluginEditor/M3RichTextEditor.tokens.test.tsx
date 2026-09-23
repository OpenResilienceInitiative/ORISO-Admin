import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { M3RichTextEditor } from './M3RichTextEditor';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallbackOrOptions?: unknown) => {
            if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
            return key;
        },
    }),
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
    Element.prototype.scrollIntoView = vi.fn();
});

const tokens = [
    { key: 'Beratungsstelle', label: 'Beratungsstelle', sample: 'Musterberatungsstelle' },
    { key: 'Adresse', label: 'Adresse', sample: 'Musterstraße 1, 12345 Musterstadt' },
];

describe('M3RichTextEditor text tokens', () => {
    it('shows each placeholder with its sample value and inserts it at the cursor', async () => {
        const onChange = vi.fn();
        render(
            <M3RichTextEditor title="Impressum" value="<p>Anschrift: </p>" textTokens={tokens} onChange={onChange} />,
        );

        const address = await screen.findByRole('button', { name: /Adresse.*Musterstraße 1, 12345 Musterstadt/ });
        await userEvent.click(address);

        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('{{Adresse}}')));
    });

    it('offers no placeholders to a reader', async () => {
        render(<M3RichTextEditor title="Impressum" value="<p>x</p>" textTokens={tokens} readOnly />);
        await screen.findByTestId('m3-editor');
        expect(screen.queryByTestId('m3-editor-token-row')).toBeNull();
    });
});
