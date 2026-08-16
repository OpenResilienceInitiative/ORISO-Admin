import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { M3FabMenu, type M3FabMenuProps } from './M3FabMenu';

const items = [
    { key: 'settings', label: 'Einstellungen', to: '/admin/settings' },
    { key: 'tenants', label: 'Träger', to: '/admin/tenants' },
];

const LocationProbe = () => <output data-testid="location">{useLocation().pathname}</output>;

const Harness = (props: Partial<M3FabMenuProps>) => {
    const [open, setOpen] = useState(false);

    return (
        <MemoryRouter>
            <M3FabMenu
                items={items}
                activeKey="settings"
                openLabel="Menü öffnen"
                closeLabel="Menü schließen"
                {...props}
                open={open}
                onOpenChange={setOpen}
            />
        </MemoryRouter>
    );
};

describe('M3FabMenu', () => {
    it('opens an action stack downward when there is not enough room above the toggle', () => {
        const rect = (values: Partial<DOMRect>): DOMRect =>
            ({
                bottom: 0,
                height: 0,
                left: 0,
                right: 0,
                top: 0,
                width: 0,
                x: 0,
                y: 0,
                toJSON: () => ({}),
                ...values,
            } as DOMRect);
        const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
        getBoundingClientRect.mockImplementation(function getElementBoundingClientRect() {
            if (this instanceof HTMLUListElement) return rect({ height: 300 });
            if (this instanceof HTMLButtonElement) return rect({ top: 100, bottom: 156 });
            return rect({});
        });

        render(
            <MemoryRouter>
                <M3FabMenu
                    items={items}
                    open
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                    variant="action"
                    onOpenChange={vi.fn()}
                />
            </MemoryRouter>,
        );

        expect(screen.getByRole('list').parentElement?.className).toContain('openDownward');
        getBoundingClientRect.mockRestore();
    });

    it('keeps the destinations out of the tree until the menu is opened', async () => {
        render(<Harness />);

        expect(screen.queryByRole('link', { name: 'Träger' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }));

        expect(screen.getByRole('link', { name: 'Träger' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Menü schließen' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('marks the destination you are on', async () => {
        render(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }));

        expect(screen.getByRole('link', { name: 'Einstellungen' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'Träger' })).not.toHaveAttribute('aria-current');
    });

    // Escape must work from anywhere in the menu, not only while the FAB itself
    // has focus — that is why the listener sits on the document.
    it('closes on Escape and returns focus to the toggle', async () => {
        render(<Harness />);
        const toggle = screen.getByRole('button', { name: 'Menü öffnen' });
        await userEvent.click(toggle);

        await userEvent.keyboard('{Escape}');

        expect(screen.queryByRole('link', { name: 'Träger' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Menü öffnen' })).toHaveFocus();
    });

    it('reports the selection and closes', async () => {
        const onSelect = vi.fn();
        render(<Harness onSelect={onSelect} />);
        await userEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }));

        await userEvent.click(screen.getByRole('link', { name: 'Träger' }));

        expect(onSelect).toHaveBeenCalledWith('tenants');
        expect(screen.queryByRole('link', { name: 'Träger' })).not.toBeInTheDocument();
    });

    it('blocks open action items while a mutation is pending', async () => {
        const onSelect = vi.fn();
        render(
            <MemoryRouter initialEntries={['/start']}>
                <M3FabMenu
                    items={[...items, { key: 'plain', label: 'Aktion' }]}
                    open
                    openLabel="Menü öffnen"
                    closeLabel="Menü schließen"
                    variant="action"
                    disabled
                    onOpenChange={vi.fn()}
                    onSelect={onSelect}
                />
                <LocationProbe />
            </MemoryRouter>,
        );

        const link = screen.getByRole('link', { name: 'Träger' });
        expect(link).toHaveAttribute('aria-disabled', 'true');
        expect(link).toHaveAttribute('tabindex', '-1');
        expect(screen.getByTestId('location')).toHaveTextContent('/start');
        await userEvent.click(link);
        expect(onSelect).not.toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent('/start');
        link.focus();
        await userEvent.keyboard('{Enter}');
        expect(onSelect).not.toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent('/start');
        expect(screen.getByRole('button', { name: 'Aktion' })).toBeDisabled();
    });

    it('renders account entries after the destinations', async () => {
        render(<Harness footerItems={[{ key: 'logout', label: 'Abmelden' }]} />);
        await userEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }));

        const entries = screen.getAllByRole('listitem').map((item) => item.textContent);

        expect(entries).toEqual(['Einstellungen', 'Träger', 'Abmelden']);
    });
});
