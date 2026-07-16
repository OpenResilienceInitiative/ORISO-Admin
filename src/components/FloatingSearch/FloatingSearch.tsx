import {
    useEffect,
    useId,
    useRef,
    useState,
    type CSSProperties,
    type FocusEvent,
    type KeyboardEvent,
    type MouseEvent,
} from 'react';
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as ArrowMenuOpenIcon } from '../../resources/img/svg/arrow_menu_open_24px.svg';
import styles from './FloatingSearch.module.scss';

export interface FloatingSearchProps {
    /** Accessible name for the search input (also used as the placeholder fallback). */
    ariaLabel?: string;
    placeholder?: string;
    /** Controlled value; omit to let the component manage its own text. */
    value?: string;
    onValueChange?: (value: string) => void;
    /**
     * Fires with the current query on Enter — and, while `searchOnChange` is on,
     * debounced (~1s) as the user types once `minSearchLength` is reached
     * (mirroring the legacy `SearchInput` behaviour).
     */
    onSearch?: (query: string) => void;
    /** Fires when the field is cleared (clear button, or typed back to empty). */
    onClear?: () => void;
    /** Run the debounced `onSearch` while typing (default true, like `SearchInput`). */
    searchOnChange?: boolean;
    /** Minimum length before the debounced `onSearch` fires (default 3). */
    minSearchLength?: number;
    /** Start expanded (uncontrolled) — does not steal focus on initial mount. */
    defaultExpanded?: boolean;
    /** Controlled expansion; pair with `onExpandedChange`. */
    expanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    /** Width of the revealed field in px (default 260). */
    expandedWidth?: number;
    disabled?: boolean;
    className?: string;
    /** Passthroughs to the input (e.g. to drive a suggestion menu). */
    onClick?: (event: MouseEvent<HTMLInputElement>) => void;
    onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
    onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * The standalone floating search pill (#310): an `arrow_menu_open_24px` toggle plus
 * magnifier that expands an auto-focusing search field to the right, pushing
 * siblings. Escape collapses; a clear button appears once text is entered. Value
 * and expansion each work controlled or uncontrolled, and the `onSearch`/`onClear`
 * pair matches the legacy `SearchInput` contract (debounced search-on-type), so it
 * drops into any listing surface (`TableFilterBar` composes it as its first pill).
 */
export const FloatingSearch = ({
    ariaLabel,
    placeholder,
    value,
    onValueChange,
    onSearch,
    onClear,
    searchOnChange = true,
    minSearchLength = 3,
    defaultExpanded = false,
    expanded,
    onExpandedChange,
    expandedWidth = 260,
    disabled = false,
    className,
    onClick,
    onFocus,
    onKeyDown,
}: FloatingSearchProps) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useId();
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
    const isExpandedControlled = expanded !== undefined;
    const isExpanded = (isExpandedControlled ? expanded : internalExpanded) && !disabled;

    const [internalValue, setInternalValue] = useState('');
    const isValueControlled = value !== undefined;
    const currentValue = isValueControlled ? value : internalValue;

    useEffect(
        () => () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        },
        [],
    );

    const clearPendingSearch = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    const setExpandedState = (next: boolean) => {
        if (!isExpandedControlled) {
            setInternalExpanded(next);
        }

        onExpandedChange?.(next);
    };

    const updateValue = (next: string) => {
        if (!isValueControlled) {
            setInternalValue(next);
        }

        onValueChange?.(next);

        if (next === '') {
            clearPendingSearch();
            onClear?.();
            return;
        }

        if (onSearch && searchOnChange) {
            clearPendingSearch();
            timerRef.current = setTimeout(() => {
                if (next.length >= minSearchLength) {
                    onSearch(next);
                }
            }, 1000);
        }
    };

    // Focus the field as soon as it opens (but not on the initial mount when it
    // starts expanded, to avoid stealing focus on page load).
    const didMount = useRef(false);
    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true;
            return;
        }

        if (isExpanded) {
            inputRef.current?.focus();
        }
    }, [isExpanded]);

    const effectivePlaceholder = placeholder ?? t('search-placeholder', 'Suchen …');

    const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(event);

        if (event.defaultPrevented) {
            return;
        }

        if (event.key === 'Escape') {
            setExpandedState(false);
            return;
        }

        if (event.key === 'Enter') {
            clearPendingSearch();
            onSearch?.(currentValue);
        }
    };

    return (
        <div
            className={classNames(
                styles.search,
                { [styles.expanded]: isExpanded, [styles.disabled]: disabled },
                className,
            )}
            style={{ '--floating-search-width': `${expandedWidth}px` } as CSSProperties}
        >
            <button
                type="button"
                className={styles.toggle}
                disabled={disabled}
                aria-expanded={isExpanded}
                aria-controls={inputId}
                aria-label={t('floatingSearch.toggle', 'Suche ein-/ausklappen')}
                onClick={() => setExpandedState(!isExpanded)}
            >
                <span className={classNames(styles.arrow, { [styles.arrowOpen]: isExpanded })} aria-hidden>
                    <ArrowMenuOpenIcon />
                </span>
                <span className={styles.magnifier} aria-hidden>
                    <SearchOutlined />
                </span>
            </button>
            <div className={classNames(styles.reveal, { [styles.revealOpen]: isExpanded })}>
                <input
                    ref={inputRef}
                    id={inputId}
                    className={styles.input}
                    type="text"
                    hidden={!isExpanded}
                    aria-label={ariaLabel ?? effectivePlaceholder}
                    placeholder={effectivePlaceholder}
                    value={currentValue}
                    disabled={disabled}
                    onChange={(event) => updateValue(event.target.value)}
                    onClick={onClick}
                    onFocus={onFocus}
                    onKeyDown={onInputKeyDown}
                />
                {currentValue.length > 0 && (
                    <button
                        type="button"
                        className={styles.clear}
                        hidden={!isExpanded}
                        aria-label={t('searchInput.clear', 'Suche löschen')}
                        onClick={() => {
                            updateValue('');
                            inputRef.current?.focus();
                        }}
                    >
                        <CloseOutlined />
                    </button>
                )}
            </div>
        </div>
    );
};

export default FloatingSearch;
