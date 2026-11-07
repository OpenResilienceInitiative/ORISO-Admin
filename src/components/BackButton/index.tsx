import ChevronLeft from '@mui/icons-material/ChevronLeft';
import classNames from 'classnames';
import { useLayoutEffect, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { M3Tooltip } from '../M3Tooltip';
import styles from './styles.module.scss';

export type BackButtonVariant = 'tonal' | 'text' | 'breadcrumb';

export interface BackButtonProps {
    /**
     * Visible text and accessible name, already translated: "Zurück zu Träger".
     * With `iconOnly` it becomes the `aria-label` and the tooltip instead.
     */
    label: string;
    /** Where back leads. Renders a real link, so middle click and "open in new tab" work. */
    to?: string;
    /**
     * Click handler. Without `to` the control is a button (for example "back in history"
     * or a leave-unsaved-changes check); with `to` it runs before the navigation.
     */
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    /**
     * `tonal` (default): neutral round chevron button with the label beside it.
     * `text`: text button with a leading chevron, like the footer "Zurück" buttons.
     * `breadcrumb`: parent link, separator, current page.
     */
    variant?: BackButtonVariant;
    /** Only the round chevron, as in the mobile bottom bar. Ignored by `breadcrumb`. */
    iconOnly?: boolean;
    /** `breadcrumb` only: the page the person is on now. Not a link. */
    current?: string;
    /**
     * `breadcrumb` only: name of the navigation landmark, already translated ("Seitenpfad").
     * Pass it: without one the landmark has no name.
     */
    trailLabel?: string;
    /** Lands on the link or button itself (for `breadcrumb`: the parent link), never on the wrapper. */
    className?: string;
}

/**
 * True while the text is cut off by `text-overflow: ellipsis`. Measured, not guessed, so
 * only a really shortened label gets a tooltip.
 *
 * Takes the element itself (from a callback ref), not a ref object, so the observer follows
 * the label if it is ever re-created (for example when `iconOnly` is switched).
 */
const useIsTruncated = (element: HTMLElement | null, text: string) => {
    const [truncated, setTruncated] = useState(false);

    useLayoutEffect(() => {
        if (!element) {
            setTruncated(false);
            return undefined;
        }
        const measure = () => setTruncated(element.scrollWidth > element.clientWidth + 1);
        measure();
        if (typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [element, text]);

    return truncated;
};

/**
 * The page header's way back (replaces the dark-red round arrow of the old `Page.Back`).
 *
 * - One 40px visual on the 16px raster, a 48px hit area around it (`::before`), so the
 *   visible edge is what lines up with the tab bar and the tiles.
 * - A link when it has a `to`, a button otherwise. Enter works on both, Space on the button.
 * - Neutral tokens only (`--m3-surface-container-highest`, `--m3-on-surface`), the focus
 *   ring is the one the other buttons use. No brand red filled circle.
 * - A label too long for the row is shortened with an ellipsis and gets a tooltip with the
 *   full text; the accessible name is always the full label.
 */
export const BackButton = ({
    label,
    to,
    onClick,
    variant = 'tonal',
    iconOnly = false,
    current,
    trailLabel,
    className,
}: BackButtonProps) => {
    const [labelElement, setLabelElement] = useState<HTMLSpanElement | null>(null);
    const [currentElement, setCurrentElement] = useState<HTMLSpanElement | null>(null);
    const iconOnlyEffective = iconOnly && variant !== 'breadcrumb';
    const labelTruncated = useIsTruncated(labelElement, label);
    const currentTruncated = useIsTruncated(currentElement, current ?? '');

    const rootClass = classNames(styles.root, styles[variant], { [styles.iconOnly]: iconOnlyEffective }, className);

    const chevron =
        variant === 'tonal' ? (
            <span className={styles.circle}>
                <ChevronLeft />
            </span>
        ) : (
            <ChevronLeft className={styles.chevron} />
        );

    const content = (
        <>
            {chevron}
            {!iconOnlyEffective && (
                <span ref={setLabelElement} className={styles.label}>
                    {label}
                </span>
            )}
        </>
    );

    const interactive =
        to !== undefined ? (
            <Link
                to={to}
                className={rootClass}
                aria-label={iconOnlyEffective ? label : undefined}
                onClick={onClick}
                data-admin-back-button={variant}
            >
                {content}
            </Link>
        ) : (
            <button
                type="button"
                className={rootClass}
                aria-label={iconOnlyEffective ? label : undefined}
                onClick={onClick}
                data-admin-back-button={variant}
            >
                {content}
            </button>
        );

    // The bubble only repeats the visible or accessible name, so it must not be announced twice.
    // `portal`: the header is a sticky, clipping container. The bubble only exists while the label is
    // cut off (or icon only). `keepWrapper`: the control keeps the same wrapper when that changes, so a
    // resize or zoom that crosses the threshold never remounts it and a focused button keeps focus.
    const control = (
        <M3Tooltip
            nameOnly
            keepWrapper
            portal
            placement="bottom"
            className={styles.tooltipSlot}
            text={iconOnlyEffective || labelTruncated ? label : ''}
        >
            {interactive}
        </M3Tooltip>
    );

    if (variant !== 'breadcrumb') {
        return control;
    }

    return (
        <nav aria-label={trailLabel} className={styles.trail}>
            <ol className={styles.trailList}>
                <li className={styles.trailItem}>{control}</li>
                {current && (
                    <li className={classNames(styles.trailItem, styles.trailCurrent)} aria-current="page">
                        <span className={styles.separator} aria-hidden>
                            /
                        </span>
                        {/* A cut-off name becomes a tab stop with the same bubble as the link, so keyboard and
                            touch users can read it too (a native `title` is hover only). */}
                        <M3Tooltip
                            nameOnly
                            keepWrapper
                            portal
                            placement="bottom"
                            className={styles.tooltipSlot}
                            text={currentTruncated ? current : ''}
                        >
                            {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- a tab stop only while the text is cut off */}
                            <span
                                ref={setCurrentElement}
                                className={styles.currentLabel}
                                tabIndex={currentTruncated ? 0 : undefined}
                            >
                                {current}
                            </span>
                            {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
                        </M3Tooltip>
                    </li>
                )}
            </ol>
        </nav>
    );
};

export default BackButton;
