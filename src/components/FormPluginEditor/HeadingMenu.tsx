import { useRef, useState } from 'react';
import { Dropdown } from 'antd';
import { ArrowDropDown, AutoStories, ExpandMore, Title } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import styles from './M3RichTextEditor.module.scss';

// TipTap's built-in heading shortcuts (StarterKit): Mod-Alt-1..3 — shown
// platform-aware (Figma 1280-73045).
const isMacLike = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);
const headingShortcut = (level: number, controlLabel: string) =>
    isMacLike ? `⌘⌥${level}` : `${controlLabel}+Alt+${level}`;

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
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const activeLevel = [1, 2, 3].find((level) => editor.isActive('heading', { level })) ?? 0;

    const closeMenu = () => {
        setOpen(false);
        setExpandedLevel(null);
        requestAnimationFrame(() => triggerRef.current?.focus());
    };

    const apply = (level: 0 | 1 | 2 | 3) => {
        if (level === 0) editor.chain().focus().setParagraph().run();
        else editor.chain().focus().toggleHeading({ level }).run();
        closeMenu();
    };

    // Escape closes the panel and returns focus to the trigger; the rows are
    // native buttons, so Tab already reaches them (no roving-tabindex needed).
    const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            closeMenu();
        }
    };

    const panel = (
        // rc-dropdown closes on ANY overlay click — swallow the bubble so the
        // expand/toggle rows keep the menu open; rows that should close call
        // setOpen(false) themselves, outside clicks still close via document.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
            ref={panelRef}
            className={styles.headingMenu}
            role="dialog"
            aria-label={t('editor.headingMenu.textFormat', 'Text format')}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onPanelKeyDown}
        >
            <div className={`${styles.headingMenuRow} ${activeLevel === 0 ? styles.headingMenuRowActive : ''}`}>
                <button type="button" className={styles.headingMenuItem} onClick={() => apply(0)}>
                    <span className={styles.menuItemGlyph}>Tt</span>
                    <span className={styles.menuItemLabel}>{t('editor.headingMenu.normalText', 'Normal text')}</span>
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
                            <button type="button" className={styles.headingMenuItem} onClick={() => apply(level)}>
                                <span className={styles.menuItemGlyph}>{`H${level}`}</span>
                                <span className={styles.menuItemLabel}>
                                    {t('editor.headingMenu.heading', { level, defaultValue: 'Heading {{level}}' })}
                                </span>
                                <span className={styles.menuItemHint}>
                                    {headingShortcut(level, t('editor.keyboard.control', 'Ctrl'))}
                                </span>
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
                                    aria-label={t('editor.headingMenu.autoChapterToggle', {
                                        level,
                                        defaultValue: 'Auto chapters for heading {{level}}',
                                    })}
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
                                        {auto
                                            ? t('editor.headingMenu.autoChapterOn', 'Auto chapters: on')
                                            : t('editor.headingMenu.autoChapterOff', 'Auto chapters: off')}
                                        <small>
                                            {auto
                                                ? t('editor.headingMenu.autoChapterDescriptionOn', {
                                                      level,
                                                      defaultValue:
                                                          'New heading {{level}} entries get a clickable anchor.',
                                                  })
                                                : t('editor.headingMenu.autoChapterDescriptionOff', {
                                                      level,
                                                      defaultValue:
                                                          'New heading {{level}} entries get no clickable anchor.',
                                                  })}
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
                if (next) {
                    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus());
                } else {
                    setExpandedLevel(null);
                    requestAnimationFrame(() => triggerRef.current?.focus());
                }
            }}
            // antd's dropdownRender contract is "function returning the overlay
            // element" — `panel` is a pre-built element, not a nested component.
            // eslint-disable-next-line react/no-unstable-nested-components
            dropdownRender={() => panel}
        >
            <button
                ref={triggerRef}
                type="button"
                className={`${styles.toolBtn} ${styles.menuBtn} ${activeLevel !== 0 ? styles.active : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                title={t('editor.headingMenu.textFormat', 'Text format')}
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <Title />
                <ArrowDropDown className={styles.caret} />
            </button>
        </Dropdown>
    );
};

export default HeadingMenu;
