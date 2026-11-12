import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import i18n from '../../i18n';
import { AdminSearchView } from './AdminSearchView';
import { buildFixtureIndex } from './searchFixtures';
import { clearRecentSearches, rememberSearch } from './recentSearches';

const index = buildFixtureIndex({ role: 'platform', language: 'en', singleDomain: false });

const setup = (props: Partial<Parameters<typeof AdminSearchView>[0]> = {}) => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const onQueryChange = vi.fn();
    const user = userEvent.setup();

    render(
        <MemoryRouter>
            <AdminSearchView
                index={index}
                onOpen={onOpen}
                onClose={onClose}
                onQueryChange={onQueryChange}
                variant="inline"
                recent={[]}
                {...props}
            />
        </MemoryRouter>,
    );

    return { user, onOpen, onClose, onQueryChange, input: screen.getByRole('combobox') };
};

beforeEach(() => {
    clearRecentSearches();
    window.localStorage.clear();
});

describe('AdminSearchView', () => {
    it('finds a German word in an English UI and opens the best hit with Enter', async () => {
        const { user, input, onOpen } = setup();

        await user.type(input, 'Impressum');
        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0));
        await user.keyboard('{Enter}');

        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onOpen.mock.calls[0][0].id).toMatch(/^legal:imprint/);
        expect(onOpen.mock.calls[0][1]).toBe('Impressum');
    });

    it('moves with the arrow keys and exposes the active option for screen readers', async () => {
        const { user, input, onOpen } = setup();

        await user.type(input, 'mail');
        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1));
        const first = input.getAttribute('aria-activedescendant');

        await user.keyboard('{ArrowDown}');

        expect(input.getAttribute('aria-activedescendant')).not.toBe(first);
        expect(input.getAttribute('aria-activedescendant')).toBeTruthy();

        // Enter opens the option the cursor is on, not just any result.
        const active = document.getElementById(input.getAttribute('aria-activedescendant') as string);

        await user.keyboard('{Enter}');

        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(active?.textContent).toContain(onOpen.mock.calls[0][0].title);
    });

    it('closes with Escape', async () => {
        const { user, input, onClose } = setup();

        await user.click(input);
        await user.keyboard('{Escape}');

        expect(onClose).toHaveBeenCalled();
    });

    it('shrinks back into its button before it reports closed (overlay with origin)', async () => {
        const { user, input, onClose } = setup({ variant: 'overlay', origin: { x: 350, y: 740 } });
        const root = document.querySelector('[data-admin-search]') as HTMLElement;

        expect(root.style.getPropertyValue('--search-origin-x')).toBe('350px');
        await user.click(input);
        await user.keyboard('{Escape}');

        expect(onClose).not.toHaveBeenCalled();
        expect(root.className).toContain('closing');

        fireEvent.animationEnd(root);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('opens a result right away and then shrinks away', async () => {
        const { user, input, onOpen, onClose } = setup({ variant: 'overlay', origin: { x: 10, y: 10 } });

        await user.type(input, 'Impressum');
        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0));
        await user.keyboard('{Enter}');

        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.animationEnd(document.querySelector('[data-admin-search]') as HTMLElement);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes with the shortcut that opens it', async () => {
        const { user, input, onClose } = setup();

        await user.click(input);
        await user.keyboard('{Control>}k{/Control}');

        expect(onClose).toHaveBeenCalled();
    });

    it('counts entity rows in the type chips', async () => {
        const { user, input } = setup({
            entityDocs: [
                {
                    id: 'tenant:1',
                    kind: 'tenant',
                    title: 'Springfield QA',
                    breadcrumb: ['Tenants', 'Springfield QA'],
                    to: '/admin/tenants/1/general',
                    level: 'tenant',
                    terms: { title: ['Springfield QA'], fields: [], synonyms: [], description: [], context: [] },
                },
            ],
        });

        await user.type(input, 'springfield');

        await waitFor(() => expect(screen.getByRole('button', { name: /^Providers\s*1/ })).toBeTruthy());
    });

    describe('one search for the whole admin (lists have no search field of their own)', () => {
        const tenantDoc = {
            id: 'tenant:1',
            kind: 'tenant' as const,
            title: 'Springfield QA',
            breadcrumb: ['Tenants', 'Springfield QA'],
            to: '/admin/tenants/1/general',
            level: 'tenant' as const,
            terms: { title: ['Springfield QA'], fields: [], synonyms: [], description: [], context: [] },
        };

        it('offers one chip row only: the type, no second "level" row that repeats Träger', async () => {
            const { user, input } = setup({ entityDocs: [tenantDoc] });

            await user.type(input, 'springfield');

            await waitFor(() => expect(screen.getByRole('button', { name: /^Providers\s*1/ })).toBeTruthy());
            expect(screen.queryByText('Level')).toBeNull();
            expect(screen.queryByRole('button', { name: 'Platform' })).toBeNull();
            expect(screen.getByText('Show only')).toBeTruthy();
        });

        it('opens the Träger list narrowed to the query from "Show all matches in the list"', async () => {
            const onOpenList = vi.fn();
            const { user, input, onClose } = setup({ entityDocs: [tenantDoc], onOpenList });

            await user.type(input, 'springfield');
            await user.click(await screen.findByRole('option', { name: 'Show all matches in the list' }));

            expect(onOpenList).toHaveBeenCalledWith('tenants', 'springfield');
            expect(onClose).toHaveBeenCalled();
        });

        it('reaches the list row with the arrow keys and opens it with Enter', async () => {
            const onOpenList = vi.fn();
            const { user, input } = setup({ entityDocs: [tenantDoc], onOpenList });

            await user.type(input, 'springfield');
            await screen.findByRole('option', { name: 'Show all matches in the list' });
            const options = screen.getAllByRole('option');
            const listIndex = options.findIndex((option) => option.dataset.listRow === 'tenants');
            const activeIndex = options.findIndex((option) => option.getAttribute('aria-selected') === 'true');
            await user.keyboard(`${'{ArrowDown}'.repeat(listIndex - activeIndex)}{Enter}`);

            expect(onOpenList).toHaveBeenCalledWith('tenants', 'springfield');
        });

        it('shows no list row without a list handler', async () => {
            const { user, input } = setup({ entityDocs: [tenantDoc] });

            await user.type(input, 'springfield');

            await screen.findByRole('option', { name: /Springfield QA/ });
            expect(screen.queryByRole('option', { name: 'Show all matches in the list' })).toBeNull();
        });
    });

    // Found in review: the entity fetch trails the typing, so the rows of the previous query were still
    // offered as "matched by the server" for the new one.
    describe('rows the server matched by something the index does not hold', () => {
        const byEmail = {
            id: 'account:consultants:7',
            kind: 'account' as const,
            title: 'Springfield Contact',
            breadcrumb: ['Accounts', 'Springfield Contact'],
            to: '/admin/users/consultants/7',
            level: 'agency' as const,
            terms: { title: ['Springfield Contact'], fields: [], synonyms: [], description: [], context: [] },
        };

        it('keeps them while the rows belong to the typed query', async () => {
            const { user, input } = setup({ entityDocs: [byEmail], entityQuery: 'zzqx' });

            await user.type(input, 'zzqx');

            await waitFor(() => expect(screen.getByText('Springfield Contact')).toBeTruthy());
        });

        it('drops them as soon as the typed query is no longer the one they were fetched for', async () => {
            const { user, input } = setup({ entityDocs: [byEmail], entityQuery: 'anna' });

            await user.type(input, 'zzqx');

            expect(screen.queryByText('Springfield Contact')).toBeNull();
        });

        it('treats rows without a query as current (stories)', async () => {
            const { user, input } = setup({ entityDocs: [byEmail] });

            await user.type(input, 'zzqx');

            await waitFor(() => expect(screen.getByText('Springfield Contact')).toBeTruthy());
        });
    });

    // Found in review: the entity rows trail the typing, and "Nothing found" flashed up meanwhile.
    describe('while the entity rows have not caught up with the typing', () => {
        it('neither says "Nothing found" nor announces zero results', async () => {
            const { user, input } = setup({ entityDocs: [], entityQuery: 'old' });

            await user.type(input, 'xqzvwk');

            expect(screen.queryByText(/Nothing found/)).toBeNull();
            expect(screen.getByRole('progressbar')).toBeTruthy();
            expect(screen.getByRole('status').textContent).toBe('');
        });

        it('says so once the rows belong to the typed query', async () => {
            const { user, input } = setup({ entityDocs: [], entityQuery: 'xqzvwk' });

            await user.type(input, 'xqzvwk');

            await waitFor(() => expect(screen.getByText(/Nothing found/)).toBeTruthy());
            expect(screen.queryByRole('progressbar')).toBeNull();
        });

        it('says so while a request is running too', async () => {
            const { user, input } = setup({ loadingEntities: true });

            await user.type(input, 'xqzvwk');

            expect(screen.queryByText(/Nothing found/)).toBeNull();
        });
    });

    // Found in review: a failed list dropped out silently and read as "nothing found".
    it('tells the person when a list could not be loaded', async () => {
        const { user, input } = setup({ entitiesFailed: true });

        await user.type(input, 'xqzvwk');

        await waitFor(() => expect(screen.getByText(i18n.t('adminSearch.error.entities'))).toBeTruthy());
    });

    it('does not open a result twice while the layer is shrinking away', async () => {
        const { user, input, onOpen } = setup({ variant: 'overlay', origin: { x: 10, y: 10 } });

        await user.type(input, 'Impressum');
        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0));
        await user.keyboard('{Enter}');
        await user.keyboard('{Enter}');
        await user.click(screen.getAllByRole('option')[0]);

        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    // Found in review: the engine's default cap of 60 cut a broad query short, so the chip counts stopped at
    // 60 and a type whose rows ranked below the best 60 got no chip at all.
    it('counts and offers every type, not only the best 60 hits', async () => {
        const terms = (title: string) => ({ title: [title], fields: [], synonyms: [], description: [], context: [] });
        const pages = Array.from({ length: 70 }, (_, number) => ({
            id: `page:mailbox-${number}`,
            kind: 'page' as const,
            title: `Mailbox ${number}`,
            breadcrumb: ['Pages'],
            to: `/admin/mailbox-${number}`,
            terms: terms(`Mailbox ${number}`),
        }));
        const account = {
            id: 'account:consultants:9',
            kind: 'account' as const,
            title: 'Mailbox Anna',
            breadcrumb: ['Accounts'],
            to: '/admin/users/consultants/9',
            level: 'agency' as const,
            terms: terms('Mailbox Anna'),
        };
        const { user, input } = setup({ index: pages, entityDocs: [account] });

        await user.type(input, 'mailbox');

        await waitFor(() => expect(screen.getByRole('button', { name: /^Pages\s*70/ })).toBeTruthy());
        expect(screen.getByRole('button', { name: /^Accounts\s*1/ })).toBeTruthy();
    });

    it('narrows by type with a filter chip', async () => {
        const { user, input } = setup();

        await user.type(input, 'mail');
        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0));
        const before = screen.getAllByRole('option').length;

        await user.click(screen.getByRole('button', { name: /^Pages/ }));

        await waitFor(() => expect(screen.getAllByRole('option').length).toBeLessThan(before));
        expect(screen.getByRole('button', { name: /^Pages/ }).getAttribute('aria-pressed')).toBe('true');
    });

    // Found in review: Enter on a chip opened the active result instead of toggling the chip.
    it('lets Enter and the arrow keys act on the focused control, not on the result cursor', async () => {
        const { user, input, onOpen } = setup();

        await user.type(input, 'mail');
        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0));
        const cursor = input.getAttribute('aria-activedescendant');

        screen.getByRole('button', { name: /^Pages/ }).focus();
        await user.keyboard('{ArrowDown}');

        expect(input.getAttribute('aria-activedescendant')).toBe(cursor);

        await user.keyboard('{Enter}');

        expect(onOpen).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /^Pages/ }).getAttribute('aria-pressed')).toBe('true');
    });

    // Found by the Storybook accessibility check: a listbox may own only options and groups of options.
    it('keeps the results a valid listbox: groups of options, "Show n more" is an option too', async () => {
        const { user, input, onOpen } = setup();

        await user.type(input, 'mail');
        const more = await screen.findByRole('option', { name: /Show \d+ more/ });
        const listbox = screen.getByRole('listbox');

        // Only groups (named by their label) and options live directly in the list.
        Array.from(listbox.children).forEach((child) => {
            expect(child.getAttribute('role')).toBe('group');
            expect(child.getAttribute('aria-labelledby')).toBeTruthy();
        });
        expect(listbox.querySelector('h1, h2, h3, button')).toBeNull();

        // The arrow keys reach it, Enter shows the rest of the group and does not open anything.
        const before = screen.getAllByRole('option').length;

        const position = screen.getAllByRole('option').indexOf(more);

        await user.keyboard('{ArrowDown}'.repeat(position));
        expect(input.getAttribute('aria-activedescendant')).toBe(more.id);
        await user.keyboard('{Enter}');

        expect(onOpen).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(before));
    });

    it('says so when nothing matches and offers no stale options', async () => {
        const { user, input } = setup();

        await user.type(input, 'xqzvwk');

        await waitFor(() => expect(screen.getByText(/Nothing found/)).toBeTruthy());
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('lists recent searches when empty and runs one on click', async () => {
        const { user, input } = setup({ recent: ['smtp'] });

        await user.click(screen.getByRole('button', { name: 'smtp' }));

        expect((input as HTMLInputElement).value).toBe('smtp');
    });

    // Found in review: the pressed button left the page with its section, and focus fell out of the dialog.
    it('keeps focus in the field after a recent search or a suggestion is used', async () => {
        const first = setup({ recent: ['smtp'] });

        await first.user.click(screen.getByRole('button', { name: 'smtp' }));
        expect(first.input).toHaveFocus();

        await first.user.clear(first.input);
        await first.user.click(screen.getByRole('button', { name: i18n.t('adminSearch.suggestion.1') }));

        expect(first.input).toHaveFocus();
        expect((first.input as HTMLInputElement).value).toBe(i18n.t('adminSearch.suggestion.1'));
    });

    // Found in review: "Reset filters" leaves the page with the empty state, and focus fell to the body.
    it('keeps focus in the field after the filters are reset', async () => {
        const { user, input } = setup({ initialFilters: { kinds: ['tenants'] } });

        await user.type(input, 'smtp');
        await user.click(await screen.findByRole('button', { name: i18n.t('adminSearch.filter.reset') }));

        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0));
        expect(input).toHaveFocus();
    });

    it('keeps focus in the field after a recent search is removed or all are cleared', async () => {
        rememberSearch('smtp');
        rememberSearch('legal');
        const { user, input } = setup({ recent: undefined });

        await user.click(screen.getByRole('button', { name: i18n.t('adminSearch.recent.remove', { query: 'smtp' }) }));
        expect(screen.queryByRole('button', { name: 'smtp' })).not.toBeInTheDocument();
        expect(input).toHaveFocus();

        await user.click(screen.getByRole('button', { name: i18n.t('adminSearch.recent.clear') }));
        expect(screen.queryByRole('button', { name: 'legal' })).not.toBeInTheDocument();
        expect(input).toHaveFocus();
    });

    it('shows read-only for a role that cannot change a setting', async () => {
        const { user, input } = setup({
            index: buildFixtureIndex({ role: 'tenantReadOnly', language: 'en', singleDomain: true }),
        });

        await user.type(input, 'imprint');

        await waitFor(() => expect(screen.getAllByText('Read only').length).toBeGreaterThan(0));
    });

    it('never offers a platform setting to a Träger admin', async () => {
        const { user, input } = setup({
            index: buildFixtureIndex({ role: 'tenant', language: 'en', singleDomain: true }),
        });

        await user.type(input, 'translation');

        await waitFor(() => expect(screen.getByText(/Nothing found/)).toBeTruthy());
    });
});
