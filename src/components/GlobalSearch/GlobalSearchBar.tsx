import { ChangeEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input, type InputRef } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './globalSearchBar.module.scss';

export interface GlobalSearchBarProps {
    /** Accessible input label when it needs to differ from the visible placeholder. */
    ariaLabel?: string;
    /** Sibling row controls (fields, split buttons, actions) rendered after the search control. */
    children?: ReactNode;
    className?: string;
    /** Initial expansion state of the search control. */
    defaultExpanded?: boolean;
    /** Row content rendered BEFORE the search pill (e.g. the composer's "⋮" more-menu). */
    leading?: ReactNode;
    /** Width the search control animates to when expanded. */
    expandedWidth?: number;
    /** Called after each expand/collapse toggle. */
    onExpandedChange?: (expanded: boolean) => void;
    /** Optional hooks for pages that coordinate menus or keyboard interactions with the input. */
    onInputClick?: () => void;
    onInputFocus?: () => void;
    onInputKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
    /** Called with the query when the user submits (Enter, or magnifier while filled). */
    onSearch?: (query: string) => void;
    /** Called on every query change. */
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    /** Controlled query value; leave undefined for internal state. */
    value?: string;
}

/**
 * Placeholder for the M3 "open search panel" caret (Figma marks it "change
 * icon", so the final glyph is still owned by design). Flips horizontally via
 * CSS when the search control is expanded.
 */
const ExpandCaretIcon = () => (
    <svg aria-hidden fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 7v10l6-5-6-5z" fill="currentColor" />
        <path d="M16 6h2v12h-2z" fill="currentColor" />
    </svg>
);

/**
 * Global search row (Figma 1165:17005, "Search Bar Admin Panel"). The search
 * control starts minimized (caret + magnifier); pressing either icon expands
 * the input with a width animation towards the right, pushing the sibling
 * controls along. Pressing again shrinks it back and flips the caret. When the
 * row outgrows its container it becomes horizontally scrollable with a real,
 * hoverable scrollbar instead of clipping.
 */
export const GlobalSearchBar = ({
    ariaLabel,
    children,
    className,
    defaultExpanded = false,
    expandedWidth = 360,
    leading,
    onExpandedChange,
    onInputClick,
    onInputFocus,
    onInputKeyDown,
    onSearch,
    onSearchChange,
    searchPlaceholder,
    value,
}: GlobalSearchBarProps) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [internalValue, setInternalValue] = useState('');
    const inputRef = useRef<InputRef>(null);
    const hasMountedRef = useRef(false);
    const isControlled = value !== undefined;
    const searchValue = isControlled ? value : internalValue;

    // Focus follows a user-driven expand only. Pages that render with
    // `defaultExpanded` must not steal focus on mount — that fires their
    // `onInputFocus` hook and pops suggestion menus open unprompted (#417).
    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }

        if (expanded) {
            inputRef.current?.focus({ preventScroll: true });
        }
    }, [expanded]);

    const toggleExpanded = () => {
        const next = !expanded;
        setExpanded(next);
        onExpandedChange?.(next);
    };

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (!isControlled) {
            setInternalValue(event.target.value);
        }

        onSearchChange?.(event.target.value);
    };

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        onInputKeyDown?.(event);

        if (event.defaultPrevented) {
            return;
        }

        if (event.key === 'Enter') {
            onSearch?.(searchValue);
        }
    };

    const handleMagnifierClick = () => {
        if (expanded && searchValue.length > 0) {
            onSearch?.(searchValue);
            return;
        }

        toggleExpanded();
    };

    return (
        <div className={classNames(styles.scroller, className)}>
            <div className={styles.row}>
                {leading}
                <div
                    className={classNames(styles.search, { [styles.searchExpanded]: expanded })}
                    style={{ width: expanded ? expandedWidth : undefined }}
                >
                    <button
                        aria-expanded={expanded}
                        aria-label={
                            expanded
                                ? t('globalSearch.collapse', 'Suche einklappen')
                                : t('globalSearch.expand', 'Suche ausklappen')
                        }
                        className={styles.iconButton}
                        onClick={toggleExpanded}
                        type="button"
                    >
                        <span className={classNames(styles.caret, { [styles.caretFlipped]: expanded })}>
                            <ExpandCaretIcon />
                        </span>
                    </button>
                    {expanded && (
                        <Input
                            aria-label={ariaLabel ?? searchPlaceholder ?? t('globalSearch.placeholder', 'Suchen')}
                            autoComplete="search"
                            className={styles.input}
                            name="search"
                            onChange={handleSearchChange}
                            onClick={onInputClick}
                            onFocus={onInputFocus}
                            onKeyDown={handleSearchKeyDown}
                            placeholder={searchPlaceholder ?? t('globalSearch.placeholder', 'Suchen')}
                            ref={inputRef}
                            value={searchValue}
                            variant="borderless"
                        />
                    )}
                    <button
                        aria-label={
                            expanded && searchValue.length > 0
                                ? t('globalSearch.submit', 'Suche ausführen')
                                : t('globalSearch.toggle', 'Suche öffnen oder schließen')
                        }
                        className={styles.iconButton}
                        onClick={handleMagnifierClick}
                        type="button"
                    >
                        <SearchOutlined className={styles.magnifier} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default GlobalSearchBar;
