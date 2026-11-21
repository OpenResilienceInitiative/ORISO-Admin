import { useEffect, useId, useState, type ReactNode } from 'react';
import classNames from 'classnames';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import styles from './styles.module.scss';

export interface CollapsibleTileProps {
    /** Icon of the tile, monochrome, 24px. */
    icon: ReactNode;
    title: string;
    /** Short state next to the title, e.g. "Empty" or "Published". */
    status?: string;
    /** Marks the chip as something that needs attention instead of a plain state. */
    statusTone?: 'neutral' | 'attention';
    /** Open on first render, or controlled by an owning surface. */
    defaultOpen?: boolean;
    open?: boolean;
    /** Called with the new state when the header is toggled, so a parent that rebuilds the tile can keep it open. */
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
    className?: string;
    /**
     * Set: the icon is a button of its own (e.g. to rename the tile's subject, ORISO-Admin#1558);
     * the rest of the header still folds the tile.
     */
    onIconClick?: () => void;
    /** Accessible name of the icon button; required with `onIconClick`. */
    iconLabel?: string;
}

/**
 * A tile that folds up to its header: icon, title, state chip and a chevron. For tiles that hold a
 * long document, so a page of them can be scanned and one opened to edit. The body mounts when the
 * tile is first opened and stays mounted, so an unsaved draft survives folding it up.
 */
export const CollapsibleTile = ({
    icon,
    title,
    status,
    statusTone = 'neutral',
    defaultOpen = false,
    open: controlledOpen,
    onOpenChange,
    children,
    className,
    onIconClick,
    iconLabel,
}: CollapsibleTileProps) => {
    const [internalOpen, setOpen] = useState(defaultOpen);
    const open = controlledOpen ?? internalOpen;
    const [mounted, setMounted] = useState(defaultOpen || !!controlledOpen);
    const bodyId = useId();
    useEffect(() => {
        if (open) setMounted(true);
    }, [open]);

    const toggle = () => {
        const next = !open;
        setMounted(true);
        setOpen(next);
        onOpenChange?.(next);
    };

    return (
        <section className={classNames(styles.tile, { [styles.open]: open }, className)} data-collapsible-tile>
            <h3 className={classNames(styles.heading, { [styles.withIconButton]: onIconClick })}>
                {onIconClick && (
                    <button type="button" className={styles.iconButton} aria-label={iconLabel} onClick={onIconClick}>
                        <span className={styles.icon} aria-hidden>
                            {icon}
                        </span>
                        <EditIcon className={styles.iconButtonBadge} aria-hidden />
                    </button>
                )}
                <button
                    type="button"
                    className={styles.header}
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={toggle}
                >
                    {!onIconClick && (
                        <span className={styles.icon} aria-hidden>
                            {icon}
                        </span>
                    )}
                    <span className={styles.title}>{title}</span>
                    {status && (
                        <span
                            className={classNames(styles.chip, { [styles.chipAttention]: statusTone === 'attention' })}
                        >
                            {status}
                        </span>
                    )}
                    <ExpandMoreIcon className={styles.chevron} aria-hidden />
                </button>
            </h3>
            <div id={bodyId} className={styles.body} hidden={!open} data-collapsible-tile-body>
                {(mounted || open) && children}
            </div>
        </section>
    );
};
