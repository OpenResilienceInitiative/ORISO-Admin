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

/** One thing the view will show once data is there (title + one line). */
export interface DashboardEmptyStateHighlight {
    title: string;
    text: string;
}

export interface DashboardEmptyStateProps {
    /** Decorative icon, rendered inside the tinted circle. */
    icon?: ReactNode;
    /**
     * Decorative line-art picture (ORISO-Admin#1374). With it the state lays out
     * as a row: picture left, text and highlights right.
     */
    illustration?: string;
    /** What will appear here, in up to three short columns. */
    highlights?: DashboardEmptyStateHighlight[];
    title: string;
    description?: string;
    action?: DashboardEmptyStateAction;
    className?: string;
}

export const DashboardEmptyState = ({
    action,
    className,
    description,
    highlights,
    icon,
    illustration,
    title,
}: DashboardEmptyStateProps) => (
    <section
        className={`dashboardEmptyState${illustration ? ' dashboardEmptyState--withIllustration' : ''} ${
            className || ''
        }`}
    >
        {illustration && (
            <span className="dashboardEmptyState__illustration" aria-hidden="true">
                <img src={illustration} alt="" />
            </span>
        )}
        {!illustration && icon && (
            <span className="dashboardEmptyState__icon" aria-hidden="true">
                {icon}
            </span>
        )}
        <div className="dashboardEmptyState__body">
            <h2 className="dashboardEmptyState__title">{title}</h2>
            {description && <p className="dashboardEmptyState__description">{description}</p>}
            {!!highlights?.length && (
                <ul className="dashboardEmptyState__highlights">
                    {highlights.map((highlight) => (
                        <li key={highlight.title}>
                            <strong>{highlight.title}</strong>
                            <span>{highlight.text}</span>
                        </li>
                    ))}
                </ul>
            )}
            {action && (
                <Button type="primary" className="dashboardEmptyState__action" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    </section>
);

export default DashboardEmptyState;
