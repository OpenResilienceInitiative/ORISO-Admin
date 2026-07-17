import type { ReactNode } from 'react';
import { Button } from 'antd';
import classNames from 'classnames';
import { hasPillSelection, PillSelect, type PillSelectProps } from './index';
import styles from './styles.module.scss';

export type PillFilterConfig = PillSelectProps & {
    /** Stable identifier of the filter within the row. */
    key: string;
    /**
     * Whether the filter gates the action button. Defaults to `true` — the
     * Figma spec enables the action only once every filter has a selection.
     */
    required?: boolean;
};

export interface PillFilterRowAction {
    label: ReactNode;
    icon?: ReactNode;
    onClick?: () => void;
}

interface PillFilterRowProps {
    filters: PillFilterConfig[];
    /**
     * Action button slot. Rendered disabled until every required pill has a
     * selection, then flips to `type="primary"` (filled brand surface).
     */
    action?: PillFilterRowAction;
    className?: string;
}

/**
 * Global search filter row (Figma section 1165:17005): a set of {@link PillSelect}
 * filters followed by an action button that is disabled until all required
 * filters are selected and turns primary once they are.
 */
export const PillFilterRow = ({ filters, action, className }: PillFilterRowProps) => {
    const ready = filters.every((filter) => filter.required === false || hasPillSelection(filter));

    return (
        <div className={classNames(styles.row, className)}>
            {filters.map(({ key, required, ...pillProps }) => (
                <PillSelect key={key} {...(pillProps as PillSelectProps)} />
            ))}
            {action && (
                <Button
                    className={styles.action}
                    type={ready ? 'primary' : 'default'}
                    disabled={!ready}
                    icon={action.icon}
                    onClick={action.onClick}
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
};
