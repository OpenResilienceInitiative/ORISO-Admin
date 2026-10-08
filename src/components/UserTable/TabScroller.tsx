import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { IconButton } from '../IconButton';
import styles from './tabScroller.module.scss';

export interface TabScrollerProps {
    /** The tab row; it must not scroll by itself. */
    children: ReactNode;
}

/** Adds ‹ › arrows once the tab row overflows; an arrow at the edge is disabled, never hidden. */
export const TabScroller = ({ children }: TabScrollerProps) => {
    const { t } = useTranslation();
    const viewportRef = useRef<HTMLDivElement>(null);
    const [state, setState] = useState({ overflow: false, atStart: true, atEnd: true });

    const measure = useCallback(() => {
        const el = viewportRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        // 1px slack: fractional widths leave scrollLeft just short of max.
        setState({ overflow: max > 1, atStart: el.scrollLeft <= 1, atEnd: el.scrollLeft >= max - 1 });
    }, []);

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return undefined;
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        if (el.firstElementChild) observer.observe(el.firstElementChild);
        return () => observer.disconnect();
    }, [measure]);

    // Again once the arrows appear: they narrow the viewport.
    useEffect(() => {
        const el = viewportRef.current;
        const active = el?.querySelector<HTMLElement>('[aria-selected="true"], [aria-current="page"]');
        if (!el || !active) return;
        const overshoot = active.getBoundingClientRect().right - el.getBoundingClientRect().right;
        if (overshoot > 0) el.scrollLeft += overshoot;
        measure();
    }, [state.overflow, measure]);

    const scrollBy = (direction: 1 | -1) => {
        const el = viewportRef.current;
        el?.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
    };

    return (
        <div className={styles.scroller}>
            {state.overflow && (
                <IconButton
                    icon={<ChevronLeftIcon />}
                    ariaLabel={t('userTable.tabScroller.left', 'Tabs nach links')}
                    disabled={state.atStart}
                    onClick={() => scrollBy(-1)}
                />
            )}
            <div ref={viewportRef} className={styles.viewport} onScroll={measure}>
                <div className={styles.track}>{children}</div>
            </div>
            {state.overflow && (
                <IconButton
                    icon={<ChevronRightIcon />}
                    ariaLabel={t('userTable.tabScroller.right', 'Tabs nach rechts')}
                    disabled={state.atEnd}
                    onClick={() => scrollBy(1)}
                />
            )}
        </div>
    );
};
