import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SideScrollerFooter } from '../SideScrollerFooter';
import styles from './styles.module.scss';

interface CardDeckProps {
    ariaLabel: string;
    children?: React.ReactNode;
    className?: string;
    deckClassName?: string;
    footerClassName?: string;
    nextLabel: string;
    previousLabel: string;
}

interface CardDeckItemProps {
    children?: React.ReactNode;
    className?: string;
}

const SCROLL_EPSILON = 8;

const CardDeckItem = ({ children, className }: CardDeckItemProps) => (
    <div className={classNames(styles.item, className)}>{children}</div>
);

const CardDeckRoot = ({
    ariaLabel,
    children,
    className,
    deckClassName,
    footerClassName,
    nextLabel,
    previousLabel,
}: CardDeckProps) => {
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

            const computedStyle = window.getComputedStyle(deck);
            const gap = Number.parseFloat(computedStyle.columnGap || computedStyle.gap) || 24;
            const firstCard = deck.firstElementChild as HTMLElement | null;
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
        Array.from(deck.children).forEach((child) => resizeObserver?.observe(child));
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

    return (
        <div className={classNames(styles.root, className)} data-admin-card-deck>
            <div className={classNames(styles.deck, deckClassName)} ref={deckRef} data-admin-card-deck-scroll>
                {cards}
            </div>
            {cards.length > 1 && (
                <SideScrollerFooter
                    className={classNames(styles.footer, footerClassName)}
                    data-admin-card-deck-footer
                    ariaLabel={ariaLabel}
                    previousLabel={previousLabel}
                    nextLabel={nextLabel}
                    canScrollBackward={scrollState.canScrollBackward}
                    canScrollForward={scrollState.canScrollForward}
                    onScrollBackward={() => scrollCards(-1)}
                    onScrollForward={() => scrollCards(1)}
                />
            )}
        </div>
    );
};

export const CardDeck = Object.assign(CardDeckRoot, { Item: CardDeckItem });
