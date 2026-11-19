import { useId, useState, type ReactNode } from 'react';
import classNames from 'classnames';
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
    /** Open on first render. */
    defaultOpen?: boolean;
    /** Centre the document heading and animate its body into the folded tile. */
    documentMotion?: boolean;
    /** Called with the new state when the header is toggled, so a parent that rebuilds the tile can keep it open. */
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
    className?: string;
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
    documentMotion = false,
    onOpenChange,
    children,
    className,
}: CollapsibleTileProps) => {
    const [open, setOpen] = useState(defaultOpen);
    const [mounted, setMounted] = useState(defaultOpen);
    const bodyId = useId();

    const toggle = () => {
        const next = !open;
        setMounted(true);
        setOpen(next);
        onOpenChange?.(next);
    };

    return (
        <section
            className={classNames(
                styles.tile,
                { [styles.open]: open, [styles.documentMotion]: documentMotion },
                className,
            )}
            data-collapsible-tile
        >
            <h3 className={styles.heading}>
                <button
                    type="button"
                    className={styles.header}
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={toggle}
                >
                    <span className={styles.label}>
                        <span className={styles.icon} aria-hidden>
                            {icon}
                        </span>
                        <span className={styles.title}>{title}</span>
                    </span>
                    <span className={styles.trailing}>
                        {status && (
                            <span
                                className={classNames(styles.chip, {
                                    [styles.chipAttention]: statusTone === 'attention',
                                })}
                            >
                                {status}
                            </span>
                        )}
                        <ExpandMoreIcon className={styles.chevron} aria-hidden />
                    </span>
                </button>
            </h3>
            {documentMotion ? (
                <div
                    id={bodyId}
                    className={styles.motionBody}
                    aria-hidden={!open}
                    inert={!open}
                    data-collapsible-tile-body
                >
                    <div className={styles.motionClip}>
                        <div className={styles.body}>{mounted && children}</div>
                    </div>
                </div>
            ) : (
                <div id={bodyId} className={styles.body} hidden={!open} data-collapsible-tile-body>
                    {mounted && children}
                </div>
            )}
        </section>
    );
};
