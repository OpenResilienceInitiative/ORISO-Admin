import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import classNames from 'classnames';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import styles from './styles.module.scss';

export interface CollapsibleTileProps {
    /** Icon of the tile, monochrome, 24px. */
    icon: ReactNode;
    title: string;
    /** Short state next to the title, e.g. "Empty" or "Published". */
    status?: string;
    /** Marks the chip as something that needs attention instead of a plain state. */
    statusTone?: 'neutral' | 'attention';
    /** Open on first render, or controlled by an owning surface. */
    defaultOpen?: boolean;
    /** Centre the document heading and animate its body into the folded tile. */
    documentMotion?: boolean;
    open?: boolean;
    /** Called with the new state when the header is toggled, so a parent that rebuilds the tile can keep it open. */
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
    className?: string;
    /**
     * Set: the icon is a button of its own (e.g. to rename the tile's subject, ORISO-Admin#1558);
     * the rest of the header still folds the tile.
     */
    onIconClick?: () => void;
    /** Accessible name of the icon button; required with `onIconClick`. */
    iconLabel?: string;
}

/** Duration and curve of the header's fold, the same as the chevron and the M3 "emphasized" motion. */
export const HEADER_MOTION = { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)' } as const;

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Place = { left: number; top: number };

/**
 * Where the layout puts an element inside its header. Offsets ignore transforms, so a slide that is
 * still running (or one this render starts) never becomes the start of the next one.
 */
const placeOf = (element: HTMLElement | null): Place | undefined =>
    element ? { left: element.offsetLeft, top: element.offsetTop } : undefined;

/**
 * Moves an element from where it was laid out last time to where it is laid out now (FLIP): the
 * layout jumps, the eye sees a slide. Without Web Animations (jsdom) or with reduced motion it just
 * jumps.
 */
const slideFrom = (element: HTMLElement | null, before: Place | undefined, after: Place | undefined) => {
    if (!element || !before || !after || prefersReducedMotion() || typeof element.animate !== 'function') return;
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], HEADER_MOTION);
};

/**
 * A tile that folds up to its header: icon, title, state chip and a chevron. For tiles that hold a
 * long document, so a page of them can be scanned and one opened to edit. The body mounts when the
 * tile is first opened and stays mounted, so an unsaved draft survives folding it up.
 *
 * Open, the header looks like every other tile: the icon centred above the title. Folded, the icon
 * slides to the left of the title into one row, so a page of folded tiles reads like a list.
 */
export const CollapsibleTile = ({
    icon,
    title,
    status,
    statusTone = 'neutral',
    defaultOpen = false,
    documentMotion = false,
    open: controlledOpen,
    onOpenChange,
    children,
    className,
    onIconClick,
    iconLabel,
}: CollapsibleTileProps) => {
    const [internalOpen, setOpen] = useState(defaultOpen);
    const open = controlledOpen ?? internalOpen;
    const [mounted, setMounted] = useState(defaultOpen || !!controlledOpen);
    const bodyId = useId();
    const iconRef = useRef<HTMLSpanElement>(null);
    const titleRef = useRef<HTMLSpanElement>(null);
    // Where icon and title were laid out after the last render: the start of the slide when `open` flips.
    const drawn = useRef<{ icon?: Place; title?: Place; open: boolean }>({ open });
    useLayoutEffect(() => {
        const last = drawn.current;
        // Measured before any slide starts: the next fold starts from the layout, not a transform.
        const now = { icon: placeOf(iconRef.current), title: placeOf(titleRef.current), open };
        drawn.current = now;
        if (last.open !== open) {
            slideFrom(iconRef.current, last.icon, now.icon);
            slideFrom(titleRef.current, last.title, now.title);
        }
    });
    useEffect(() => {
        if (open) setMounted(true);
    }, [open]);

    const toggle = () => {
        const next = !open;
        setMounted(true);
        setOpen(next);
        onOpenChange?.(next);
    };

    return (
        <section
            className={classNames(
                styles.tile,
                { [styles.open]: open, [styles.documentMotion]: documentMotion },
                className,
            )}
            data-collapsible-tile
        >
            <h3 className={classNames(styles.heading, { [styles.withIconButton]: onIconClick })}>
                {onIconClick && (
                    <button type="button" className={styles.iconButton} aria-label={iconLabel} onClick={onIconClick}>
                        <span className={styles.icon} aria-hidden>
                            {icon}
                        </span>
                        <EditIcon className={styles.iconButtonBadge} aria-hidden />
                    </button>
                )}
                <button
                    type="button"
                    className={styles.header}
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={toggle}
                >
                    <span className={styles.label}>
                        {!onIconClick && (
                            <span ref={iconRef} className={styles.icon} aria-hidden data-collapsible-tile-icon>
                                {icon}
                            </span>
                        )}
                        <span ref={titleRef} className={styles.title} data-collapsible-tile-title>
                            {title}
                        </span>
                    </span>
                    <span className={styles.trailing}>
                        {status && (
                            <span
                                className={classNames(styles.chip, {
                                    [styles.chipAttention]: statusTone === 'attention',
                                })}
                            >
                                {status}
                            </span>
                        )}
                        <ExpandMoreIcon className={styles.chevron} aria-hidden />
                    </span>
                </button>
            </h3>
            {documentMotion ? (
                <div
                    id={bodyId}
                    className={styles.motionBody}
                    aria-hidden={!open}
                    inert={!open}
                    data-collapsible-tile-body
                >
                    <div className={styles.motionClip}>
                        <div className={styles.body}>{(mounted || open) && children}</div>
                    </div>
                </div>
            ) : (
                <div id={bodyId} className={styles.body} hidden={!open} data-collapsible-tile-body>
                    {(mounted || open) && children}
                </div>
            )}
        </section>
    );
};
