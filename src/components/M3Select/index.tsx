// eslint-disable-next-line no-restricted-imports -- This is the shared AntD adapter.
import { Select } from 'antd';
import type { BaseOptionType, DefaultOptionType, SelectProps } from 'antd/es/select';
import classNames from 'classnames';
import { KeyboardArrowDownIcon } from '../CustomIcons/EditorIcons';
import styles from './m3Select.module.scss';

/** Shared trailing control for AntD selects while preserving their field and menu APIs. */
export const M3Select = <ValueType = any, OptionType extends BaseOptionType = DefaultOptionType>({
    className,
    loading,
    suffixIcon = <KeyboardArrowDownIcon className={styles.chevron} />,
    ...props
}: SelectProps<ValueType, OptionType>) => (
    <Select<ValueType, OptionType>
        {...props}
        className={classNames(styles.select, className)}
        loading={loading}
        // AntD renders the spinner only when it owns the suffix.
        suffixIcon={loading ? undefined : suffixIcon}
    />
);
