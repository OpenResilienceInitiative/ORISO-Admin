import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Editor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Dropdown, Modal } from 'antd';
import {
    Close,
    Undo,
    Redo,
    Checklist as ChecklistIcon,
    FormatColorReset,
    FormatListBulleted,
    FormatListNumbered,
    FormatQuote,
    DataObject,
    Code,
    FormatBold,
    FormatItalic,
    StrikethroughS,
    FormatUnderlined,
    BorderColor,
    Link as LinkIcon,
    Superscript as SuperscriptIcon,
    Subscript as SubscriptIcon,
    FormatAlignLeft,
    FormatAlignCenter,
    FormatAlignRight,
    FormatAlignJustify,
    Image as ImageIcon,
    Restore,
    Schedule,
    Language,
    ArrowDropDown,
    Fingerprint,
    TextFields,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { ResolvingImage } from './createResolvingImage';
import {
    CrossReferenceIcon,
    KeyboardArrowDownIcon,
    MaximizeContentIcon,
    MinimizeContentIcon,
    PublishedIcon,
    EditIcon,
} from '../CustomIcons/EditorIcons';
import { createImageDropPasteHandlers, useEditorImageUpload } from './useEditorImageUpload';
import { HeadingAnchors } from './headingAnchors';
import { HeadingMenu } from './HeadingMenu';
import { SplitDropdown } from './SplitDropdown';
import AnchorChips from './AnchorChips';
import { useHeadingAnchorNav } from './useHeadingAnchorNav';
import styles from './M3RichTextEditor.module.scss';

/** A saved, published version the editor can look back at (read-only). */
export type EditorVersion = {
    /** Stable id (e.g. the activation timestamp). */
    id: string;
    /** Human label shown in the version menu (e.g. a formatted date). */
    label: string;
    /** The version's HTML content. */
    content: string;
    /** False when content is a preview fallback from another language. */
    restorable?: boolean;
};

export type M3RichTextEditorProps = {
    title?: string;
    /** Header icon component; defaults to the Impressum fingerprint. */
    icon?: React.ElementType;
    value?: string;
    /**
     * Saved versions for the look-back select (newest first). Selecting one shows
     * its content read-only with a restore/back banner; restoring is a copy into
     * the draft (append-only history — the old version is never mutated).
     */
    versions?: EditorVersion[];
    /** Called with a version's content when the admin restores it as a new draft (copy). */
    onRestoreVersion?: (content: string) => void;
    /**
     * The version currently being looked at, or `null` for the editable draft.
     * A card whose document has more fields than this editor's body — the DPP and
     * its consent sentence (ADR-021 decision 4) — needs this to switch those fields
     * to the same version, so a look-back never shows an archived policy next to
     * today's consent wording.
     */
    onViewVersionChange?: (versionId: string | null) => void;
    onChange?: (html: string) => void;
    placeholder?: string;
    /**
     * Template placeholders (key -> i18n label key). When present, the toolbar gets a
     * dropdown that inserts the literal `${key}` text at the cursor — the same storage
     * format the legacy legal-text editor used, so old content round-trips identically.
     */
    placeholders?: { [key: string]: string };
    languages?: { value: string; label: string }[];
    language?: string;
    onLanguageChange?: (lng: string) => void;
    versionLabel?: string;
    /** Disables the publish action while a publish request is in flight. */
    publishing?: boolean;
    /**
     * View-only mode: the card is a READER — the content is not editable and
     * the editing affordances (formatting toolbar, publish/draft actions, and
     * a version control with nothing to look back at) are not rendered at all.
     * The fullscreen control stays: reading a long text full-screen is not
     * editing. Note this is NOT the same as the version look-back, which
     * deliberately keeps the toolbar visible but inert (Figma 1261-51137).
     */
    readOnly?: boolean;
    /**
     * Fluid sizing: the card fills its host column instead of the fixed
     * 800x740 admin deck card, and it does NOT bring a scroll container of its
     * own — the host surface scrolls (the bounded sheet on desktop, the page on
     * a phone) and the chapter chips stay reachable by sticking to the bottom
     * of the card. For hosts that are not the settings deck — e.g. the public
     * tenant-onboarding DPA step and the DPA blocker (#594).
     */
    fluid?: boolean;
    /**
     * Language of the CONTENT (not the UI), e.g. the legal text's own language.
     * Sets `lang` on the text region so hyphenation works; falls back to the
     * editor's `language` (the language switcher's value).
     */
    contentLanguage?: string;
    /**
     * Drops the card's own icon + title row. For hosts that already carry the
     * same heading right above the card — the DPA blocker states the agreement's
     * name once, centred, and repeating it inside the card was the duplicate
     * title in Figma 1611-27868. `title` is still required: it stays the
     * accessible name of the reading region.
     */
    hideHeader?: boolean;
    /** Replaces the built-in language split button (e.g. the legal MT-aware language select). */
    languageSlot?: React.ReactNode;
    /**
     * "Editor Help Texts" block (info icon + role/state description) rendered
     * directly under the header, before the language row (Figma 1227-17235).
     */
    helpSlot?: React.ReactNode;
    /**
     * Dismissible functionality hint rendered below the editor surface. It is
     * deliberately kept in the document flow so it never obscures legal text.
     */
    snackbarSlot?: React.ReactNode;
    /**
     * Second split button in the bottom function bar (between language and
     * version) — e.g. a topic/department picker (Figma 1261-48667 allows up
     * to three split button fields).
     */
    topicSlot?: React.ReactNode;
    /** Rendered between the toolbar and the editor (e.g. per-field translate button). */
    aboveEditorSlot?: React.ReactNode;
    /**
     * Replaces the built-in toolbar + editor entirely (e.g. Form-bound TiptapEditors that
     * bring their own toolbar, placeholder plugin and anchor navigation). With an editorSlot
     * the onPublish/onSaveDraft callbacks receive an empty string — the consumer owns the content.
     */
    editorSlot?: React.ReactNode;
    /** Rendered below the action footer (e.g. version history, modals). */
    belowSlot?: React.ReactNode;
    /**
     * Anchor navigation (standard, ON by default): headings get persistent
     * `id`s, a horizontal chip row above the editor jumps to them, and
     * selected text can be linked to an anchor via the bubble menu. Only
     * applies to the built-in editor (an `editorSlot` owns its own anchors).
     * Must not change during the editor's lifetime.
     */
    enableAnchors?: boolean;
    onPublish?: (html: string) => void;
    onSaveDraft?: (html: string) => void;
};

const isEmptyHtml = (html: string) => html === '' || html === '<p></p>';

/**
 * Stacking level of the fullscreen reading dialog (#594.9).
 *
 * antd renders every Modal at z-index 1000. Application-level overlays that
 * must outrank *every* popup sit above that — the global DPA blocker
 * (`DpaBlocker/styles.module.scss`, #572) owns 1300 — so a fullscreen dialog
 * opened from inside such an overlay was painted BEHIND an opaque surface and
 * the agreement text simply vanished. The dialog therefore declares a level
 * above every app overlay. This is a property of the shared component, so
 * every consumer is fixed at once, not just the DPA reader.
 */
export const EDITOR_FULLSCREEN_Z_INDEX = 1400;

/**
 * Editing surface: the ProseMirror contenteditable exposes role="textbox"
 * (browser-only) but no accessible name (axe: aria-input-field-name, WCAG
 * 4.1.2) — pin the role and label it with the card title.
 *
 * Reading surface (`readOnly`): there is no contenteditable and therefore no
 * implicit role. Announcing a 60-page contract as a text INPUT would drop
 * screen readers into forms mode, so the element stays plain — the scroll
 * viewport around it carries the labelled `region` instead.
 */
const editorSurfaceAttributes = (readOnly: boolean | undefined, title: string) =>
    readOnly ? {} : { 'aria-label': title, role: 'textbox' };

/** Version ids are ISO activation dates (DPA container) — null when they aren't parseable. */
export const parseVersionDate = (id: string): Date | null => {
    const dateOnly = id.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
        const year = Number(dateOnly[1]);
        const month = Number(dateOnly[2]);
        const day = Number(dateOnly[3]);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    }
    const date = new Date(id);
    return Number.isNaN(date.getTime()) ? null : date;
};

