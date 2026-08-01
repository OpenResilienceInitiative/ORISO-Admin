import { useCallback, useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import styles from './moreMenuSheet.module.scss';

export interface MoreMenuSheetEntry {
    key: string;
    label: string;
    icon?: ReactNode;
    to?: string;
}

export interface MoreMenuSheetGroup {
    /** Group heading, e.g. "Bereiche" or "Sektionen". */
    label: string;
    entries: MoreMenuSheetEntry[];
    /** Key of the entry the user is currently on, within this group. */
    activeKey?: string;
}

export interface MoreMenuSheetProps {
    open: boolean;
    onClose: () => void;
    /** Accessible name of the sheet. */
    ariaLabel: string;
    /**
     * Accessible name of the scrim, which is a real button. It must describe
     * the ACTION ("Menü schließen"), not repeat the sheet's name — otherwise
     * screen-reader users hear the same label twice and cannot tell the
     * dismiss target from the dialog itself.
     */
    closeLabel: string;
    groups: MoreMenuSheetGroup[];
    onSelect?: (key: string) => void;
    lang?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * The list behind the bottom bar's "Mehr" segment: every destination and every
 * section of the current screen, in full.
 *
 * Two deliberate choices:
 *
 * - It lists **all** destinations, including the two or three already shown in
 *   the bar — not just the overflow remainder. The bar's contents change with
 *   the viewport, so a list of "the rest" would be a different list on every
 *   phone; a complete list is the same everywhere and needs no explaining.
 * - It renders through a portal on `document.body`, never inside the bar. The
 *   bar is `position: fixed` with its own stacking context and `overflow: clip`
 *   — a sheet mounted inside it would be clipped, and would unmount from under
 *   its own outside-click handler.
 */
export const MoreMenuSheet = ({ ariaLabel, closeLabel, groups, lang, onClose, onSelect, open }: MoreMenuSheetProps) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const restoreFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        restoreFocusRef.current = document.activeElement as HTMLElement | null;
        // Falls back to the dialog itself when every group is empty and there
        // is no focusable entry — otherwise focus silently stays wherever it
        // was and the sheet never receives it at all.
        (sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? sheetRef.current)?.focus();

        return () => {
            // Returning focus to the "Mehr" button is what makes the sheet
            // usable by keyboard at all — otherwise closing it drops the caret
            // back to the top of the document.
            restoreFocusRef.current?.focus();
        };
    }, [open]);

    // Scroll-lock the app behind the sheet for as long as it's open — same
    // pattern as DpaBlocker.tsx. Without it the page behind a position:fixed
    // sheet keeps scrolling under the user's thumb.
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    // Escape listens on the document, not on the sheet: focus can legitimately
    // sit on the scrim (after a click) or nowhere at all, and in both cases the
    // key must still dismiss. A handler bound to the sheet would silently do
    // nothing exactly when the user most expects an escape hatch.
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const onEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', onEscape);

        return () => document.removeEventListener('keydown', onEscape);
    }, [onClose, open]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== 'Tab') {
                return;
            }

            const focusable = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
            const edge = event.shiftKey ? focusable[0] : focusable[focusable.length - 1];

            if (focusable.length > 0 && document.activeElement === edge) {
                event.preventDefault();
                (event.shiftKey ? focusable[focusable.length - 1] : focusable[0]).focus();
            }
        },
        [onClose],
    );

    if (!open) {
        return null;
    }

    const entryContent = (entry: MoreMenuSheetEntry) => (
        <>
            {entry.icon && (
                <span className={styles.icon} aria-hidden>
                    {entry.icon}
                </span>
            )}
            <span lang={lang}>{entry.label}</span>
        </>
    );

    return createPortal(
        <div className={styles.layer}>
            <button aria-label={closeLabel} className={styles.scrim} onClick={onClose} type="button" />
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <div
                aria-label={ariaLabel}
                aria-modal="true"
                className={styles.sheet}
                onKeyDown={handleKeyDown}
                ref={sheetRef}
                role="dialog"
                tabIndex={-1}
            >
                <span aria-hidden className={styles.grabber} />
                {groups
                    .filter((group) => group.entries.length > 0)
                    .map((group) => (
                        <section className={styles.group} key={group.label}>
                            <h2 className={styles.groupLabel} lang={lang}>
                                {group.label}
                            </h2>
                            <ul className={styles.list}>
                                {group.entries.map((entry) => {
                                    const isActive = entry.key === group.activeKey;
                                    const className = classNames(styles.entry, {
                                        [styles.entryActive]: isActive,
                                    });
                                    const select = () => {
                                        onSelect?.(entry.key);
                                        onClose();
                                    };

                                    return (
                                        <li key={entry.key}>
                                            {entry.to ? (
                                                // `Link`, not `NavLink`: NavLink overwrites any aria-current
                                                // it is given with the result of its own route match, which
                                                // would drop the marking here too — activeKey, not the
                                                // router's current location, is this component's source of
                                                // truth for which entry is current (see M3NavigationBar).
                                                <Link
                                                    aria-current={isActive ? 'page' : undefined}
                                                    className={className}
                                                    onClick={select}
                                                    to={entry.to}
                                                >
                                                    {entryContent(entry)}
                                                </Link>
                                            ) : (
                                                // No `to` means this entry doesn't navigate to a route — it
                                                // marks the current section of the page the user is already
                                                // on. `aria-current="page"` is for a link that IS the active
                                                // route; `"location"` is the correct value for a same-page
                                                // position indicator (WAI-ARIA `aria-current`).
                                                <button
                                                    aria-current={isActive ? 'location' : undefined}
                                                    className={className}
                                                    onClick={select}
                                                    type="button"
                                                >
                                                    {entryContent(entry)}
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
            </div>
        </div>,
        document.body,
    );
};

export default MoreMenuSheet;
