import { ReactNode } from 'react';
import classNames from 'classnames';
import { NavLink } from 'react-router-dom';
import styles from './AdminSegmentedTabs.module.scss';

export type AdminSegmentedTabItem = {
    id: string;
    label: string;
    icon?: ReactNode;
    activeIcon?: ReactNode;
    to?: string;
    /** Forwarded to `NavLink` — exact-match only, for a `to` that is a prefix of its siblings. */
    end?: boolean;
    disabled?: boolean;
};

interface AdminSegmentedTabsProps {
    ariaLabel: string;
    items: AdminSegmentedTabItem[];
    activeId?: string;
    className?: string;
    onChange?: (id: string) => void;
}

export const AdminSegmentedTabs = ({ activeId, ariaLabel, className, items, onChange }: AdminSegmentedTabsProps) => {
    const renderContent = (item: AdminSegmentedTabItem, isActive: boolean) => (
        <>
            {(isActive ? item.activeIcon || item.icon : item.icon) && (
                <span className={styles.icon} aria-hidden>
                    {isActive ? item.activeIcon || item.icon : item.icon}
                </span>
            )}
            <span className={styles.label}>{item.label}</span>
        </>
    );

    const getItemClassName = (isActive: boolean, isDisabled?: boolean) =>
        classNames(styles.item, {
            [styles.itemActive]: isActive,
            [styles.itemDisabled]: isDisabled,
        });

    return (
        <div className={classNames(styles.container, className)}>
            <div className={styles.scroll}>
                <div className={styles.group} role="tablist" aria-label={ariaLabel}>
                    {items.map((item) => {
                        if (item.disabled || !item.to) {
                            const isActive = item.id === activeId;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-disabled={item.disabled || undefined}
                                    className={getItemClassName(isActive, item.disabled)}
                                    disabled={item.disabled}
                                    onClick={() => {
                                        if (!item.disabled) {
                                            onChange?.(item.id);
                                        }
                                    }}
                                >
                                    {renderContent(item, isActive)}
                                </button>
                            );
                        }

                        return (
                            <NavLink
                                key={item.id}
                                to={item.to}
                                end={item.end}
                                role="tab"
                                className={({ isActive }) =>
                                    getItemClassName(activeId ? item.id === activeId : isActive, item.disabled)
                                }
                                onClick={() => onChange?.(item.id)}
                            >
                                {({ isActive }) => renderContent(item, activeId ? item.id === activeId : isActive)}
                            </NavLink>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminSegmentedTabs;
