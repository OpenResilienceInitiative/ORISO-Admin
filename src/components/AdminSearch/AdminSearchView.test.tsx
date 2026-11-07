import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import '../../i18n';
import { AdminSearchView } from './AdminSearchView';
import { buildFixtureIndex } from './searchFixtures';
import { clearRecentSearches } from './recentSearches';

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

        await user.keyboard('{Enter}');

        expect(onOpen.mock.calls[0][0].id).not.toBe('');
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

        await waitFor(() => expect(screen.getByRole('button', { name: /^Tenants\s*1/ })).toBeTruthy());
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
