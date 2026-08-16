import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import styles from './m3FabMenu.module.scss';

export interface M3FabMenuItem {
    /** Stable key; also what `onSelect` reports and what `activeKey` matches. */
    key: string;
    label: string;
    /** Single-colour glyph — it inherits the pill's text colour. */
    icon?: ReactNode;
    /** Route. Without it the pill renders as a plain button. */
    to?: string;
}

export interface M3FabMenuProps {
    /** Destinations, in the order the design shows them (top to bottom). */
    items: M3FabMenuItem[];
    /**
     * Account-level entries — rendered below the destinations behind a divider,
     * because they are not places in the same sense (Frank, 2026-08-07).
     */
    footerItems?: M3FabMenuItem[];
    activeKey?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Accessible name of the FAB while closed, e.g. "Menü öffnen". */
    openLabel: string;
    /** Accessible name while open, e.g. "Menü schließen". */
    closeLabel: string;
    onSelect?: (key: string) => void;
    className?: string;
    /** Navigation keeps the existing palette; action menus use the compact policy-control palette. */
    variant?: 'navigation' | 'action';
    /** Closed/action colour communicates the selected boolean value without relying on the glyph. */
    tone?: 'primary' | 'neutral';
    /** Optional value glyph for an action FAB; menu entries retain their own policy-mode glyphs. */
    triggerIcon?: ReactNode;
    disabled?: boolean;
}

/**
 * The page FAB and the destination stack it opens (Figma 1683:39454 / 1683:39456).
 *
 * Closed, the FAB carries the icon of the destination you are on — it is a
 * "you are here" marker as much as a menu handle. Open, it becomes the close
 * button and the destinations stack above it, right-aligned, within thumb reach.
 *
 * The component owns no navigation: it reports selections and lets its parent
 * decide. Open state is controlled, so the bar can coordinate it with the
 * search row.
 */
export const M3FabMenu = ({
    activeKey,
    className,
    closeLabel,
    footerItems = [],
    items,
    onOpenChange,
    onSelect,
    open,
    openLabel,
    variant = 'navigation',
    tone = 'primary',
    triggerIcon,
    disabled = false,
}: M3FabMenuProps) => {
    const menuId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const fabRef = useRef<HTMLButtonElement>(null);
    const stackRef = useRef<HTMLUListElement>(null);
    const [opensDownward, setOpensDownward] = useState(false);
    const [stackMaxHeight, setStackMaxHeight] = useState<number>();
    // The account entries are destinations too: standing on "Konto" and closing
    // the menu left the FAB empty, because only `items` was searched.
    const activeItem = [...items, ...footerItems].find((item) => item.key === activeKey);

    const close = useCallback(
        (returnFocus = true) => {
            onOpenChange(false);

            if (returnFocus) {
                fabRef.current?.focus();
            }
        },
        [onOpenChange],
    );

    useLayoutEffect(() => {
        if (!open || variant !== 'action') {
            setOpensDownward(false);
            setStackMaxHeight(undefined);
            return undefined;
        }

        const updatePlacement = () => {
            const stackRect = stackRef.current?.getBoundingClientRect();
            const fabRect = fabRef.current?.getBoundingClientRect();
            if (!stackRect || !fabRect) return;

            const spaceAbove = Math.max(0, fabRect.top - 8);
            const spaceBelow = Math.max(0, window.innerHeight - fabRect.bottom - 8);
            const downward = stackRect.height > spaceAbove && spaceBelow > spaceAbove;
            setOpensDownward(downward);
            setStackMaxHeight(downward ? spaceBelow : spaceAbove);
        };

        updatePlacement();
        window.addEventListener('resize', updatePlacement);
        return () => window.removeEventListener('resize', updatePlacement);
    }, [items.length, footerItems.length, open, variant]);

    useEffect(() => {
        if (!open || disabled) return;

        stackRef.current?.querySelector<HTMLElement>('a:not([aria-disabled="true"]), button:not(:disabled)')?.focus();
    }, [disabled, footerItems.length, items.length, open]);

    // Escape and a click outside close the menu. Pointer-down rather than click,
    // so a tap that starts outside never also activates what is underneath.
    // Both listeners sit on the document: Escape has to work while focus is on
    // a pill, on the FAB, or nowhere in particular.
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const onPointerDown = (event: MouseEvent | TouchEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                close(false);
            }
        };

        const onKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                close();
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [close, open]);

    const renderItem = (item: M3FabMenuItem, isFooter: boolean) => {
        const isActive = item.key === activeKey;
        const content = (
            <>
                {item.icon}
                <span className={styles.itemLabel}>{item.label}</span>
            </>
        );
        const itemClassName = classNames(styles.item, {
            [styles.itemActive]: isActive,
            [styles.itemFooter]: isFooter,
        });

        if (item.to) {
            return (
                <li key={item.key}>
                    <Link
                        className={itemClassName}
                        to={item.to}
                        aria-current={isActive ? 'page' : undefined}
                        aria-disabled={disabled || undefined}
                        tabIndex={disabled ? -1 : undefined}
                        onClick={(event) => {
                            if (disabled) {
                                event.preventDefault();
                                return;
                            }
                            onSelect?.(item.key);
                            close(false);
                        }}
                    >
                        {content}
                    </Link>
                </li>
            );
        }

        return (
            <li key={item.key}>
                <button
                    className={itemClassName}
                    type="button"
                    // Also on the button branch: which destination you are on
                    // must not depend on whether it was given a route.
                    aria-current={isActive ? 'page' : undefined}
                    disabled={disabled}
                    onClick={() => {
                        onSelect?.(item.key);
                        close(false);
                    }}
                >
                    {content}
                </button>
            </li>
        );
    };

    return (
        <div
            className={classNames(styles.root, className, {
                [styles.action]: variant === 'action',
                [styles.neutral]: tone === 'neutral',
                [styles.openDownward]: variant === 'action' && opensDownward,
            })}
            ref={rootRef}
        >
            {open && (
                <ul
                    className={styles.stack}
                    id={menuId}
                    data-admin-fab-menu-stack
                    ref={stackRef}
                    style={stackMaxHeight === undefined ? undefined : { maxHeight: stackMaxHeight }}
                >
                    {items.map((item) => renderItem(item, false))}
                    {footerItems.map((item) => renderItem(item, true))}
                </ul>
            )}
            <button
                className={styles.fab}
                ref={fabRef}
                type="button"
                aria-label={open ? closeLabel : openLabel}
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-haspopup="menu"
                data-admin-fab-menu-toggle
                disabled={disabled}
                onClick={() => onOpenChange(!open)}
            >
                {open ? <CloseIcon className={styles.fabGlyph} /> : triggerIcon ?? activeItem?.icon ?? null}
            </button>
        </div>
    );
};

export default M3FabMenu;
