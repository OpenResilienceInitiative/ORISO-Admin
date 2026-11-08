import type { ElementType, ReactNode } from 'react';
import { CollapsibleTile } from '../../../../CollapsibleTile';
import { TileHelpButton, type TileHelpTopic } from '../../../../TileHelp';
import type { LegalDocumentTileStatus } from './legalDocumentStatus';
import styles from './styles.module.scss';

export type { LegalDocumentTileStatus } from './legalDocumentStatus';

interface LegalDocumentTileProps {
    icon: ElementType;
    title: string;
    /** Short state in the folded header, e.g. "Published". Left out while the card is still loading. */
    status?: LegalDocumentTileStatus;
    /** The tile's explanation (slideshow). It is part of the unfolded content only, never of the header. */
    help?: TileHelpTopic;
    /** Text above the editor, next to the explanation button: the publication state and the role-based help. */
    intro?: ReactNode;
    defaultOpen?: boolean;
    /** Reports every toggle, so a parent that rebuilds the tile can keep it open. */
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
}

/**
 * A legal document (data processing agreement, imprint, privacy statement) as a tile that folds up to its
 * header. The header carries icon, title and state; the explanation button and the help text sit at the top of
 * the unfolded content, so the editor inside does not repeat the title (it is rendered with `hideHeader`).
 */
export const LegalDocumentTile = ({
    icon: Icon,
    title,
    status,
    help,
    intro,
    defaultOpen,
    onOpenChange,
    children,
}: LegalDocumentTileProps) => {
    // The help dialog shows the tile's own icon where it takes one; without it, it keeps the info icon.
    const helpIcon = { tileIcon: <Icon /> };

    return (
        <CollapsibleTile
            icon={<Icon />}
            title={title}
            status={status?.label}
            statusTone={status?.tone}
            defaultOpen={defaultOpen}
            onOpenChange={onOpenChange}
        >
            <div className={styles.document}>
                {(intro || help) && (
                    <div className={styles.intro} data-legal-document-intro>
                        <div className={styles.introText}>{intro}</div>
                        {help && <TileHelpButton topic={help} tileTitle={title} {...helpIcon} />}
                    </div>
                )}
                {children}
            </div>
        </CollapsibleTile>
    );
};