// Marker palette for the highlight colour menu (soft M3-friendly pastels).
// Labels are resolved via i18n at render time (editor.highlight.<key>).
const HIGHLIGHT_COLORS = [
    { key: 'yellow', color: '#fff176', fallback: 'Yellow' },
    { key: 'green', color: '#b9f6ca', fallback: 'Green' },
    { key: 'blue', color: '#b3e5fc', fallback: 'Blue' },
    { key: 'pink', color: '#f8bbd0', fallback: 'Pink' },
    { key: 'orange', color: '#ffcc80', fallback: 'Orange' },
];

type ToolButtonProps = {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
};
const ToolButton = ({ onClick, active, disabled, title, children }: ToolButtonProps) => (
    <button
        type="button"
        className={`${styles.toolBtn} ${active ? styles.active : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-pressed={active}
    >
        {children}
    </button>
);

// One menu row: leading glyph/icon, label, trailing keyboard shortcut.
const MenuRow = ({ glyph, label, hint }: { glyph: React.ReactNode; label: React.ReactNode; hint?: string }) => (
    <span className={styles.menuItemRow}>
        <span className={styles.menuItemGlyph}>{glyph}</span>
        <span className={styles.menuItemLabel}>{label}</span>
        {hint && <span className={styles.menuItemHint}>{hint}</span>}
    </span>
);

type ToolbarProps = {
    editor: Editor;
    /** Read mode / version look-back: formatting stays visible but inert (Figma 1261-51137). */
    disabled?: boolean;
    /** Leading control before the first divider — the maximize/exit-fullscreen button. */
    leading?: React.ReactNode;
    /** Whether the heading menu offers the Auto-Chapters toggles (only with anchors). */
    anchorsEnabled?: boolean;
    /** Per heading level: whether a new heading automatically gets an anchor. */
    autoChapters?: Record<number, boolean>;
    onToggleAutoChapters?: (level: number) => void;
    /** Template placeholders (key -> i18n label key) inserted as literal `${key}` text. */
    placeholders?: { [key: string]: string };
    /** Opens the image file picker (upload to the tenant media endpoint). */
    onInsertImage?: () => void;
    /** Upload in flight: the image button shows busy state. */
    imageUploading?: boolean;
};

const Toolbar = ({
    editor,
    disabled,
    leading,
    anchorsEnabled,
    autoChapters,
    onToggleAutoChapters,
    placeholders,
    onInsertImage,
    imageUploading,
}: ToolbarProps) => {
    const { t } = useTranslation();
    const promptLink = () => {
        if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            return;
        }
        // eslint-disable-next-line no-alert
        const url = window.prompt('URL');
        if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className={styles.toolbar} data-testid="m3-toolbar">
            {/* The maximize/exit button stays pinned (always reachable, esp. in
                mobile fullscreen) — only the rest of the bar scrolls sideways. */}
            {leading}
            {leading && <span className={styles.vDivider} />}
            <div className={styles.toolbarScroll}>
                {/* A disabled fieldset natively disables every formatting control inside
                (read mode / version look-back) without touching each button. */}
                <fieldset className={styles.toolFieldset} disabled={disabled}>
                    <div className={styles.toolGroup}>
                        <ToolButton
                            title={t('editor.toolbar.undo', 'Undo')}
                            onClick={() => editor.chain().focus().undo().run()}
                            disabled={!editor.can().undo()}
                        >
                            <Undo />
                        </ToolButton>
                        <ToolButton
                            title={t('editor.toolbar.redo', 'Redo')}
                            onClick={() => editor.chain().focus().redo().run()}
                            disabled={!editor.can().redo()}
                        >
                            <Redo />
                        </ToolButton>
                    </div>
                    <span className={styles.vDivider} />
                    <div className={styles.toolGroup}>
                        <HeadingMenu
                            editor={editor}
                            disabled={disabled}
                            anchorsEnabled={anchorsEnabled}
                            autoChapters={autoChapters ?? {}}
                            onToggleAutoChapters={(level) => onToggleAutoChapters?.(level)}
                        />
                        <Dropdown
                            trigger={['click']}
                            disabled={disabled}
                            menu={{
                                items: [
                                    {
                                        key: 'bullet',
                                        label: (
                                            <MenuRow
                                                glyph={<FormatListBulleted />}
                                                label={t('editor.listMenu.bullet', 'Bullet list')}
                                            />
                                        ),
                                    },
                                    {
                                        key: 'ordered',
                                        label: (
                                            <MenuRow
                                                glyph={<FormatListNumbered />}
                                                label={t('editor.listMenu.ordered', 'Numbered list')}
                                            />
                                        ),
                                    },
                                    {
                                        key: 'task',
                                        label: (
                                            <MenuRow
                                                glyph={<ChecklistIcon />}
                                                label={t('editor.listMenu.checklist', 'Checklist')}
                                            />
                                        ),
                                    },
                                ],
                                onClick: ({ key }) => {
                                    if (key === 'bullet') editor.chain().focus().toggleBulletList().run();
                                    else if (key === 'ordered') editor.chain().focus().toggleOrderedList().run();
                                    else editor.chain().focus().toggleTaskList().run();
                                },
                            }}
                        >
                            <button
                                type="button"
                                className={`${styles.toolBtn} ${styles.menuBtn} ${
                                    editor.isActive('bulletList') ||
                                    editor.isActive('orderedList') ||
                                    editor.isActive('taskList')
                                        ? styles.active
                                        : ''
                                }`}
                                onMouseDown={(e) => e.preventDefault()}
                                title={t('editor.toolbar.lists', 'Lists')}
                            >
                                <FormatListBulleted />
                                <ArrowDropDown className={styles.caret} />
                            </button>
                        </Dropdown>
                        <ToolButton
                            title={t('editor.toolbar.blockquote', 'Blockquote')}
                            active={editor.isActive('blockquote')}
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        >
                            <FormatQuote />
                        </ToolButton>
                        <ToolButton
                            title={t('editor.toolbar.codeBlock', 'Code block')}
                            active={editor.isActive('codeBlock')}
                            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        >
                            <DataObject />
                        </ToolButton>
                    </div>
                    <span className={styles.vDivider} />
                    <div className={styles.toolGroup}>
                        <ToolButton
                            title={t('editor.toolbar.bold', 'Bold')}
                            active={editor.isActive('bold')}
                            onClick={() => editor.chain().focus().toggleBold().run()}
                        >
                            <FormatBold />
                        </ToolButton>
                        <ToolButton
                            title={t('editor.toolbar.italic', 'Italic')}
                            active={editor.isActive('italic')}
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                        >
                            <FormatItalic />
                        </ToolButton>
                        <ToolButton
                            title={t('editor.toolbar.strikethrough', 'Strikethrough')}
                            active={editor.isActive('strike')}
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                        >
                            <StrikethroughS />
                        </ToolButton>
                        <ToolButton
                            title={t('editor.toolbar.inlineCode', 'Inline code')}
                            active={editor.isActive('code')}
                            onClick={() => editor.chain().focus().toggleCode().run()}
                        >
                            <Code />
                        </ToolButton>
                        <ToolButton
                            title={t('editor.toolbar.underline', 'Underline')}
                            active={editor.isActive('underline')}
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                        >
                            <FormatUnderlined />
                        </ToolButton>
                        <Dropdown
                            trigger={['click']}
                            disabled={disabled}
                            menu={{
                                items: [
                                    ...HIGHLIGHT_COLORS.map(({ key, color, fallback }) => ({
                                        key,
                                        label: (
                                            <MenuRow
                                                glyph={
                                                    <span
                                                        className={styles.colorSwatch}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                }
                                                label={t(`editor.highlight.${key}`, fallback)}
                                            />
                                        ),
                                    })),
                                    { type: 'divider' as const },
                                    {
                                        key: 'none',
                                        label: (
                                            <MenuRow
                                                glyph={<FormatColorReset />}
                                                label={t('editor.highlight.remove', 'Remove highlight')}
                                            />
                                        ),
                                    },
                                ],
                                onClick: ({ key }) => {
                                    if (key === 'none') {
                                        editor.chain().focus().unsetHighlight().run();
                                        return;
                                    }
                                    const chosen = HIGHLIGHT_COLORS.find((entry) => entry.key === key);
                                    if (chosen) editor.chain().focus().setHighlight({ color: chosen.color }).run();
                                },
                            }}
                        >
                            <button
                                type="button"
                                className={`${styles.toolBtn} ${styles.menuBtn} ${
                                    editor.isActive('highlight') ? styles.active : ''
                                }`}
                                onMouseDown={(e) => e.preventDefault()}
                                title={t('editor.toolbar.highlight', 'Highlighter')}
                            >
                                <BorderColor />
                                <ArrowDropDown className={styles.caret} />
                            </button>
                        </Dropdown>
                        <ToolButton
                            title={t('editor.toolbar.link', 'Link')}
                            active={editor.isActive('link')}
                            onClick={promptLink}
                        >
                            <LinkIcon />
                        </ToolButton>
                    </div>
                    <span className={styles.vDivider} />
                    <div className={styles.toolGroup}>
                        <ToolButton
                            title={t('editor.toolbar.superscript', 'Superscript')}
                            active={editor.isActive('superscript')}
                            onClick={() => editor.chain().focus().toggleSuperscript().run()}
                        >
                            <SuperscriptIcon />
                        </ToolButton>
                        <ToolButton
                            title={t('editor.toolbar.subscript', 'Subscript')}
                            active={editor.isActive('subscript')}
                            onClick={() => editor.chain().focus().toggleSubscript().run()}
                        >
                            <SubscriptIcon />
                        </ToolButton>
                    </div>
                    <span className={styles.vDivider} />
                    <div className={styles.toolGroup}>
                        <ToolButton
                            title={t('editor.toolbar.alignLeft', 'Align left')}
                            active={editor.isActive({ textAlign: 'left' })}
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        >
                            <FormatAlignLeft />
                        </ToolButton>
                        <ToolButton
                            title={t('editor.toolbar.alignCenter', 'Align center')}
                            active={editor.isActive({ textAlign: 'center' })}
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        >
                            <FormatAlignCenter />
                        </ToolButton>
                        <ToolButton
                            title={t('editor.toolbar.alignRight', 'Align right')}
                            active={editor.isActive({ textAlign: 'right' })}
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        >
                            <FormatAlignRight />
                        </ToolButton>
                        <ToolButton
                            title={t('editor.toolbar.justify', 'Justify')}
                            active={editor.isActive({ textAlign: 'justify' })}
                            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                        >
                            <FormatAlignJustify />
                        </ToolButton>
                    </div>
                    <span className={styles.vDivider} />
                    <div className={styles.toolGroup}>
                        <button
                            type="button"
                            className={`${styles.toolBtn} ${styles.withLabel}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={onInsertImage}
                            disabled={imageUploading}
                            aria-busy={imageUploading}
                            title={t('editor.toolbar.addImage', 'Add image')}
                        >
                            <ImageIcon />
                            <span>
                                {imageUploading
                                    ? t('editor.image.upload.uploading', 'Uploading…')
                                    : t('editor.toolbar.add', 'Add')}
                            </span>
                        </button>
                    </div>
                    {placeholders && Object.keys(placeholders).length > 0 && (
                        <>
                            <span className={styles.vDivider} />
                            <div className={styles.toolGroup}>
                                <Dropdown
                                    trigger={['click']}
                                    disabled={disabled}
                                    menu={{
                                        items: Object.entries(placeholders).map(([key, label]) => ({
                                            key,
                                            label: <MenuRow glyph={<TextFields />} label={t(label)} />,
                                        })),
                                        onClick: ({ key }) => editor.chain().focus().insertContent(`\${${key}}`).run(),
                                    }}
                                >
                                    <button
                                        type="button"
                                        className={`${styles.toolBtn} ${styles.menuBtn}`}
                                        onMouseDown={(e) => e.preventDefault()}
                                        title={t('editor.plugin.placeholder.select.placeholder', 'Placeholder')}
                                    >
                                        <TextFields />
                                        <ArrowDropDown className={styles.caret} />
                                    </button>
                                </Dropdown>
                            </div>
                        </>
                    )}
                </fieldset>
            </div>
        </div>
    );
};

