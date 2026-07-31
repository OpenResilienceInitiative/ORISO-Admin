import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { M3NavigationBar, type M3NavigationBarItem } from './M3NavigationBar';

const items: M3NavigationBarItem[] = [
    { key: 'settings', label: 'Einstellungen', icon: <svg />, activeIcon: <svg data-testid="settings-filled" /> },
    { key: 'tenants', label: 'Träger', icon: <svg /> },
];

const renderBar = (props: Partial<React.ComponentProps<typeof M3NavigationBar>> = {}) =>
    render(
        <MemoryRouter>
            <M3NavigationBar ariaLabel="Hauptnavigation" items={items} activeKey="settings" {...props} />
        </MemoryRouter>,
    );

describe('M3NavigationBar', () => {
    it('marks only the active destination with aria-current', () => {
        renderBar();

        expect(screen.getByText('Einstellungen').closest('[aria-current]')).not.toBeNull();
        expect(screen.getByText('Träger').closest('[aria-current]')).toBeNull();
    });

    it('renders the filled icon variant for the active destination only', () => {
        renderBar();

        expect(screen.getByTestId('settings-filled')).toBeInTheDocument();
    });

    it('reports the selected key', async () => {
        const onSelect = vi.fn();
        renderBar({ onSelect });

        await userEvent.click(screen.getByText('Träger'));

        expect(onSelect).toHaveBeenCalledWith('tenants');
    });

    it('renders destinations with a route as links', () => {
        renderBar({ items: [{ ...items[0], to: '/admin/settings' }] });

        expect(screen.getByRole('link', { name: /Einstellungen/ })).toHaveAttribute('href', '/admin/settings');
    });

    it('exposes the overflow slot as a collapsed menu button', async () => {
        const onClick = vi.fn();
        renderBar({ more: { label: 'Mehr', icon: <svg />, onClick } });

        const moreButton = screen.getByRole('button', { name: /Mehr/ });

        expect(moreButton).toHaveAttribute('aria-haspopup', 'menu');
        expect(moreButton).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(moreButton);

        expect(onClick).toHaveBeenCalled();
    });

    it('omits the overflow slot when every destination fits', () => {
        renderBar();

        expect(screen.queryByRole('button', { name: /Mehr/ })).not.toBeInTheDocument();
    });
});
