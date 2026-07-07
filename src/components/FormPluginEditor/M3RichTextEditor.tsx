import { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Dropdown } from 'antd';
import {
    Undo,
    Redo,
    Title,
    FormatListBulleted,
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
    Fullscreen,
    FullscreenExit,
    History,
    Language,
    ArrowDropDown,
    Share,
    Edit,
    Fingerprint,
} from '@mui/icons-material';
import styles from './M3RichTextEditor.module.scss';

export type M3RichTextEditorProps = {
    title?: string;
    value?: string;
    onChange?: (html: string) => void;
    placeholder?: string;
    languages?: { value: string; label: string }[];
    language?: string;
    onLanguageChange?: (lng: string) => void;
    versionLabel?: string;
    onPublish?: (html: string) => void;
    onSaveDraft?: (html: string) => void;
};

const isEmptyHtml = (html: string) => html === '' || html === '<p></p>';

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

const Toolbar = ({ editor }: { editor: Editor }) => {
    const promptLink = () => {
        if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            return;
        }
        // eslint-disable-next-line no-alert
        const url = window.prompt('URL');
        if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };
    const promptImage = () => {
        // eslint-disable-next-line no-alert
        const url = window.prompt('Image URL');
        if (url) editor.chain().focus().setImage({ src: url }).run();
    };

    const activeHeadingLevel = [1, 2, 3].find((level) => editor.isActive('heading', { level }));

    return (
        <div className={styles.toolbar} data-testid="m3-toolbar">
            <div className={styles.toolGroup}>
                <ToolButton
                    title="Undo"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                >
                    <Undo />
                </ToolButton>
                <ToolButton
                    title="Redo"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                >
                    <Redo />
                </ToolButton>
            </div>
            <span className={styles.vDivider} />
            <div className={styles.toolGroup}>
                <Dropdown
                    trigger={['click']}
                    menu={{
                        selectable: true,
                        selectedKeys: [activeHeadingLevel ? `h${activeHeadingLevel}` : 'p'],
                        items: [
                            { key: 'p', label: 'Normaler Text' },
                            { key: 'h1', label: 'Überschrift 1' },
                            { key: 'h2', label: 'Überschrift 2' },
                            { key: 'h3', label: 'Überschrift 3' },
                        ],
                        onClick: ({ key }) => {
                            if (key === 'p') editor.chain().focus().setParagraph().run();
                            else
                                editor
                                    .chain()
                                    .focus()
                                    .toggleHeading({ level: Number(key.slice(1)) as 1 | 2 | 3 })
                                    .run();
                        },
                    }}
                >
                    <button
                        type="button"
                        className={`${styles.toolBtn} ${styles.menuBtn} ${
                            editor.isActive('heading') ? styles.active : ''
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        title="Textformat"
                    >
                        <Title />
                        <ArrowDropDown className={styles.caret} />
                    </button>
                </Dropdown>
                <Dropdown
                    trigger={['click']}
                    menu={{
                        items: [
                            { key: 'bullet', label: 'Aufzählung' },
                            { key: 'ordered', label: 'Nummerierte Liste' },
                        ],
                        onClick: ({ key }) =>
                            key === 'bullet'
                                ? editor.chain().focus().toggleBulletList().run()
                                : editor.chain().focus().toggleOrderedList().run(),
                    }}
                >
                    <button
                        type="button"
                        className={`${styles.toolBtn} ${styles.menuBtn} ${
                            editor.isActive('bulletList') || editor.isActive('orderedList') ? styles.active : ''
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        title="Listen"
                    >
                        <FormatListBulleted />
                        <ArrowDropDown className={styles.caret} />
                    </button>
                </Dropdown>
                <ToolButton
                    title="Blockquote"
                    active={editor.isActive('blockquote')}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <FormatQuote />
                </ToolButton>
                <ToolButton
                    title="Code block"
                    active={editor.isActive('codeBlock')}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                    <DataObject />
                </ToolButton>
            </div>
            <span className={styles.vDivider} />
            <div className={styles.toolGroup}>
                <ToolButton
                    title="Bold"
                    active={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <FormatBold />
                </ToolButton>
                <ToolButton
                    title="Italic"
                    active={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <FormatItalic />
                </ToolButton>
                <ToolButton
                    title="Strikethrough"
                    active={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <StrikethroughS />
                </ToolButton>
                <ToolButton
                    title="Inline code"
                    active={editor.isActive('code')}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                >
                    <Code />
                </ToolButton>
                <ToolButton
                    title="Underline"
                    active={editor.isActive('underline')}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    <FormatUnderlined />
                </ToolButton>
                <ToolButton
                    title="Highlight"
                    active={editor.isActive('highlight')}
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                >
                    <BorderColor />
                </ToolButton>
                <ToolButton title="Link" active={editor.isActive('link')} onClick={promptLink}>
                    <LinkIcon />
                </ToolButton>
            </div>
            <span className={styles.vDivider} />
            <div className={styles.toolGroup}>
                <ToolButton
                    title="Superscript"
                    active={editor.isActive('superscript')}
                    onClick={() => editor.chain().focus().toggleSuperscript().run()}
                >
                    <SuperscriptIcon />
                </ToolButton>
                <ToolButton
                    title="Subscript"
                    active={editor.isActive('subscript')}
                    onClick={() => editor.chain().focus().toggleSubscript().run()}
                >
                    <SubscriptIcon />
                </ToolButton>
            </div>
            <span className={styles.vDivider} />
            <div className={styles.toolGroup}>
                <ToolButton
                    title="Align left"
                    active={editor.isActive({ textAlign: 'left' })}
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                >
                    <FormatAlignLeft />
                </ToolButton>
                <ToolButton
                    title="Align center"
                    active={editor.isActive({ textAlign: 'center' })}
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                >
                    <FormatAlignCenter />
                </ToolButton>
                <ToolButton
                    title="Align right"
                    active={editor.isActive({ textAlign: 'right' })}
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                >
                    <FormatAlignRight />
                </ToolButton>
                <ToolButton
                    title="Justify"
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
                    onClick={promptImage}
                    title="Add image"
                >
                    <ImageIcon />
                    <span>Add</span>
                </button>
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
    value = '',
    onChange,
    placeholder = 'Text eingeben …',
    languages = [{ value: 'de', label: 'Deutsch' }],
    language = 'de',
    onLanguageChange,
    versionLabel = 'Latest Version',
    onPublish,
    onSaveDraft,
}: M3RichTextEditorProps) => {
    const [maximized, setMaximized] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false, autolink: false }),
            Image,
            Highlight,
            Subscript,
            Superscript,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Placeholder.configure({ placeholder }),
        ],
        content: value,
        onUpdate: ({ editor: e }) => onChange?.(e.isEmpty ? '' : e.getHTML()),
    });

    useEffect(() => {
        if (!editor) return;
        const incoming = value || '';
        const current = editor.isEmpty ? '' : editor.getHTML();
        if (incoming !== current && !(isEmptyHtml(incoming) && editor.isEmpty)) {
            editor.commands.setContent(incoming, false);
        }
    }, [value, editor]);

    if (!editor) return null;

    const currentLang = languages.find((l) => l.value === language) ?? languages[0];
    const html = () => (editor.isEmpty ? '' : editor.getHTML());

    return (
        <div className={`${styles.module} ${maximized ? styles.maximized : ''}`} data-testid="m3-editor">
            <div className={styles.header}>
                <Fingerprint className={styles.headerIcon} />
                <h2 className={styles.title}>{title}</h2>
            </div>

            {languages.length > 1 && (
                <div className={styles.languageRow}>
                    <div className={styles.splitButton}>
                        <button type="button" className={styles.leading} title="Language">
                            <Language style={{ fontSize: 22 }} />
                            <span>{currentLang?.label}</span>
                        </button>
                        <Dropdown
                            trigger={['click']}
                            menu={{
                                items: languages.map((l) => ({ key: l.value, label: l.label })),
                                onClick: ({ key }) => onLanguageChange?.(key),
                            }}
                        >
                            <button type="button" className={styles.trailing} title="Choose language">
                                <ArrowDropDown />
                            </button>
                        </Dropdown>
                    </div>
                </div>
            )}

            <hr className={styles.divider} />

            <Toolbar editor={editor} />

            <div className={styles.editorWrap}>
                <div className={styles.editor}>
                    <EditorContent editor={editor} />
                </div>
            </div>

            <div className={styles.subActions}>
                <button type="button" className={styles.outlineBtn} onClick={() => setMaximized((m) => !m)}>
                    {maximized ? <FullscreenExit /> : <Fullscreen />}
                    <span>{maximized ? 'Fenster verkleinern' : 'Fenster maximieren'}</span>
                </button>
                <Dropdown
                    trigger={['click']}
                    menu={{
                        items: [
                            { key: 'latest', label: 'Aktuelle Version (Entwurf)' },
                            { key: 'published', label: 'Veröffentlichte Version' },
                            { type: 'divider' },
                            { key: 'history', label: 'Versionsverlauf (Backend folgt)', disabled: true },
                        ],
                    }}
                >
                    <button type="button" className={styles.outlineBtn} title="Versionsverlauf">
                        <History />
                        <span>{versionLabel}</span>
                        <ArrowDropDown />
                    </button>
                </Dropdown>
            </div>

            <hr className={styles.divider} />

            <div className={styles.actions}>
                <button
                    type="button"
                    className={`${styles.textBtn} ${styles.publish}`}
                    onClick={() => onPublish?.(html())}
                >
                    <Share />
                    <span>Veröffentlichen</span>
                </button>
                <button
                    type="button"
                    className={`${styles.textBtn} ${styles.draft}`}
                    onClick={() => onSaveDraft?.(html())}
                >
                    <Edit />
                    <span>Entwurf bearbeiten</span>
                </button>
            </div>
        </div>
    );
};

export default M3RichTextEditor;
