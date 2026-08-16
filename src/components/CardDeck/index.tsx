import classNames from 'classnames';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { SideScrollerDots } from '../SideScrollerFooter';
import { useRegisterCardDeckNav } from './CardDeckNavContext';
import styles from './styles.module.scss';

interface CardDeckProps {
    ariaLabel: string;
    children?: React.ReactNode;
    className?: string;
    deckClassName?: string;
    nextLabel: string;
    previousLabel: string;
}

interface CardDeckItemProps {
    children?: React.ReactNode;
    className?: string;
}

const SCROLL_EPSILON = 8;
const DEFAULT_ITEM_WIDTH = 392;

const readListGap = (deck: HTMLElement) => {
    const list = deck.querySelector('[data-admin-card-deck-list]');
    const computedStyle = window.getComputedStyle(list ?? deck);
    const parsedGap = Number.parseFloat(computedStyle.columnGap || computedStyle.gap);

    return Number.isFinite(parsedGap) ? parsedGap : 24;
};

const CardDeckItem = ({ children, className }: CardDeckItemProps) => (
    <li className={classNames(styles.item, className)} data-admin-card-deck-item>
        {children}
    </li>
);

const CardDeckRoot = ({ ariaLabel, children, className, deckClassName, nextLabel, previousLabel }: CardDeckProps) => {
    const deckId = useId();
    const deckRef = useRef<HTMLDivElement>(null);
    const cards = useMemo(() => React.Children.toArray(children).filter(Boolean), [children]);
    const [scrollState, setScrollState] = useState({
        canScrollBackward: false,
        canScrollForward: false,
        firstVisibleCard: 0,
        stacked: false,
        visibleCardCount: 1,
    });

    const updateScrollState = useCallback(() => {
        const deck = deckRef.current;

        if (!deck) {
            return;
        }

        const gap = readListGap(deck);
        const cardElements = deck.querySelectorAll('[data-admin-card-deck-item]');
        const firstCard = cardElements[0] as HTMLElement | undefined;
        // The token width, not the rendered width: in stacked mode a card is as
        // wide as the deck, which would keep the deck stacked forever.
        const parsedItemWidth = Number.parseFloat(
            window.getComputedStyle(deck).getPropertyValue('--card-deck-item-width'),
        );
        const itemWidth = Number.isFinite(parsedItemWidth) ? parsedItemWidth : DEFAULT_ITEM_WIDTH;
        // #568: a horizontal scroller with room for a single card hides every
        // other card — fall back to the vertical stack instead.
        const stacked = cardElements.length > 1 && deck.clientWidth > 0 && deck.clientWidth < itemWidth * 2 + gap;

        const cardStep = firstCard ? firstCard.offsetWidth + gap : 0;
        const maxScrollLeft = Math.max(0, deck.scrollWidth - deck.clientWidth);
        const firstVisibleCard =
            cardStep > 0
                ? Math.min(Math.max(cardElements.length - 1, 0), Math.max(0, Math.round(deck.scrollLeft / cardStep)))
                : 0;
        const visibleCardCount =
            cardStep > 0 ? Math.max(1, Math.floor((deck.clientWidth + gap) / cardStep)) : cardElements.length;

        const nextState = {
            canScrollBackward: !stacked && deck.scrollLeft > SCROLL_EPSILON,
            canScrollForward: !stacked && deck.scrollLeft < maxScrollLeft - SCROLL_EPSILON,
            firstVisibleCard,
            stacked,
            visibleCardCount,
        };

        setScrollState((currentState) =>
            currentState.canScrollBackward === nextState.canScrollBackward &&
            currentState.canScrollForward === nextState.canScrollForward &&
            currentState.firstVisibleCard === nextState.firstVisibleCard &&
            currentState.stacked === nextState.stacked &&
            currentState.visibleCardCount === nextState.visibleCardCount
                ? currentState
                : nextState,
        );
    }, []);

    const scrollCards = useCallback(
        (direction: -1 | 1) => {
            const deck = deckRef.current;

            if (!deck) {
                return;
            }

            const gap = readListGap(deck);
            const firstCard = deck.querySelector('[data-admin-card-deck-item]') as HTMLElement | null;
            const cardStep = firstCard ? firstCard.offsetWidth + gap : deck.clientWidth * 0.86;

            deck.scrollBy({
                left: direction * Math.min(cardStep, deck.clientWidth * 0.9),
                behavior: 'smooth',
            });
            window.setTimeout(updateScrollState, 260);
        },
        [updateScrollState],
    );

    useEffect(() => {
        const deck = deckRef.current;

        if (!deck) {
            return;
        }

        deck.scrollTo({ left: 0 });
        updateScrollState();
    }, [cards.length, updateScrollState]);

    useEffect(() => {
        const deck = deckRef.current;
        const initialCheck = window.setTimeout(updateScrollState, 0);
        const settledCheck = window.setTimeout(updateScrollState, 250);

        if (!deck) {
            return () => {
                window.clearTimeout(initialCheck);
                window.clearTimeout(settledCheck);
            };
        }

        updateScrollState();
        const resizeObserver =
            typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : undefined;

        resizeObserver?.observe(deck);
        Array.from(deck.querySelectorAll('[data-admin-card-deck-item]')).forEach((child) =>
            resizeObserver?.observe(child),
        );
        deck.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);

        return () => {
            window.clearTimeout(initialCheck);
            window.clearTimeout(settledCheck);
            resizeObserver?.disconnect();
            deck.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [cards.length, updateScrollState]);

    // The arrows live in the sticky page header, not under the cards — down here
    // they collided with the cards' own footer actions and toasts (Figma 1285-80496).
    const navRegistration = useMemo(
        () =>
            cards.length > 1
                ? {
                      canScrollBackward: scrollState.canScrollBackward,
                      canScrollForward: scrollState.canScrollForward,
                      controlsId: deckId,
                      nextLabel,
                      previousLabel,
                      scroll: scrollCards,
                  }
                : null,
        [
            cards.length,
            deckId,
            nextLabel,
            previousLabel,
            scrollCards,
            scrollState.canScrollBackward,
            scrollState.canScrollForward,
        ],
    );

    useRegisterCardDeckNav(deckId, navRegistration);

    return (
        <section
            className={classNames(styles.root, { [styles.stacked]: scrollState.stacked }, className)}
            aria-label={ariaLabel}
            data-admin-card-deck
            data-admin-card-deck-stacked={scrollState.stacked || undefined}
        >
            <div
                id={deckId}
                className={classNames(styles.deck, deckClassName)}
                ref={deckRef}
                aria-label={ariaLabel}
                data-admin-card-deck-scroll
                role="group"
            >
                <ul className={styles.list} aria-label={ariaLabel} data-admin-card-deck-list>
                    {cards}
                </ul>
            </div>
            {cards.length > 1 && !scrollState.stacked && (
                <SideScrollerDots
                    className={styles.dots}
                    cardCount={cards.length}
                    firstVisibleCard={scrollState.firstVisibleCard}
                    visibleCardCount={scrollState.visibleCardCount}
                />
            )}
        </section>
    );
};

export const CardDeck = Object.assign(CardDeckRoot, { Item: CardDeckItem });
