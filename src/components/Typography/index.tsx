import type { ElementType, ReactNode } from 'react';
import classNames from 'classnames';

/** M3 type scale (Figma Admin.ORISO). Each variant maps to a global `.m3-*`
 *  utility class defined in app.css, so React and CSS-module code share one
 *  source of truth. */
export type TypographyVariant =
    | 'headline-small'
    | 'title-medium'
    | 'title-small'
    | 'body-large'
    | 'body-medium'
    | 'body-medium-emphasized'
    | 'body-small'
    | 'label-large';

export interface TypographyProps {
    variant: TypographyVariant;
    /** Rendered element. Defaults to a sensible tag per variant (headline→h2, else p). */
    as?: ElementType;
    /** M3 colour role; defaults to on-surface. */
    color?: string;
    className?: string;
    children: ReactNode;
    title?: string;
}

const DEFAULT_TAG: Record<TypographyVariant, ElementType> = {
    'headline-small': 'h2',
    'title-medium': 'h3',
    'title-small': 'h4',
    'body-large': 'p',
    'body-medium': 'p',
    'body-medium-emphasized': 'p',
    'body-small': 'p',
    'label-large': 'span',
};

/**
 * The admin's M3 typography atom. Prefer this over raw tags / antd Typography so
 * every text style traces back to a Figma token. For CSS-module components that
 * can't nest a React element, apply the same `m3-<variant>` class directly.
 */
export const Typography = ({ variant, as, color, className, children, title }: TypographyProps) => {
    const Tag = as ?? DEFAULT_TAG[variant];
    return (
        <Tag
            className={classNames(`m3-${variant}`, className)}
            style={{ color: color ?? 'var(--m3-on-surface, #1b1b1c)', margin: 0 }}
            title={title}
        >
            {children}
        </Tag>
    );
};
