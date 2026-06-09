import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

interface SearchInputProps {
    handleOnSearch?: (query: string) => void;
    handleOnSearchClear?: () => void;
    placeholder?: string;
    className?: string;
}

export const SearchInput = ({ handleOnSearch, handleOnSearchClear, placeholder, className }: SearchInputProps) => {
    const { t } = useTranslation();
    const [searchValue, setSearchValue] = useState('');
    const timerRef = useRef<ReturnType<typeof setTimeout>>();
    const defaultPlaceholder = t('search-placeholder');
    const hasSearchValue = searchValue.length > 0;

    useEffect(
        () => () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        },
        [],
    );

    const executeSearch = (query: string) => {
        handleOnSearch?.(query);
    };

    const clearSearch = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setSearchValue('');
        handleOnSearchClear?.();
    };

    const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const nextValue = e.target.value;
        setSearchValue(nextValue);

        if (handleOnSearch) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                if (nextValue.length >= 3) handleOnSearch(nextValue);
            }, 1000);
        }

        if (nextValue === '') {
            handleOnSearchClear?.();
        }
    };

    const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            executeSearch(searchValue);
        }
    };

    return (
        <div className={classNames(styles.search, className)}>
            <Input
                name="search"
                value={searchValue}
                placeholder={placeholder || defaultPlaceholder}
                autoComplete="search"
                onChange={onSearchChange}
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
