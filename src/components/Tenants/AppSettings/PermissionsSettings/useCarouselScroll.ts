import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './styles.module.scss';

type CarouselScrollState = {
    canScrollLeft: boolean;
    canScrollRight: boolean;
};

export const useCarouselScroll = (cardCount: number, isLoading: boolean) => {
    const gridRef = useRef<HTMLDivElement | null>(null);
    const [scrollState, setScrollState] = useState<CarouselScrollState>({
        canScrollLeft: false,
        canScrollRight: false,
    });

    const updateScrollState = useCallback(() => {
        const el = gridRef.current;
        if (!el) return;

        const maxScrollLeft = el.scrollWidth - el.clientWidth;
        const canScroll = maxScrollLeft > 1;
        const canScrollLeft = canScroll && el.scrollLeft > 1;
        const canScrollRight = canScroll && el.scrollLeft < maxScrollLeft - 1;

        setScrollState((previous) => {
            if (previous.canScrollLeft === canScrollLeft && previous.canScrollRight === canScrollRight) {
                return previous;
            }

            return { canScrollLeft, canScrollRight };
        });
    }, []);

    const scrollByCard = useCallback(
        (dir: 'left' | 'right') => {
            const el = gridRef.current;
            if (!el) return;
            const firstCard = el.querySelector(`.${styles.chatTypeCard}`) as HTMLElement | null;
            const computedStyle = window.getComputedStyle(el);
            const gap = Number.parseFloat(computedStyle.columnGap || computedStyle.gap) || 48;
            const step = firstCard ? firstCard.offsetWidth + gap : el.clientWidth * 0.9;
            el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
            window.setTimeout(updateScrollState, 260);
        },
        [updateScrollState],
    );

    useEffect(() => {
        const el = gridRef.current;
        const initialCheck = window.setTimeout(updateScrollState, 0);
        const settledCheck = window.setTimeout(updateScrollState, 250);

        if (!el) {
            return () => {
                window.clearTimeout(initialCheck);
                window.clearTimeout(settledCheck);
            };
        }

        updateScrollState();

        const handleScroll = () => updateScrollState();
        const handleResize = () => updateScrollState();
        const observer =
            typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => updateScrollState());

        el.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);
        observer?.observe(el);
        Array.from(el.children).forEach((child) => observer?.observe(child));

        return () => {
            window.clearTimeout(initialCheck);
            window.clearTimeout(settledCheck);
            el.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
            observer?.disconnect();
        };
    }, [cardCount, isLoading, updateScrollState]);

    return { gridRef, scrollState, scrollByCard };
};
