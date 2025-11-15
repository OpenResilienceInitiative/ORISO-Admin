import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

interface SearchInputProps {
    handleOnSearch?: (query: string) => void;
    handleOnSearchClear?: () => void;
    placeholder?: string;
}

export const SearchInput = ({ handleOnSearch, handleOnSearchClear, placeholder }: SearchInputProps) => {
    const { t } = useTranslation();
    let timer: ReturnType<typeof setTimeout>;
    const defaultPlaceholder = t('search-placeholder');

    const { Search } = Input;

    const onSearchChange = (e: any) => {
        if (handleOnSearch) {
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (e.target.value.length >= 3) handleOnSearch(e.target.value);
            }, 1000);
        }

        if (e.target.value === '') {
            if (handleOnSearchClear) handleOnSearchClear();
        }
    };
    return (
        <Search
            className={styles.search}
            name="search"
            allowClear
            placeholder={placeholder || defaultPlaceholder}
            autoComplete="search"
            onChange={onSearchChange}
            onSearch={handleOnSearch}
        />
    );
};

export default SearchInput;