/**
 * MUI Material 3 "Tip Tap Editor Module" (Figma Admin.ORISO 1:34903).
 * Controlled rich-text editor: `value` HTML in / `onChange` HTML out.
 * Publish / version history are UI-wired; their persistence needs a backend
 * (versioning API) that does not exist yet — flagged as a follow-up.
 */
export const M3RichTextEditor = ({
    title = 'Impressum',
    icon: IconComponent = Fingerprint,
    value = '',
    versions = [],
    onRestoreVersion,
    onViewVersionChange,
    onChange,
    placeholder = 'Text eingeben …',
    placeholders,
    languages = [{ value: 'de', label: 'Deutsch' }],
    language = 'de',
    onLanguageChange,
    versionLabel = 'Latest Version',
    publishing,
    readOnly,
    fluid,
    contentLanguage,
    hideHeader,
    languageSlot,
    topicSlot,
    helpSlot,
    snackbarSlot,
    aboveEditorSlot,
    editorSlot,
    belowSlot,
    enableAnchors = true,
    onPublish,
    onSaveDraft,
}: M3RichTextEditorProps) => {
    const { t, i18n } = useTranslation();
    const [maximized, setMaximized] = useState(false);
    // Whether the "link to section" chapter menu in the bubble is open (arrow flips up).
    const [crossRefOpen, setCrossRefOpen] = useState(false);
    // "19.07.26 | 12:34 Uhr" (Figma 1271-70892) — locale-aware, "Uhr" only in German.
    const locale = i18n?.language || 'de';
    const formatVersionDate = (date: Date) =>
        `${date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' })} | ` +
        `${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}` +
        `${locale.startsWith('de') ? ' Uhr' : ''}`;
    // "Auto Chapters" (Figma 1280-73045): per heading level, whether new
    // headings automatically get a clickable anchor for this editor session.
    // Titles are translated and therefore not safe persistence identifiers.
    const [autoChapters, setAutoChapters] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });
    const toggleAutoChapters = (level: number) =>
        setAutoChapters((current) => {
            const next = { ...current, [level]: !(current[level] !== false) };
            return next;
        });
    // Which saved version is being viewed (null = the editable current draft).
    const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);
    // Single entry point for the switch, so every path that changes what the editor
    // shows also tells the card — a version selected here but not there would put an
    // archived body next to a live consent sentence.
    const viewVersion = (versionId: string | null) => {
        setViewingVersionId(versionId);
        onViewVersionChange?.(versionId);
    };
    const viewingVersion = versions.find((v) => v.id === viewingVersionId) ?? null;
    // What the editor surface shows: a looked-at version, else the live draft.
    const displayedContent = viewingVersion ? viewingVersion.content : value;
    // Editable only when not read-only AND not looking at an old version.
    const editorEditable = !readOnly && !viewingVersion;
    // Anchors only make sense for the built-in editor; an editorSlot brings
    // its own TiptapEditor with its own anchor row.
    const anchorsEnabled = enableAnchors && !editorSlot;

    // Image upload (WP-3b): editor + handler live behind refs so the drop/paste
    // handlers captured at editor creation always see the current instances.
    const editorRef = useRef<Editor | null>(null);
    const imageUpload = useEditorImageUpload(() => editorRef.current);
    const uploadAndInsertRef = useRef(imageUpload.uploadAndInsert);
    uploadAndInsertRef.current = imageUpload.uploadAndInsert;

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false, autolink: false }),
            ResolvingImage,
            Highlight.configure({ multicolor: true }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Subscript,
            Superscript,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Placeholder.configure({ placeholder }),
            ...(anchorsEnabled ? [HeadingAnchors] : []),
        ],
        content: value,
        editable: !readOnly,
        editorProps: {
            attributes: editorSurfaceAttributes(readOnly, title),
            ...createImageDropPasteHandlers((files) => {
                if (editorRef.current?.isEditable) {
                    uploadAndInsertRef.current(files);
                }
            }),
        },
        onUpdate: ({ editor: e }) => onChange?.(e.isEmpty ? '' : e.getHTML()),
    });

    useEffect(() => {
        editorRef.current = editor;
    }, [editor]);

    useEffect(() => {
        editor?.setEditable(editorEditable);
    }, [editor, editorEditable]);

    // If the viewed version disappears from `versions` (the list changed), drop
    // back to the editable draft rather than leaving a stale id selected.
    useEffect(() => {
        if (viewingVersionId && !versions.some((v) => v.id === viewingVersionId)) {
            setViewingVersionId(null);
            onViewVersionChange?.(null);
        }
        // `onViewVersionChange` is intentionally not a dependency: an inline callback
        // would re-run this reset on every render of the parent.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [versions, viewingVersionId]);

    useEffect(() => {
        // Keep the drop/paste image handlers when re-pinning the label — setOptions
        // replaces editorProps wholesale.
        editor?.setOptions({
            editorProps: {
                attributes: editorSurfaceAttributes(readOnly, title),
                ...createImageDropPasteHandlers((files) => {
                    if (editorRef.current?.isEditable) {
                        uploadAndInsertRef.current(files);
                    }
                }),
            },
        });
    }, [editor, title, readOnly]);

    useEffect(() => {
        if (editor && anchorsEnabled) {
            [1, 2, 3].forEach((level) => editor.commands.setAutoHeadingAnchors(autoChapters[level] !== false, level));
        }
    }, [editor, anchorsEnabled, autoChapters]);

    // Shared anchor-navigation behavior — same hook as the form-bound TiptapEditor.
    const { anchors, anchorsRef, activeAnchorId, scrollToAnchor, removeAnchor, handleContentClickCapture } =
        useHeadingAnchorNav(editor, { enabled: anchorsEnabled, editable: editorEditable });

    useEffect(() => {
        if (!editor) return;
        const incoming = displayedContent || '';
        const current = editor.isEmpty ? '' : editor.getHTML();
        if (incoming !== current && !(isEmptyHtml(incoming) && editor.isEmpty)) {
            editor.commands.setContent(incoming, false);
        }
    }, [displayedContent, editor]);

    if (!editor) return null;

    const html = () => (editorSlot || editor.isEmpty ? '' : editor.getHTML());
    const onlineSinceDate = versions.length > 0 ? parseVersionDate(versions[versions.length - 1].id) : null;
    // Read mode (published view / version look-back): text without box, outline
    // or padding (Figma 1261-51137). Only the built-in editor is restyled — an
    // editorSlot owns its own surface.
    const readMode = !editorEditable && !editorSlot;
    // Whether the text viewport is a scroll container of its own. The fixed
    // deck card and the fullscreen dialog cap the text and scroll it inside;
    // the fluid public reader hands scrolling to its host so the screen has
    // exactly one scroller (#572 criterion, #594.3).
    const scrollsInternally = !fluid || maximized;

    // Maximize lives as the first toolbar control (Figma 1261-48667); in
    // fullscreen it becomes the red round exit button (Figma 1276-72139).
    const maximizeButton = (
        <button
            type="button"
            className={`${styles.toolBtn} ${styles.maximizeToolBtn} ${maximized ? styles.exitFullscreenBtn : ''}`}
            onClick={() => setMaximized((m) => !m)}
            title={maximized ? t('legal.m3Editor.minimize') : t('legal.m3Editor.maximize')}
            aria-label={maximized ? t('legal.m3Editor.minimize') : t('legal.m3Editor.maximize')}
        >
            {maximized ? <MinimizeContentIcon /> : <MaximizeContentIcon />}
        </button>
    );

    // Reader: no formatting bar at all. The version control only earns its
    // place when there is something to look back at.
    const showToolbar = !editorSlot && !readOnly;
    const languageControl =
        languageSlot ??
        (languages.length > 1 ? (
            <SplitDropdown
                icon={<Language />}
                label={language.toUpperCase()}
                title={t('legal.m3Editor.chooseLanguage', 'Sprache wählen')}
                menu={{
                    selectable: true,
                    selectedKeys: [language],
                    items: languages.map((l) => ({ key: l.value, label: l.label })),
                    onClick: ({ key }) => onLanguageChange?.(key),
                }}
            />
        ) : null);
    const showVersionControl = !readOnly || versions.length > 0;

    const card = (
        <div
            className={`${styles.module} ${maximized ? styles.inDialog : ''} ${readMode ? styles.readMode : ''} ${
                fluid ? styles.fluid : ''
            }`}
            data-testid="m3-editor"
        >
            {!hideHeader && (
                <div className={styles.header}>
                    <IconComponent className={styles.headerIcon} />
                    <h2 className={styles.title}>{title}</h2>
                </div>
            )}

            {helpSlot}

            {!hideHeader && <hr className={`${styles.divider} ${styles.headerDivider}`} />}

            {showToolbar ? (
                <Toolbar
                    editor={editor}
                    disabled={!editorEditable}
                    leading={maximizeButton}
                    anchorsEnabled={anchorsEnabled}
                    autoChapters={autoChapters}
                    onToggleAutoChapters={toggleAutoChapters}
                    placeholders={placeholders}
                    onInsertImage={imageUpload.openImagePicker}
                    imageUploading={imageUpload.uploading}
                />
            ) : (
                <div className={styles.toolbar}>{maximizeButton}</div>
            )}

            {viewingVersion && (
                <div className={styles.versionBanner} role="status">
                    <span>
                        {t('legal.m3Editor.viewingVersion')}: {viewingVersion.label}
                    </span>
                    <div className={styles.versionBannerActions}>
                        {!readOnly && onRestoreVersion && viewingVersion.restorable !== false && (
                            <button
                                type="button"
                                className={styles.outlineBtn}
                                onClick={() => {
                                    onRestoreVersion(viewingVersion.content);
                                    viewVersion(null);
                                }}
                            >
                                {t('legal.m3Editor.restoreVersion')}
                            </button>
                        )}
                        <button type="button" className={styles.outlineBtn} onClick={() => viewVersion(null)}>
                            {t('legal.m3Editor.backToDraft')}
                        </button>
                    </div>
                </div>
            )}

            {aboveEditorSlot && <div className={styles.contentInset}>{aboveEditorSlot}</div>}

            <div className={`${styles.editorRegion} ${anchorsEnabled && anchors.length > 0 ? styles.hasAnchors : ''}`}>
                {editorSlot ? (
                    <div className={styles.contentInset}>{editorSlot}</div>
                ) : (
                    <div className={styles.editorWrap} onClickCapture={handleContentClickCapture}>
                        <div className={`${styles.editor} ${snackbarSlot ? styles.hasSnackbar : ''}`}>
                            {/* Reading mode: the text viewport is the named
                                landmark. It only becomes a tab stop when it
                                actually scrolls — a keyboard user must be able
                                to scroll it without a pointer (axe:
                                scrollable-region-focusable), but the fluid
                                reader delegates scrolling to its host (#594.3)
                                and an extra tab stop there would be noise. */}
                            {/* `lang` on the text itself: long German compounds
                                ("Auftragsverarbeitungsvertrag") otherwise break
                                mid-word on a phone, because `hyphens: auto` has
                                no dictionary without it. */}
                            <div
                                className={styles.editorContentScroll}
                                lang={contentLanguage ?? language}
                                {...(readOnly ? { role: 'region', 'aria-label': title } : {})}
                                {...(readOnly && scrollsInternally
                                    ? // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                                      { tabIndex: 0 }
                                    : {})}
                            >
                                <EditorContent editor={editor} />
                            </div>
                            {/* Blocker snackbar floats OVER the text area (Figma 1229-17864),
                                anchored above the chapter chips. */}
                            {snackbarSlot}
                            {/* Anchor chips live at the bottom of the text surface, with
                                overflow nav arrows (Figma 1261-48667 / 1280-73048). */}
                            {anchorsEnabled && (
                                <AnchorChips
                                    className={styles.anchorNav}
                                    anchors={anchors}
                                    activeId={activeAnchorId}
                                    editable={editorEditable}
                                    onSelect={scrollToAnchor}
                                    onRemove={removeAnchor}
                                    ariaLabel={t('editor.plugin.anchor.nav.label', 'Section anchors')}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {anchorsEnabled && editorEditable && (
                // Stable host div: the BubbleMenu plugin detaches its element
                // from the React tree (tippy re-parents it), so it must not be
                // a direct sibling that React repositions or removes.
                <div className={styles.anchorBubbleHost}>
                    <BubbleMenu
                        editor={editor}
                        pluginKey="anchorLinkBubble"
                        updateDelay={150}
                        tippyOptions={{ placement: 'top', maxWidth: 'none' }}
                        shouldShow={({ state }) => !state.selection.empty && anchorsRef.current.length > 0}
                    >
                        <div className={styles.anchorBubble}>
                            <Dropdown
                                trigger={['click']}
                                placement="top"
                                onOpenChange={setCrossRefOpen}
                                getPopupContainer={(trigger) => trigger.parentElement || document.body}
                                menu={{
                                    items: anchors.map((anchor) => ({ key: anchor.id, label: anchor.text })),
                                    onClick: ({ key }) =>
                                        editor
                                            .chain()
                                            .focus()
                                            .extendMarkRange('link')
                                            .setLink({ href: `#${key}` })
                                            .run(),
                                }}
                            >
                                <button type="button" className={styles.crossRefBtn}>
                                    <CrossReferenceIcon />
                                    <span>{t('editor.plugin.anchor.link.placeholder', 'Link to section')}</span>
                                    <KeyboardArrowDownIcon
                                        className={`${styles.crossRefArrow} ${
                                            crossRefOpen ? styles.crossRefArrowOpen : ''
                                        }`}
                                    />
                                </button>
                            </Dropdown>
                        </div>
                    </BubbleMenu>
                </div>
            )}

            {/* Lower function bar (Figma 1261-48667): up to three split buttons —
                language, topic/department (slot), version history. */}
            {(languageControl || topicSlot || showVersionControl) && (
                <div className={styles.functionBar}>
                    {languageControl}
                    {topicSlot}
                    {showVersionControl && (
                        <SplitDropdown
                            icon={<Schedule />}
                            title={t('legal.m3Editor.versionHistory')}
                            label={
                                viewingVersion
                                    ? viewingVersion.label
                                    : [versionLabel, versions[0]?.label].filter(Boolean).join(' ')
                            }
                            menu={{
                                selectable: true,
                                selectedKeys: [viewingVersionId ?? 'current'],
                                items:
                                    versions.length > 0
                                        ? [
                                              {
                                                  key: 'current',
                                                  label: t('legal.m3Editor.versionCurrentDraft'),
                                              },
                                              { type: 'divider' as const },
                                              ...(onlineSinceDate
                                                  ? [
                                                        {
                                                            key: 'onlineSince',
                                                            disabled: true,
                                                            label: (
                                                                <span className={styles.versionMenuHeader}>
                                                                    {t('legal.m3Editor.versionOnlineSince', {
                                                                        date: formatVersionDate(onlineSinceDate),
                                                                    })}
                                                                </span>
                                                            ),
                                                        },
                                                    ]
                                                  : []),
                                              ...versions.map((v, index) => {
                                                  const from = parseVersionDate(v.id);
                                                  const until =
                                                      index > 0 ? parseVersionDate(versions[index - 1].id) : null;
                                                  let range = v.label;
                                                  if (from && until) {
                                                      range = t('legal.m3Editor.versionRangePublished', {
                                                          from: formatVersionDate(from),
                                                          until: formatVersionDate(until),
                                                      });
                                                  } else if (from) {
                                                      range = t('legal.m3Editor.versionRangeOnline', {
                                                          from: formatVersionDate(from),
                                                      });
                                                  }
                                                  return {
                                                      key: v.id,
                                                      label: (
                                                          <span className={styles.versionMenuItem}>
                                                              <Restore />
                                                              <span>
                                                                  <span className={styles.versionMenuName}>
                                                                      {t('legal.m3Editor.versionVariant', {
                                                                          n: versions.length - index,
                                                                      })}
                                                                  </span>
                                                                  <span className={styles.versionMenuRange}>
                                                                      {range}
                                                                  </span>
                                                              </span>
                                                          </span>
                                                      ),
                                                  };
                                              }),
                                          ]
                                        : // Never published: say so explicitly instead of
                                          // offering a menu that looks broken (#768).
                                          [
                                              {
                                                  key: 'empty',
                                                  disabled: true,
                                                  label: (
                                                      <span className={styles.versionMenuHeader}>
                                                          {t('legal.m3Editor.versionEmpty')}
                                                      </span>
                                                  ),
                                              },
                                              { key: 'latest', label: t('legal.m3Editor.versionLatest') },
                                          ],
                                onClick: ({ key }) => viewVersion(key === 'current' ? null : key),
                            }}
                        />
                    )}
                </div>
            )}

            {editorEditable && (onPublish || onSaveDraft) && (
                <>
                    <hr className={styles.divider} />

                    <div className={styles.actions}>
                        {onPublish && (
                            <button
                                type="button"
                                className={`${styles.textBtn} ${styles.publish}`}
                                disabled={publishing || imageUpload.uploading}
                                aria-busy={publishing || imageUpload.uploading}
                                onClick={() => onPublish(html())}
                            >
                                <PublishedIcon />
                                <span>{t('legal.m3Editor.publish')}</span>
                            </button>
                        )}
                        {onSaveDraft && (
                            <button
                                type="button"
                                className={`${styles.textBtn} ${styles.draft}`}
                                disabled={imageUpload.uploading}
                                aria-busy={imageUpload.uploading}
                                onClick={() => onSaveDraft(html())}
                            >
                                <EditIcon />
                                <span>{t('legal.m3Editor.saveDraft')}</span>
                            </button>
                        )}
                    </div>
                </>
            )}

            {belowSlot}
        </div>
    );

    // Fullscreen mode is a real modal dialog (Figma 1007-27636): white 80%
    // scrim with backdrop blur, centered card, round close button beside the
    // top right corner. antd Modal provides focus trap + Escape handling.
    if (maximized) {
        return (
            <Modal
                open
                closable={false}
                footer={null}
                centered
                width="min(1512px, calc(100vw - 96px))"
                className={styles.dialogModal}
                // Above every application overlay — see EDITOR_FULLSCREEN_Z_INDEX.
                zIndex={EDITOR_FULLSCREEN_Z_INDEX}
                onCancel={() => setMaximized(false)}
                styles={{
                    mask: { background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)' },
                    content: { padding: 0, background: 'transparent', boxShadow: 'none' },
                }}
                aria-label={title}
            >
                <div className={styles.dialogLayout}>
                    {card}
                    <button
                        type="button"
                        className={styles.dialogClose}
                        aria-label={t('legal.m3Editor.closeDialog')}
                        onClick={() => setMaximized(false)}
                    >
                        <Close />
                    </button>
                </div>
            </Modal>
        );
    }

    return card;
};

export default M3RichTextEditor;
