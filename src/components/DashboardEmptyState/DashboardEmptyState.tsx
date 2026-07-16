import type { ReactNode } from 'react';
import { Button } from 'antd';

/**
 * Friendly full-width empty state for dashboards and list pages (Figma Admin.ORISO,
 * "Keine Daten" redesign). Explains ONCE why a view is empty and what will fill it,
 * so the individual widgets below can stay quiet instead of repeating "Keine Daten".
 *
 * Styling lives in `src/styles/components/emptyState.less` (global stylesheet, loaded
 * by the app shell and the Storybook preview alike).
 */
export interface DashboardEmptyStateAction {
    label: string;
    onClick: () => void;
}

export interface DashboardEmptyStateProps {
    /** Decorative icon, rendered inside the tinted circle. */
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: DashboardEmptyStateAction;
    className?: string;
}

export const DashboardEmptyState = ({ action, className, description, icon, title }: DashboardEmptyStateProps) => (
    <section className={`dashboardEmptyState ${className || ''}`}>
        {icon && (
            <span className="dashboardEmptyState__icon" aria-hidden="true">
                {icon}
            </span>
        )}
        <h2 className="dashboardEmptyState__title">{title}</h2>
        {description && <p className="dashboardEmptyState__description">{description}</p>}
        {action && (
            <Button type="primary" className="dashboardEmptyState__action" onClick={action.onClick}>
                {action.label}
            </Button>
        )}
    </section>
);

export default DashboardEmptyState;
