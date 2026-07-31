import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MoreMenuSheet, type MoreMenuSheetGroup } from './MoreMenuSheet';

const groups: MoreMenuSheetGroup[] = [
    {
        label: 'Bereiche',
        activeKey: 'settings',
        entries: [
            { key: 'settings', label: 'Einstellungen' },
            { key: 'tenants', label: 'Träger' },
            { key: 'logs', label: 'Aktivitäts-Logs' },
        ],
    },
    {
        label: 'Sektionen',
        activeKey: 'legal',
        entries: [
            { key: 'legal', label: 'Rechtliches' },
            { key: 'smtp', label: 'E-Mail-Server' },
        ],
    },
];

const renderSheet = (props: Partial<React.ComponentProps<typeof MoreMenuSheet>> = {}) =>
    render(
        <MemoryRouter>
            <MoreMenuSheet
                ariaLabel="Weitere Bereiche"
                closeLabel="Menü schließen"
                groups={groups}
                onClose={vi.fn()}
                open
                {...props}
            />
        </MemoryRouter>,
    );

describe('MoreMenuSheet', () => {
    it('renders nothing while closed', () => {
        renderSheet({ open: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('mounts outside the bar so the fixed bottom bar cannot clip it', () => {
        const { container } = renderSheet();

        // Nothing lands in the component's own container — it all goes to body.
        expect(container).toBeEmptyDOMElement();
        expect(document.body).toContainElement(screen.getByRole('dialog'));
    });

    it('lists every destination, including the ones already in the bar', () => {
        renderSheet();

        ['Einstellungen', 'Träger', 'Aktivitäts-Logs'].forEach((label) => {
            expect(screen.getByText(label)).toBeInTheDocument();
        });
    });

    it('marks the current entry of each group', () => {
        renderSheet();

        const current = screen.getAllByRole('button', { current: 'page' });

        expect(current.map((entry) => entry.textContent)).toEqual(['Einstellungen', 'Rechtliches']);
    });

    it('drops empty groups instead of rendering a bare heading', () => {
        renderSheet({ groups: [groups[0], { label: 'Sektionen', entries: [] }] });

        expect(screen.queryByText('Sektionen')).not.toBeInTheDocument();
    });

    it('reports the chosen entry and closes', async () => {
        const onClose = vi.fn();
        const onSelect = vi.fn();
        renderSheet({ onClose, onSelect });

        await userEvent.click(screen.getByText('Träger'));

        expect(onSelect).toHaveBeenCalledWith('tenants');
        expect(onClose).toHaveBeenCalled();
    });

    it('closes on the scrim and on Escape', async () => {
        const onClose = vi.fn();
        renderSheet({ onClose });

        await userEvent.click(screen.getByRole('button', { name: 'Menü schließen' }));
        expect(onClose).toHaveBeenCalledTimes(1);

        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('moves focus to the first entry, not to the scrim, when it opens', () => {
        renderSheet();

        expect(screen.getByRole('button', { name: 'Einstellungen' })).toHaveFocus();
    });

    it('keeps Tab inside the sheet and never lands on the scrim', async () => {
        renderSheet();

        const entries = screen.getAllByRole('button').filter((entry) => entry.textContent !== '');
        entries[entries.length - 1].focus();

        await userEvent.tab();

        expect(entries[0]).toHaveFocus();
        expect(screen.getByRole('button', { name: 'Menü schließen' })).not.toHaveFocus();
    });
});
