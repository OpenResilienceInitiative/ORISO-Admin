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
    /**
     * Width class of this rail position (Figma 1285-80497):
     * `narrow` (~392px) is a self-contained logical container — a short list,
     * a toggle, an explanation; `wide` (~820px) carries a form or an editor,
     * whose fields then flow into up to three columns instead of growing the
     * card downwards. `bare` is a narrow position without a card surface, used
     * by the go-live status so it reads as scoping the rail rather than being
     * one of its cards.
     */
    width?: 'narrow' | 'wide' | 'bare';
}

const SCROLL_EPSILON = 8;
/** Mirrors the `@media (max-width: 767px)` stacking rule in the stylesheet. */
const MOBILE_BREAKPOINT = 768;

const readListGap = (deck: HTMLElement) => {
    const list = deck.querySelector('[data-admin-card-deck-list]');
    const computedStyle = window.getComputedStyle(list ?? deck);
    const parsedGap = Number.parseFloat(computedStyle.columnGap || computedStyle.gap);

    return Number.isFinite(parsedGap) ? parsedGap : 24;
};

const CardDeckItem = ({ children, className, width = 'narrow' }: CardDeckItemProps) => (
    <li
        className={classNames(styles.item, styles[width], className)}
        data-admin-card-deck-item
        data-admin-card-deck-item-width={width}
    >
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
        // Cards stay on ONE horizontal rail on every desktop width and are reached
        // by scrolling sideways (Frank, design review 2026-08-20) — the rail carries
        // header arrows and position dots, so an off-screen card is discoverable.
        // This deliberately replaces the #568 fallback, which stacked as soon as two
        // cards no longer fit and therefore pushed wide cards under each other.
        // Below the mobile breakpoint the stylesheet stacks; JS mirrors the same
        // threshold so the scroll footer disappears with it.
        const stacked = window.innerWidth < MOBILE_BREAKPOINT;

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
