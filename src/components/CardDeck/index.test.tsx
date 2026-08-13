import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SideScrollerButton } from '../SideScrollerFooter';
import { CardDeckNavProvider, useCardDeckNav } from './CardDeckNavContext';
import { CardDeck } from './index';

/**
 * Stands in for the arrow rail in the page header (`PageDeckNav`): the deck no
 * longer renders its own footer, it publishes its scroll state and the header
 * drives it from there.
 */
const HeaderNavHarness = () => {
    const nav = useCardDeckNav();

    if (!nav) {
        return null;
    }

    return (
        <nav aria-label="Admin cards Navigation">
            <SideScrollerButton
                controlsId={nav.controlsId}
                direction="backward"
                enabled={nav.canScrollBackward}
                label={nav.previousLabel}
                onClick={() => nav.scroll(-1)}
            />
            <SideScrollerButton
                controlsId={nav.controlsId}
                direction="forward"
                enabled={nav.canScrollForward}
                label={nav.nextLabel}
                onClick={() => nav.scroll(1)}
            />
        </nav>
    );
};

const Harness = ({ children }: { children: React.ReactNode }) => (
    <CardDeckNavProvider>
        <HeaderNavHarness />
        <CardDeck ariaLabel="Admin cards" previousLabel="Previous card" nextLabel="Next card">
            {children}
        </CardDeck>
    </CardDeckNavProvider>
);

const items = (labels: Array<string>) =>
    labels.map((label) => (
        <CardDeck.Item key={label}>
            <div>{label}</div>
        </CardDeck.Item>
    ));

const renderDeck = (labels = ['One', 'Two', 'Three']) => render(<Harness>{items(labels)}</Harness>);

const setElementMetric = (element: Element, property: 'clientWidth' | 'offsetWidth' | 'scrollWidth', value: number) => {
    Object.defineProperty(element, property, {
        configurable: true,
        value,
    });
};

describe('CardDeck', () => {
    const originalGetComputedStyle = window.getComputedStyle;
    let mockedGap = '48px';

    beforeEach(() => {
        mockedGap = '48px';
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
            configurable: true,
            value: vi.fn(),
        });
        window.getComputedStyle = ((element: Element) => {
            const style = originalGetComputedStyle(element);

            if (element.hasAttribute('data-admin-card-deck-list')) {
                return Object.create(style, {
                    columnGap: { value: mockedGap },
                    gap: { value: mockedGap },
                });
            }

            return style;
        }) as typeof window.getComputedStyle;
    });

    afterEach(() => {
        window.getComputedStyle = originalGetComputedStyle;
    });

    it('never renders arrows of its own — they belong to the page header', () => {
        const { container } = renderDeck();

        expect(container.querySelector('[data-admin-card-deck]')?.querySelector('button')).toBeNull();
    });

    it('only registers with the header navigation for multi-card decks', () => {
        const { rerender } = renderDeck(['One']);

        expect(screen.queryByRole('button', { name: 'Next card' })).not.toBeInTheDocument();

        rerender(<Harness>{items(['One', 'Two'])}</Harness>);

        expect(screen.getByRole('button', { name: 'Next card' })).toBeInTheDocument();
    });

    it('uses semantic region, list and listitem markup and wires the header arrows to the scroller', () => {
        renderDeck();

        const region = screen.getByRole('region', { name: 'Admin cards' });
        const scrollGroup = screen.getByRole('group', { name: 'Admin cards' });
        const list = screen.getByRole('list', { name: 'Admin cards' });
        const headerNavigation = screen.getByRole('navigation', { name: 'Admin cards Navigation' });
        const nextButton = screen.getByRole('button', { name: 'Next card' });

        expect(region).toContainElement(scrollGroup);
        expect(scrollGroup).toContainElement(list);
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        expect(region).not.toContainElement(headerNavigation);
        expect(headerNavigation).toContainElement(nextButton);
        expect(nextButton).toHaveAttribute('aria-controls', scrollGroup.id);
    });

    it.each([
        { gap: '48px', expectedStep: 473 },
        { gap: '0px', expectedStep: 425 },
    ])('scrolls by one card step with a $gap gap', async ({ gap, expectedStep }) => {
        mockedGap = gap;
        const user = userEvent.setup();
        const { container } = renderDeck();
        const deck = container.querySelector('[data-admin-card-deck-scroll]');
        const firstCard = deck?.querySelector('[data-admin-card-deck-item]');
        const scrollBy = vi.fn();

        expect(deck).not.toBeNull();
        expect(firstCard).not.toBeNull();

        setElementMetric(deck!, 'clientWidth', 900);
        setElementMetric(deck!, 'scrollWidth', 1400);
        setElementMetric(firstCard!, 'offsetWidth', 425);
        Object.defineProperty(deck, 'scrollBy', {
            configurable: true,
            value: scrollBy,
        });

        act(() => {
            fireEvent.scroll(deck!);
        });

        const nextButton = screen.getByRole('button', { name: 'Next card' });
        await waitFor(() => expect(nextButton).toBeEnabled());
        await user.click(nextButton);

        expect(scrollBy).toHaveBeenCalledWith({
            left: expectedStep,
            behavior: 'smooth',
        });
    });
});
