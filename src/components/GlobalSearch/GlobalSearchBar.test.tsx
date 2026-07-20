import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GlobalSearchBar } from './GlobalSearchBar';
import styles from './globalSearchBar.module.scss';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

describe('GlobalSearchBar', () => {
    it('starts minimized and expands via the magnifier, collapsing on the next press', async () => {
        const user = userEvent.setup();
        const onExpandedChange = vi.fn();
        render(<GlobalSearchBar onExpandedChange={onExpandedChange} />);

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Suche öffnen oder schließen' }));
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(onExpandedChange).toHaveBeenLastCalledWith(true);

        await user.click(screen.getByRole('button', { name: 'Suche öffnen oder schließen' }));
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(onExpandedChange).toHaveBeenLastCalledWith(false);
    });

    it('toggles via the caret and flips its direction', async () => {
        const user = userEvent.setup();
        render(<GlobalSearchBar />);

        const caretButton = screen.getByRole('button', { name: 'Suche ausklappen' });
        expect(caretButton).toHaveAttribute('aria-expanded', 'false');

        await user.click(caretButton);
        const collapseButton = screen.getByRole('button', { name: 'Suche einklappen' });
        expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
        expect(collapseButton.querySelector(`.${styles.caretFlipped}`)).not.toBeNull();

        await user.click(collapseButton);
        expect(screen.getByRole('button', { name: 'Suche ausklappen' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('submits a filled query via the magnifier instead of collapsing', async () => {
        const user = userEvent.setup();
        const onSearch = vi.fn();
        render(<GlobalSearchBar defaultExpanded onSearch={onSearch} />);

        await user.type(screen.getByRole('textbox'), 'Konstanze');
        await user.click(screen.getByRole('button', { name: 'Suche ausführen' }));

        expect(onSearch).toHaveBeenCalledWith('Konstanze');
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('forwards input interaction hooks and respects prevented keyboard events', async () => {
        const user = userEvent.setup();
        const onInputClick = vi.fn();
        const onInputFocus = vi.fn();
        const onInputKeyDown = vi.fn((event) => event.preventDefault());
        const onSearch = vi.fn();
        render(
            <GlobalSearchBar
                ariaLabel="Beratungsstellen suchen"
                defaultExpanded
                onInputClick={onInputClick}
                onInputFocus={onInputFocus}
                onInputKeyDown={onInputKeyDown}
                onSearch={onSearch}
            />,
        );

        const input = screen.getByRole('textbox', { name: 'Beratungsstellen suchen' });
        await user.click(input);
        await user.keyboard('{Enter}');

        expect(onInputClick).toHaveBeenCalled();
        expect(onInputFocus).toHaveBeenCalled();
        expect(onInputKeyDown).toHaveBeenCalled();
        expect(onSearch).not.toHaveBeenCalled();
        expect(input).toHaveAttribute('autocomplete', 'search');
        expect(input).toHaveAttribute('name', 'search');
    });

    it('does not focus the input on mount when it starts expanded', () => {
        const onInputFocus = vi.fn();
        render(<GlobalSearchBar defaultExpanded onInputFocus={onInputFocus} />);

        expect(screen.getByRole('textbox')).not.toHaveFocus();
        expect(onInputFocus).not.toHaveBeenCalled();
    });

    it('focuses the input once the user expands the search', async () => {
        const user = userEvent.setup();
        render(<GlobalSearchBar />);

        await user.click(screen.getByRole('button', { name: 'Suche ausklappen' }));

        expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('renders the row inside the horizontal-scroll container with its children', () => {
        const { container } = render(
            <GlobalSearchBar>
                <button type="button">Direkt Versenden</button>
            </GlobalSearchBar>,
        );

        const scroller = container.firstElementChild as HTMLElement;
        expect(scroller).toHaveClass(styles.scroller);
        expect(scroller.querySelector(`.${styles.row}`)).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Direkt Versenden' })).toBeInTheDocument();
    });
});
