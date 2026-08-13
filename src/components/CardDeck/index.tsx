import classNames from 'classnames';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
    });

    const updateScrollState = useCallback(() => {
        const deck = deckRef.current;

        if (!deck) {
            return;
        }

        const maxScrollLeft = Math.max(0, deck.scrollWidth - deck.clientWidth);
        const nextState = {
            canScrollBackward: deck.scrollLeft > SCROLL_EPSILON,
            canScrollForward: deck.scrollLeft < maxScrollLeft - SCROLL_EPSILON,
        };

        setScrollState((currentState) =>
            currentState.canScrollBackward === nextState.canScrollBackward &&
            currentState.canScrollForward === nextState.canScrollForward
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

            const list = deck.querySelector('[data-admin-card-deck-list]');
            const computedStyle = window.getComputedStyle(list ?? deck);
            const parsedGap = Number.parseFloat(computedStyle.columnGap || computedStyle.gap);
            const gap = Number.isFinite(parsedGap) ? parsedGap : 24;
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
        <section className={classNames(styles.root, className)} aria-label={ariaLabel} data-admin-card-deck>
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
        </section>
    );
};

export const CardDeck = Object.assign(CardDeckRoot, { Item: CardDeckItem });
