import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import '../../i18n';
import { AdminSearchProvider } from './AdminSearchProvider';
import { buildFixtureIndex } from './searchFixtures';

const fixtureIndex = buildFixtureIndex({ role: 'platform', language: 'de', singleDomain: false });

vi.mock('./useAdminSearchIndex', () => ({ useAdminSearchIndex: () => fixtureIndex }));
vi.mock('./useSearchEntities', () => ({
    useSearchEntities: () => ({ docs: [], isFetching: false, hasError: false, forQuery: undefined }),
}));

const SEARCH_FIELD = /Einstellungen, Seiten, Personen suchen|Search settings, pages, people/;

const pressCmdK = (target: EventTarget = document.activeElement ?? window) =>
    fireEvent.keyDown(target, { key: 'k', metaKey: true });

const renderWithPageField = () =>
    render(
        <MemoryRouter>
            <AdminSearchProvider navItems={[]} tree={{}}>
                {/* The Statistics page has a filter field of its own; focus returns there after the search. */}
                <input aria-label="Träger oder Beratungsstelle" />
                {/* The bar is the origin the overlay grows out of and shrinks back into (animated close). */}
                <button type="button" data-admin-search-button>
                    Suche
                </button>
            </AdminSearchProvider>
        </MemoryRouter>,
    );

const searchField = () => screen.queryByPlaceholderText(SEARCH_FIELD);

describe('AdminSearchProvider: Ctrl/Cmd+K right after closing (Admin search on Statistics)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('opens a fresh search while the last one is still shrinking away, and typing goes into it', () => {
        renderWithPageField();
        const pageField = screen.getByLabelText('Träger oder Beratungsstelle');

        pageField.focus();
        pressCmdK();
        expect(searchField()).not.toBeNull();

        // Esc starts the shrink animation (~420 ms); the view is still in the DOM.
        fireEvent.keyDown(searchField() as HTMLElement, { key: 'Escape' });
        expect(document.querySelector('[data-admin-search]')?.className).toContain('closing');

        // Cmd+K pressed during that animation used to be swallowed: the search closed and the
        // following keystrokes landed in the page's own filter field.
        pressCmdK();
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        const field = searchField();
        expect(field).not.toBeNull();
        expect(document.querySelector('[data-admin-search]')?.className ?? '').not.toContain('closing');
        expect(document.activeElement).toBe(field);
    });

    it('still returns focus to the page field when the reopened search closes', () => {
        renderWithPageField();
        const pageField = screen.getByLabelText('Träger oder Beratungsstelle');

        pageField.focus();
        pressCmdK();
        fireEvent.keyDown(searchField() as HTMLElement, { key: 'Escape' });
        pressCmdK();
        fireEvent.keyDown(searchField() as HTMLElement, { key: 'Escape' });
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(searchField()).toBeNull();
        expect(document.activeElement).toBe(pageField);
    });
});
