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
        expect(screen.getByLabelText('Editor', { hidden: true })).not.toBeVisible();
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

    it('opens and closes with Enter and Space', async () => {
        renderTile();
        const header = screen.getByRole('button', { name: /Impressum/ });
        header.focus();
        await userEvent.keyboard('{Enter}');
        expect(header).toHaveAttribute('aria-expanded', 'true');
        await userEvent.keyboard(' ');
        expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('points the header at its body and starts open on request', () => {
        renderTile(true);
        const header = screen.getByRole('button', { name: /Impressum/ });
        expect(header).toHaveAttribute('aria-expanded', 'true');
        expect(document.getElementById(header.getAttribute('aria-controls') ?? '')).toContainElement(
            screen.getByLabelText('Editor'),
        );
    });

    it('renders no chip without a status', () => {
        render(
            <CollapsibleTile icon={<span />} title="Impressum">
                <span />
            </CollapsibleTile>,
        );
        expect(screen.getByRole('button', { name: 'Impressum' })).toBeInTheDocument();
    });

    describe('icon slide when folding (Frank, 2026-11-24)', () => {
        // jsdom lays out nothing: the icon "moves" 100px between the open and the folded layout.
        const isOpen = (element: HTMLElement) => !!element.closest('section')?.className.includes('open');
        const fakeLayout = () => {
            vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function left(this: HTMLElement) {
                return isOpen(this) ? 100 : 0;
            });
            vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function top(this: HTMLElement) {
                return isOpen(this) ? 0 : 20;
            });
            // What a running slide reports: the transformed position. It must never be the start of a slide.
            vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
                left: 999,
                top: 999,
                width: 32,
                height: 32,
            } as DOMRect);
        };
        const reducedMotion = (reduce: boolean) =>
            vi
                .spyOn(window, 'matchMedia')
                .mockImplementation(
                    (query: string) => ({ matches: reduce && query.includes('reduce') } as MediaQueryList),
                );

        it('slides icon and title from their old place', async () => {
            const user = userEvent.setup();
            fakeLayout();
            reducedMotion(false);
            const animate = vi.fn();
            Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true });
            renderTile(true);

            await user.click(screen.getByRole('button', { name: /Impressum/ }));

            expect(animate).toHaveBeenCalledTimes(2);
            expect(animate.mock.calls[0][0][0]).toEqual({ transform: 'translate(100px, -20px)' });
            vi.restoreAllMocks();
            delete (HTMLElement.prototype as { animate?: unknown }).animate;
        });

        it('folds and reopens with a full slide each way, even while a slide is still running', async () => {
            const user = userEvent.setup();
            fakeLayout();
            reducedMotion(false);
            const animate = vi.fn();
            Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true });
            renderTile(true);
            const header = screen.getByRole('button', { name: /Impressum/ });

            await user.click(header);
            await user.click(header);

            expect(animate).toHaveBeenCalledTimes(4);
            expect(animate.mock.calls[0][0][0]).toEqual({ transform: 'translate(100px, -20px)' });
            expect(animate.mock.calls[2][0][0]).toEqual({ transform: 'translate(-100px, 20px)' });
            vi.restoreAllMocks();
            delete (HTMLElement.prototype as { animate?: unknown }).animate;
        });

        it('just jumps with reduced motion', async () => {
            const user = userEvent.setup();
            fakeLayout();
            reducedMotion(true);
            const animate = vi.fn();
            Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true });
            renderTile(true);

            await user.click(screen.getByRole('button', { name: /Impressum/ }));

            expect(animate).not.toHaveBeenCalled();
            vi.restoreAllMocks();
            delete (HTMLElement.prototype as { animate?: unknown }).animate;
        });
    });
});
