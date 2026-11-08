import { describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleTile } from './index';

const renderTile = (defaultOpen = false) =>
    render(
        <CollapsibleTile icon={<span />} title="Impressum" status="Veröffentlicht" defaultOpen={defaultOpen}>
            <input aria-label="Editor" defaultValue="" />
        </CollapsibleTile>,
    );

describe('CollapsibleTile', () => {
    it('stays folded and does not mount its body until it is opened', async () => {
        renderTile();
        const header = screen.getByRole('button', { name: /Impressum/ });
        expect(header).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByLabelText('Editor')).toBeNull();
        await userEvent.click(header);
        expect(header).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByLabelText('Editor')).toBeVisible();
    });

    it('keeps an unsaved draft when the tile is folded up again', async () => {
        renderTile(true);
        await userEvent.type(screen.getByLabelText('Editor'), 'Entwurf');
        await userEvent.click(screen.getByRole('button', { name: /Impressum/ }));
        await userEvent.click(screen.getByRole('button', { name: /Impressum/ }));
        expect(screen.getByLabelText('Editor')).toHaveValue('Entwurf');
    });

    it('reports every toggle, so a parent that rebuilds the tile can keep it open', async () => {
        const onOpenChange = vi.fn();
        render(
            <CollapsibleTile icon={<span />} title="Impressum" onOpenChange={onOpenChange}>
                <input aria-label="Editor" />
            </CollapsibleTile>,
        );
        const header = screen.getByRole('button', { name: /Impressum/ });
        await userEvent.click(header);
        await userEvent.click(header);
        expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
    });

    it('names its state in the header', () => {
        renderTile();
        expect(screen.getByRole('button', { name: /Veröffentlicht/ })).toBeInTheDocument();
    });
});
