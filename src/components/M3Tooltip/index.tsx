import { cloneElement, isValidElement, useEffect, useId, useState, type ReactElement } from 'react';
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
export const M3Tooltip = ({ text, children, placement = 'top', className }: M3TooltipProps) => {
    const id = useId();
    const [open, setOpen] = useState(false);
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

    if (!text || !isValidElement(children)) {
        return children;
    }

    const visible = open && !dismissed;

    const show = () => {
        setDismissed(false);
        setOpen(true);
    };

    return (
        <span
            className={classNames(styles.wrapper, className)}
            onBlur={() => setOpen(false)}
            onFocus={show}
            onMouseEnter={show}
            onMouseLeave={() => setOpen(false)}
        >
            {cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
                'aria-describedby': visible ? id : undefined,
            })}
            {visible && (
                <span className={classNames(styles.bubble, styles[placement])} id={id} role="tooltip">
                    {text}
                </span>
            )}
        </span>
    );
};

export default M3Tooltip;
