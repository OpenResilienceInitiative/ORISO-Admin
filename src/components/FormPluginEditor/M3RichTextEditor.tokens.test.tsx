import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

const placeholderButton = () => screen.findByRole('button', { name: 'Platzhalter einfügen' });

describe('M3RichTextEditor placeholder menu', () => {
    it('replaces the placeholder row with one toolbar button', async () => {
        render(<M3RichTextEditor title="Impressum" value="<p>x</p>" textTokens={tokens} onChange={vi.fn()} />);

        const button = await placeholderButton();
        expect(within(screen.getByTestId('m3-toolbar')).getByRole('button', { name: 'Platzhalter einfügen' })).toBe(
            button,
        );
        expect(button).toHaveAttribute('aria-haspopup', 'menu');
        expect(screen.queryByTestId('m3-editor-token-row')).toBeNull();
        expect(screen.queryByText('Musterberatungsstelle')).toBeNull();
    });

    it('lists each placeholder with its sample value and inserts {{key}} at the cursor', async () => {
        const onChange = vi.fn();
        render(
            <M3RichTextEditor title="Impressum" value="<p>Anschrift: </p>" textTokens={tokens} onChange={onChange} />,
        );

        await userEvent.click(await placeholderButton());
        const menu = await screen.findByRole('menu');
        const address = within(menu).getByRole('menuitem', { name: /Adresse.*Musterstraße 1, 12345 Musterstadt/ });
        expect(within(menu).getByRole('menuitem', { name: /Beratungsstelle.*Musterberatungsstelle/ })).toBeTruthy();
        await userEvent.click(address);

        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('{{Adresse}}')));
    });

    it('opens from the keyboard and closes on Escape', async () => {
        render(<M3RichTextEditor title="Impressum" value="<p>x</p>" textTokens={tokens} onChange={vi.fn()} />);

        const button = await placeholderButton();
        button.focus();
        await userEvent.keyboard('{Enter}');
        expect(await screen.findByRole('menu')).toBeInTheDocument();
        expect(button).toHaveAttribute('aria-expanded', 'true');

        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'false'));
    });

    it('offers no placeholders to a reader', async () => {
        render(<M3RichTextEditor title="Impressum" value="<p>x</p>" textTokens={tokens} readOnly />);
        await screen.findByTestId('m3-editor');
        expect(screen.queryByRole('button', { name: 'Platzhalter einfügen' })).toBeNull();
    });
});
