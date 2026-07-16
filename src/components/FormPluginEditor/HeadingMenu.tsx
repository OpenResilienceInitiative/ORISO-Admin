import { useState } from 'react';
import { Dropdown } from 'antd';
import { ArrowDropDown, AutoStories, ExpandMore, Title } from '@mui/icons-material';
import type { Editor } from '@tiptap/react';
import styles from './M3RichTextEditor.module.scss';

// TipTap's built-in heading shortcuts (StarterKit): Mod-Alt-1..3 — shown
// platform-aware (Figma 1280-73045).
const isMacLike = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);
const headingShortcut = (level: number) => (isMacLike ? `⌘⌥${level}` : `Strg+Alt+${level}`);

export type HeadingMenuProps = {
    editor: Editor;
    disabled?: boolean;
    /** Whether the per-level Auto-Chapters toggles are offered (only with anchors). */
    anchorsEnabled?: boolean;
    /** Per heading level: whether a new heading automatically gets a clickable anchor. */
    autoChapters: Record<number, boolean>;
    onToggleAutoChapters: (level: number) => void;
};

/**
 * Text-format menu (Figma 1280-73045): rows with glyph + label + keyboard
 * shortcut; each heading row expands (per Schrifttyp) to its own
 * "Auto-Kapitel" toggle — off = adding that heading creates no clickable
 * anchor — with a divider at the end of the expanded section.
 */
export const HeadingMenu = ({
    editor,
    disabled,
    anchorsEnabled,
    autoChapters,
    onToggleAutoChapters,
}: HeadingMenuProps) => {
    const [open, setOpen] = useState(false);
    const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

    const activeLevel = [1, 2, 3].find((level) => editor.isActive('heading', { level })) ?? 0;

    const apply = (level: 0 | 1 | 2 | 3) => {
        if (level === 0) editor.chain().focus().setParagraph().run();
        else editor.chain().focus().toggleHeading({ level }).run();
        setOpen(false);
    };

    const panel = (
        // rc-dropdown closes on ANY overlay click — swallow the bubble so the
        // expand/toggle rows keep the menu open; rows that should close call
        // setOpen(false) themselves, outside clicks still close via document.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div className={styles.headingMenu} role="menu" tabIndex={-1} onClick={(event) => event.stopPropagation()}>
            <div className={`${styles.headingMenuRow} ${activeLevel === 0 ? styles.headingMenuRowActive : ''}`}>
                <button type="button" className={styles.headingMenuItem} role="menuitem" onClick={() => apply(0)}>
                    <span className={styles.menuItemGlyph}>Tt</span>
                    <span className={styles.menuItemLabel}>Normaler Text</span>
                </button>
            </div>
            {([1, 2, 3] as const).map((level) => {
                const expanded = expandedLevel === level;
                const auto = autoChapters[level] !== false;
                return (
                    <div key={level}>
                        <div
                            className={`${styles.headingMenuRow} ${
                                activeLevel === level ? styles.headingMenuRowActive : ''
                            }`}
                        >
                            <button
                                type="button"
                                className={styles.headingMenuItem}
                                role="menuitem"
                                onClick={() => apply(level)}
                            >
                                <span className={styles.menuItemGlyph}>{`H${level}`}</span>
                                <span className={styles.menuItemLabel}>{`Überschrift ${level}`}</span>
                                <span className={styles.menuItemHint}>{headingShortcut(level)}</span>
                            </button>
                            {anchorsEnabled && (
                                <button
                                    type="button"
                                    // Keep the SAME icon element and rotate it via CSS: swapping
                                    // icons detaches the click target mid-click, which antd's
                                    // outside-click check then treats as "close the dropdown".
                                    className={`${styles.headingMenuExpand} ${
                                        expanded ? styles.headingMenuExpandOpen : ''
                                    }`}
                                    aria-expanded={expanded}
                                    aria-label={`Auto-Kapitel für Überschrift ${level}`}
                                    onClick={() => setExpandedLevel(expanded ? null : level)}
                                >
                                    <ExpandMore />
                                </button>
                            )}
                        </div>
                        {anchorsEnabled && expanded && (
                            <>
                                <button
                                    type="button"
                                    className={`${styles.headingMenuAuto} ${
                                        auto ? styles.autoChaptersOn : styles.autoChaptersOff
                                    }`}
                                    onClick={() => onToggleAutoChapters(level)}
                                >
                                    {/* Same icon element for both states (see expand note). */}
                                    <span className={styles.menuItemGlyph}>
                                        <AutoStories />
                                    </span>
                                    <span className={styles.menuItemLabel}>
                                        {auto ? 'Auto-Kapitel: an' : 'Auto-Kapitel: aus'}
                                        <small>
                                            {auto
                                                ? `Neue Überschriften ${level} erhalten einen klickbaren Anker.`
                                                : `Neue Überschriften ${level} erhalten keinen klickbaren Anker.`}
                                        </small>
                                    </span>
                                </button>
                                {/* Divider at the end of the expanded section (Figma annotation). */}
                                <hr className={styles.headingMenuDivider} />
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <Dropdown
            trigger={['click']}
            disabled={disabled}
            placement="bottom"
            open={disabled ? false : open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setExpandedLevel(null);
            }}
            // antd's dropdownRender contract is "function returning the overlay
            // element" — `panel` is a pre-built element, not a nested component.
            // eslint-disable-next-line react/no-unstable-nested-components
            dropdownRender={() => panel}
        >
            <button
                type="button"
                className={`${styles.toolBtn} ${styles.menuBtn} ${activeLevel !== 0 ? styles.active : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                title="Textformat"
                disabled={disabled}
            >
                <Title />
                <ArrowDropDown className={styles.caret} />
            </button>
        </Dropdown>
    );
};

export default HeadingMenu;
