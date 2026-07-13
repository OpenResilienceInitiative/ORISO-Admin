import { CheckOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import type { HeadingAnchor } from './headingAnchors';

export type AnchorChipsProps = {
    anchors: HeadingAnchor[];
    /** The anchor that was last clicked or scrolled to (read-only mode shows a checkmark on it). */
    activeId?: string | null;
    /** Edit mode: chips get an "x" to remove the anchor. Read-only: no "x", active chip shows a checkmark. */
    editable?: boolean;
    onSelect: (anchorId: string) => void;
    onRemove?: (anchorId: string) => void;
    ariaLabel?: string;
    /** Extra class for host-specific styling (e.g. the M3 editor's module class). */
    className?: string;
};

// Horizontal, scrollable row of anchor chips rendered above the editor
// content — on narrow screens it works as a swipeable tag row.
const AnchorChips = ({
    anchors,
    activeId = null,
    editable = false,
    onSelect,
    onRemove,
    ariaLabel,
    className,
}: AnchorChipsProps) => {
    if (!anchors.length) return null;

    return (
        <div
            className={className ? `RichEditor-anchorNav ${className}` : 'RichEditor-anchorNav'}
            role="navigation"
            aria-label={ariaLabel}
        >
            {anchors.map((anchor) => {
                const active = anchor.id === activeId;
                return (
                    <Tag
                        key={anchor.id}
                        data-anchor-chip={anchor.id}
                        color={active ? 'blue' : undefined}
                        icon={!editable && active ? <CheckOutlined /> : undefined}
                        closable={editable}
                        onClose={(event) => {
                            // We remove the anchor from the document; the chip
                            // disappears via state, not via antd's own hiding.
                            event.preventDefault();
                            event.stopPropagation();
                            onRemove?.(anchor.id);
                        }}
                        onClick={() => onSelect(anchor.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onSelect(anchor.id);
                            }
                        }}
                        aria-pressed={active}
                    >
                        {anchor.text}
                    </Tag>
                );
            })}
        </div>
    );
};

export default AnchorChips;
