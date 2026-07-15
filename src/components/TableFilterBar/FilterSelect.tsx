import { forwardRef, useId, useState, type ReactNode } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface FilterOption {
    label: string;
    value: string;
}

export interface FilterSelectProps {
    /** Facet name shown as the placeholder when nothing is selected. */
    label: string;
    /** Leading icon (typically an antd icon). */
    icon?: ReactNode;
    options: FilterOption[];
    value?: string | null;
    disabled?: boolean;
    onChange?: (value: string | null) => void;
    className?: string;
}

/**
 * A bordered single-select filter, drawn as a split pill: an [icon + label] segment
 * and a separate chevron segment. Default shows a light-grey outline + grey content;
 * focus/open lifts it (elevation); a selected value turns the content brand-red and
 * keeps the lift. Standalone and composable inside `TableFilterBar`.
 */
export const FilterSelect = forwardRef<HTMLButtonElement, FilterSelectProps>(function FilterSelect(
    { label, icon, options, value, disabled = false, onChange, className },
    ref,
) {
    const [open, setOpen] = useState(false);
    const menuId = useId();
    const isOpen = open && !disabled;
    const selected = value != null ? options.find((option) => option.value === value) : undefined;

    const items: MenuProps['items'] = options.map((option) => ({ key: option.value, label: option.label }));

    return (
        <Dropdown
            trigger={['click']}
            open={isOpen}
            onOpenChange={setOpen}
            disabled={disabled}
            menu={{
                id: menuId,
                items,
                selectable: true,
                selectedKeys: selected ? [selected.value] : [],
                onSelect: ({ key }) => {
                    onChange?.(key);
                    setOpen(false);
                },
            }}
        >
            <button
                ref={ref}
                type="button"
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={isOpen ? menuId : undefined}
                className={classNames(
                    styles.split,
                    {
                        [styles.splitSelected]: Boolean(selected),
                        [styles.splitOpen]: isOpen,
                        [styles.splitDisabled]: disabled,
                    },
                    className,
                )}
            >
                <span className={styles.splitMain}>
                    {icon && (
                        <span className={styles.icon} aria-hidden>
                            {icon}
                        </span>
                    )}
                    <span className={selected ? styles.label : styles.placeholder}>
                        {selected ? selected.label : label}
                    </span>
                </span>
                <span className={styles.splitCaret} aria-hidden>
                    <span className={classNames(styles.chevron, { [styles.chevronOpen]: isOpen })}>
                        <DownOutlined />
                    </span>
                </span>
            </button>
        </Dropdown>
    );
});

export default FilterSelect;
