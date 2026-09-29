import {
    cloneElement,
    isValidElement,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface M3TooltipProps {
    /**
     * The explanation. An empty string renders no tooltip at all and leaves the
     * trigger untouched — a status without a written explanation must not grow
     * an empty bubble.
     */
    text: string;
    /**
     * The trigger. A SINGLE element, cloned with `aria-describedby` so the
     * explanation is announced with it. Non-interactive triggers (a status
     * badge, a stepper bead) need their own `tabIndex={0}` to be reachable by
     * keyboard — the tooltip does not make text focusable behind the caller's
     * back.
     */
    children: ReactElement;
    /** Side the bubble grows to. `top` is the default M3 plain-tooltip anchor. */
    placement?: 'top' | 'bottom';
    /** Render into `document.body` so a clipping container (a scrolling row) cannot cut the bubble off. */
    portal?: boolean;
    className?: string;
}

/**
 * M3 plain tooltip (Material 3 "Tooltips — plain"): a short explanation shown on
 * hover and on keyboard focus, dismissible with Escape (WCAG 2.2 SC 1.4.13).
 *
 * Deliberately hand-built like the other M3 primitives in this folder
 * (`M3Button`, `M3Checkbox`, `M3Switch`, `FilterChip`): the antd tooltip brings
 * its own palette and portal behaviour, and the surface it would sit on here is
 * a data table whose colours are M3 CSS variables only.
 */
/** Gap to the trigger and the least distance to the viewport edge, in px. */
const GAP = 4;
const EDGE = 8;
// Measured at the top-left, invisible, so its width is not squeezed before it is placed.
const UNPLACED: CSSProperties = { position: 'fixed', top: 0, left: 0, transform: 'none', visibility: 'hidden' };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));

export const M3Tooltip = ({ text, children, placement = 'top', portal = false, className }: M3TooltipProps) => {
    const id = useId();
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [anchor, setAnchor] = useState<CSSProperties | undefined>();
    const [dismissed, setDismissed] = useState(false);

    // WCAG 2.2 SC 1.4.13: Escape must close the bubble WITHOUT moving focus or
    // the pointer, so the trigger keeps focus and the tooltip stays suppressed
    // until hover/focus starts over. A document listener rather than a handler
    // on the wrapper: the trigger may be anything, including something that
    // stops keydown propagation on its way up.
    useEffect(() => {
        if (!open || dismissed) return undefined;
        const onEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') setDismissed(true);
        };
        document.addEventListener('keydown', onEscape);
        return () => document.removeEventListener('keydown', onEscape);
    }, [open, dismissed]);

    const bubbleRef = useRef<HTMLSpanElement>(null);
    // Placed from the trigger AND the bubble's own size: flipped when the preferred side has no room,
    // then clamped so the whole bubble stays inside the viewport.
    const measure = () => {
        if (!portal || !wrapperRef.current || !bubbleRef.current) return;
        const trigger = wrapperRef.current.getBoundingClientRect();
        const { width, height } = bubbleRef.current.getBoundingClientRect();
        const fitsAbove = trigger.top - GAP - height >= EDGE;
        const fitsBelow = trigger.bottom + GAP + height <= window.innerHeight - EDGE;
        let side = placement;
        if (side === 'top' && !fitsAbove && fitsBelow) side = 'bottom';
        if (side === 'bottom' && !fitsBelow && fitsAbove) side = 'top';
        const top = side === 'top' ? trigger.top - GAP - height : trigger.bottom + GAP;
        const left = trigger.left + trigger.width / 2 - width / 2;
        setAnchor({
            position: 'fixed',
            transform: 'none',
            top: clamp(top, EDGE, window.innerHeight - EDGE - height),
            left: clamp(left, EDGE, window.innerWidth - EDGE - width),
        });
    };

    // Fixed coordinates go stale when the row scrolls, so re-measure while the bubble is up.
    const visible = open && !dismissed;
    useEffect(() => {
        if (!portal || !visible) return undefined;
        window.addEventListener('scroll', measure, true);
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('scroll', measure, true);
            window.removeEventListener('resize', measure);
        };
    }, [portal, visible, placement]); // eslint-disable-line react-hooks/exhaustive-deps

    // Before paint, once the bubble exists and can be measured.
    useLayoutEffect(() => {
        if (portal && visible) measure();
    }, [portal, visible, placement, text]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!text || !isValidElement(children)) {
        return children;
    }

    const show = () => {
        setDismissed(false);
        setOpen(true);
    };

    const bubble = (
        <span
            className={classNames(styles.bubble, portal ? styles.portal : styles[placement])}
            id={id}
            ref={bubbleRef}
            role="tooltip"
            style={portal ? anchor ?? UNPLACED : undefined}
        >
            {text}
        </span>
    );

    return (
        <span
            ref={wrapperRef}
            className={classNames(styles.wrapper, className)}
            onBlur={() => setOpen(false)}
            onFocus={show}
            onMouseEnter={show}
            onMouseLeave={() => setOpen(false)}
        >
            {cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
                'aria-describedby': visible ? id : undefined,
            })}
            {visible && (portal ? createPortal(bubble, document.body) : bubble)}
        </span>
    );
};

export default M3Tooltip;
