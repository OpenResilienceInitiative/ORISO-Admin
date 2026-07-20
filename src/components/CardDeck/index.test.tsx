import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardDeck } from './index';

const renderDeck = (children = ['One', 'Two', 'Three']) =>
    render(
        <CardDeck ariaLabel="Admin cards" previousLabel="Previous card" nextLabel="Next card">
            {children.map((label) => (
                <CardDeck.Item key={label}>
                    <div>{label}</div>
                </CardDeck.Item>
            ))}
        </CardDeck>,
    );

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

    it('only renders the side-scroll footer for multi-card decks', () => {
        const { container, rerender } = renderDeck(['One']);

        expect(container.querySelector('[data-admin-card-deck-footer]')).not.toBeInTheDocument();

        rerender(
            <CardDeck ariaLabel="Admin cards" previousLabel="Previous card" nextLabel="Next card">
                <CardDeck.Item>
                    <div>One</div>
                </CardDeck.Item>
                <CardDeck.Item>
                    <div>Two</div>
                </CardDeck.Item>
            </CardDeck>,
        );

        expect(container.querySelector('[data-admin-card-deck-footer]')).toBeInTheDocument();
    });

    it('uses semantic region, list, listitem and footer navigation markup', () => {
        renderDeck();

        const region = screen.getByRole('region', { name: 'Admin cards' });
        const scrollGroup = screen.getByRole('group', { name: 'Admin cards' });
        const list = screen.getByRole('list', { name: 'Admin cards' });
        const footerNavigation = screen.getByRole('navigation', { name: 'Admin cards Navigation' });
        const nextButton = screen.getByRole('button', { name: 'Next card' });

        expect(region).toContainElement(scrollGroup);
        expect(scrollGroup).toContainElement(list);
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        expect(footerNavigation).toContainElement(nextButton);
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
