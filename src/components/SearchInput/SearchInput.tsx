import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

interface SearchInputProps {
    ariaLabel?: string;
    handleOnSearch?: (query: string) => void;
    handleOnSearchClear?: () => void;
    placeholder?: string;
    className?: string;
    value?: string;
    minSearchLength?: number;
    searchOnChange?: boolean;
    onClick?: () => void;
    onFocus?: () => void;
    onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
    onValueChange?: (value: string) => void;
}

export const SearchInput = ({
    ariaLabel,
    className,
    handleOnSearch,
    handleOnSearchClear,
    minSearchLength = 3,
    onClick,
    onFocus,
    onKeyDown,
    onValueChange,
    placeholder,
    searchOnChange = true,
    value,
}: SearchInputProps) => {
    const { t } = useTranslation();
    const [internalSearchValue, setInternalSearchValue] = useState('');
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const defaultPlaceholder = t('search-placeholder');
    const isControlled = value !== undefined;
    const searchValue = isControlled ? value : internalSearchValue;
    const hasSearchValue = searchValue.length > 0;

    useEffect(
        () => () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        },
        [],
    );

    const updateSearchValue = (nextValue: string) => {
        if (!isControlled) {
            setInternalSearchValue(nextValue);
        }

        onValueChange?.(nextValue);
    };

    const executeSearch = (query: string) => {
        handleOnSearch?.(query);
    };

    const clearSearch = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        updateSearchValue('');
        handleOnSearchClear?.();
    };

    const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.target.value;
        updateSearchValue(nextValue);

        if (handleOnSearch && searchOnChange) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                if (nextValue.length >= minSearchLength) {
                    handleOnSearch(nextValue);
                }
            }, 1000);
        }

        if (nextValue === '') {
            handleOnSearchClear?.();
        }
    };

    const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(event);

        if (event.defaultPrevented) {
            return;
        }

        if (event.key === 'Enter') {
            executeSearch(searchValue);
        }
    };

    return (
        <div className={classNames(styles.search, className)}>
            <Input
                aria-label={ariaLabel}
                name="search"
                value={searchValue}
                placeholder={placeholder || defaultPlaceholder}
                autoComplete="search"
                onChange={onSearchChange}
                onClick={onClick}
                onFocus={onFocus}
                onKeyDown={onSearchKeyDown}
            />
            <button
                className={styles.actionButton}
                type="button"
                aria-label={
                    hasSearchValue
                        ? t('searchInput.clear', 'Suche löschen')
                        : t('searchInput.submit', 'Suche ausführen')
                }
                onClick={() => {
                    if (hasSearchValue) {
                        clearSearch();
                        return;
                    }

                    executeSearch(searchValue);
                }}
            >
                {hasSearchValue ? <CloseOutlined /> : <SearchOutlined />}
            </button>
        </div>
    );
};

export default SearchInput;
