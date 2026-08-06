import { ChangeEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input, type InputRef } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as ArrowMenuOpenIcon } from '../../resources/img/svg/oriso/arrow_menu_open_24px.svg';
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
    /**
     * `row` (default) is the page-toolbar layout: the search control plus its
     * sibling controls in a horizontally scrollable row. `pill` is the
     * bottom-bar layout (Figma 56576:34610) — the control on its own, 88px
     * collapsed, raised off the bar surface with M3's inner shadow.
     */
    variant?: 'row' | 'pill';
}

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
    variant = 'row',
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

    const caretButton = (
        <button
            aria-expanded={expanded}
            aria-label={
                expanded ? t('globalSearch.collapse', 'Suche einklappen') : t('globalSearch.expand', 'Suche ausklappen')
            }
            className={styles.iconButton}
            key="caret"
            onClick={toggleExpanded}
            type="button"
        >
            <span className={classNames(styles.caret, { [styles.caretFlipped]: expanded })}>
                <ArrowMenuOpenIcon aria-hidden />
            </span>
        </button>
    );

    const magnifierButton = (
        <button
            aria-label={
                expanded && searchValue.length > 0
                    ? t('globalSearch.submit', 'Suche ausführen')
                    : t('globalSearch.toggle', 'Suche öffnen oder schließen')
            }
            className={styles.iconButton}
            key="magnifier"
            onClick={handleMagnifierClick}
            type="button"
        >
            <SearchOutlined className={styles.magnifier} />
        </button>
    );

    // The bottom bar follows M3's search-bar anatomy — magnifier as the leading
    // icon, the panel caret trailing (Figma 56576:34610). The page-toolbar row
    // keeps its established caret-first order so existing screens don't shift.
    const [leadingButton, trailingButton] =
        variant === 'pill' ? [magnifierButton, caretButton] : [caretButton, magnifierButton];

    const isPill = variant === 'pill';

    return (
        <div className={classNames(styles.scroller, { [styles.pillScroller]: isPill }, className)}>
            <div className={classNames(styles.row, { [styles.pillRow]: isPill })}>
                {leading}
                <div
                    className={classNames(styles.search, {
                        [styles.searchExpanded]: expanded,
                        [styles.pillSearch]: isPill,
                        [styles.pillSearchExpanded]: isPill && expanded,
                    })}
                    // The pill grows by filling its flex slot, never to a fixed
                    // pixel width: the bottom bar keeps a 48px slot for the
                    // overflow button, so the search can never push it away.
                    style={{ width: expanded && !isPill ? expandedWidth : undefined }}
                >
                    {leadingButton}
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
                    {trailingButton}
                </div>
                {children}
            </div>
        </div>
    );
};

export default GlobalSearchBar;
