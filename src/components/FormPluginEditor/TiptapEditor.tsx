import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, Editor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
    FormatBold,
    FormatItalic,
    FormatUnderlined,
    FormatListBulleted,
    FormatListNumbered,
    Link as LinkIcon,
    Image as ImageIcon,
} from '@mui/icons-material';
import { Button, ConfigProvider, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { ResolvingImage } from './createResolvingImage';
import { createImageDropPasteHandlers, useEditorImageUpload } from './useEditorImageUpload';
import { HeadingAnchors } from './headingAnchors';
import AnchorChips from './AnchorChips';
import { useHeadingAnchorNav } from './useHeadingAnchorNav';

// TipTap replacement for the former draft-js editor. Same data contract:
// `value` is an HTML string in, `onChange` emits an HTML string out. Template
// placeholders are stored as literal `${key}` text (unchanged format), so old
// legal-text content round-trips identically.

export type TiptapEditorProps = {
    value?: string;
    onChange?: (html: string) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    placeholder?: string;
    placeholders?: { [key: string]: string };
    /**
     * Anchor navigation for long texts: headings get persistent `id`
     * attributes, a horizontal chip row above the content jumps to them, and
     * selected text can be linked to any anchor (BubbleMenu). ON by default
     * because every current usage of this editor is a legal text (edit cards
     * via FormPluginEditor + read-only version look-backs); pass `false`
     * to opt out. Must not change during the editor's lifetime.
     */
    enableAnchors?: boolean;
};

const isEmptyHtml = (html: string) => html === '' || html === '<p></p>';

const ToolbarButton = ({
    active,
    onClick,
    children,
    title,
    disabled,
    busy,
}: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title: string;
    disabled?: boolean;
    busy?: boolean;
}) => (
    <Button
        type={active ? 'primary' : 'text'}
        size="small"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        title={title}
        aria-pressed={active}
        disabled={disabled}
        aria-busy={busy}
    >
        {children}
    </Button>
);

const HEADING_LEVELS = [1, 2, 3] as const;

const Toolbar = ({
    editor,
    placeholders,
    showHeadingSelect,
    onInsertImage,
    imageUploading,
}: {
    editor: Editor;
    placeholders?: { [key: string]: string };
    showHeadingSelect?: boolean;
    onInsertImage: () => void;
    imageUploading?: boolean;
}) => {
    const { t } = useTranslation();

    const insertLink = () => {
        if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            return;
        }
        // eslint-disable-next-line no-alert
        const url = window.prompt(t('editor.plugin.link.url', 'URL'));
        if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
    };

    const activeHeadingLevel = HEADING_LEVELS.find((level) => editor.isActive('heading', { level })) ?? 0;

    return (
        <div className="RichEditor-toolbar">
            <div className="RichEditor-controls">
                {showHeadingSelect && (
                    <div className="RichEditor-control-group">
                        <Select
                            size="small"
                            value={activeHeadingLevel}
                            popupMatchSelectWidth={false}
                            style={{ minWidth: 120 }}
                            options={[
                                { value: 0, label: t('editor.plugin.heading.paragraph', 'Text') },
                                { value: 1, label: t('editor.plugin.heading.h1', 'Heading 1') },
                                { value: 2, label: t('editor.plugin.heading.h2', 'Heading 2') },
                                { value: 3, label: t('editor.plugin.heading.h3', 'Heading 3') },
                            ]}
                            onSelect={(level: number) => {
                                if (level === 0) {
                                    editor.chain().focus().setParagraph().run();
                                } else {
                                    editor
                                        .chain()
                                        .focus()
                                        .setHeading({ level: level as 1 | 2 | 3 })
                                        .run();
                                }
                            }}
                        />
                    </div>
                )}
                <div className="RichEditor-control-group">
                    <ToolbarButton
                        active={editor.isActive('bold')}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        title="Bold"
                    >
                        <FormatBold fontSize="small" />
                    </ToolbarButton>
                    <ToolbarButton
                        active={editor.isActive('italic')}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        title="Italic"
                    >
                        <FormatItalic fontSize="small" />
                    </ToolbarButton>
                    <ToolbarButton
                        active={editor.isActive('underline')}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        title="Underline"
                    >
                        <FormatUnderlined fontSize="small" />
                    </ToolbarButton>
                </div>
                <div className="RichEditor-control-group">
                    <ToolbarButton
                        active={editor.isActive('bulletList')}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        title="Bullet list"
                    >
                        <FormatListBulleted fontSize="small" />
                    </ToolbarButton>
                    <ToolbarButton
                        active={editor.isActive('orderedList')}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        title="Numbered list"
                    >
                        <FormatListNumbered fontSize="small" />
                    </ToolbarButton>
                </div>
                <div className="RichEditor-control-group">
                    <ToolbarButton active={editor.isActive('link')} onClick={insertLink} title="Link">
                        <LinkIcon fontSize="small" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={onInsertImage}
                        title="Image"
                        active={imageUploading}
                        disabled={imageUploading}
                        busy={imageUploading}
                    >
                        <ImageIcon fontSize="small" />
                    </ToolbarButton>
                </div>
            </div>
            {placeholders && Object.keys(placeholders).length > 0 && (
                <Select
                    size="small"
                    placeholder={t('editor.plugin.placeholder.select.placeholder', 'Placeholder')}
                    value={null}
                    popupMatchSelectWidth={false}
                    style={{ minWidth: 160 }}
                    options={Object.entries(placeholders).map(([key, label]) => ({ value: key, label: t(label) }))}
                    onSelect={(key: string) => editor.chain().focus().insertContent(`\${${key}}`).run()}
                />
            )}
        </div>
    );
};

const TiptapEditor = ({
    value = '',
    onChange,
    onBlur,
    onFocus,
    placeholder,
    placeholders,
    enableAnchors = true,
}: TiptapEditorProps) => {
    // Public antd API for the surrounding disabled state (same context that
    // `ConfigProvider componentDisabled` / a disabled antd Form provides).
    const disabled = ConfigProvider.useConfig().componentDisabled ?? false;
    const { t } = useTranslation();
    // The placeholder extension reads the (possibly i18n-translated) text via
    // this ref, so a runtime language switch is picked up without re-mounting.
    const placeholderRef = useRef(placeholder);
    placeholderRef.current = placeholder;

    // Image upload (WP-3b): refs so the handlers captured at editor creation
    // always see the current editor/handler instances.
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
            Placeholder.configure({ placeholder: () => placeholderRef.current || '' }),
            ...(enableAnchors ? [HeadingAnchors] : []),
        ],
        content: value,
        editable: !disabled,
        editorProps: {
            attributes: { class: 'RichEditor-editor' },
            ...createImageDropPasteHandlers((files) => {
                if (editorRef.current?.isEditable) {
                    uploadAndInsertRef.current(files);
                }
            }),
        },
        onUpdate: ({ editor: e }) => {
            onChange?.(e.isEmpty ? '' : e.getHTML());
        },
        onFocus: () => onFocus?.(),
        onBlur: () => onBlur?.(),
    });

    // Keep the editor in sync when antd Form sets the value externally,
    // without feeding our own onUpdate back into a loop.
    useEffect(() => {
        if (!editor) return;
        const incoming = value || '';
        const current = editor.isEmpty ? '' : editor.getHTML();
        if (incoming !== current && !(isEmptyHtml(incoming) && editor.isEmpty)) {
            editor.commands.setContent(incoming, false);
        }
    }, [value, editor]);

    useEffect(() => {
        editorRef.current = editor;
    }, [editor]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [disabled, editor]);

    // Re-render the placeholder decoration when the placeholder text changes
    // at runtime (e.g. the user switches the UI language).
    useEffect(() => {
        if (editor) editor.view.dispatch(editor.state.tr);
    }, [placeholder, editor]);

    // Shared anchor-navigation behavior (chips, scroll spy, jump/remove,
    // read-only link-click capture) — same hook as the M3RichTextEditor.
    const { anchors, anchorsRef, activeAnchorId, scrollToAnchor, removeAnchor, handleContentClickCapture } =
        useHeadingAnchorNav(editor, { enabled: enableAnchors, editable: !disabled });

    if (!editor) return null;

    return (
        <>
            {!disabled && (
                <Toolbar
                    editor={editor}
                    placeholders={placeholders}
                    showHeadingSelect={enableAnchors}
                    onInsertImage={imageUpload.openImagePicker}
                    imageUploading={imageUpload.uploading}
                />
            )}
            {enableAnchors && (
                <AnchorChips
                    anchors={anchors}
                    activeId={activeAnchorId}
                    editable={!disabled}
                    onSelect={scrollToAnchor}
                    onRemove={removeAnchor}
                    ariaLabel={t('editor.plugin.anchor.nav.label', 'Section anchors')}
                />
            )}
            <div onClickCapture={handleContentClickCapture}>
                <EditorContent editor={editor} />
            </div>
            {enableAnchors && !disabled && (
                // Stable host div: the BubbleMenu plugin detaches its element
                // from the React tree (tippy re-parents it), so it must not be
                // a direct sibling that React repositions or removes.
                <div className="RichEditor-anchorBubbleHost">
                    <BubbleMenu
                        editor={editor}
                        pluginKey="anchorLinkBubble"
                        updateDelay={150}
                        tippyOptions={{ placement: 'top', maxWidth: 'none' }}
                        shouldShow={({ state }) => !state.selection.empty && anchorsRef.current.length > 0}
                    >
                        <div className="RichEditor-anchorBubble">
                            <Select
                                size="small"
                                placeholder={t('editor.plugin.anchor.link.placeholder', 'Link to section')}
                                value={null}
                                popupMatchSelectWidth={false}
                                style={{ minWidth: 180 }}
                                options={anchors.map((anchor) => ({ value: anchor.id, label: anchor.text }))}
                                getPopupContainer={(trigger) => trigger.parentElement || document.body}
                                onSelect={(anchorId: string) =>
                                    editor
                                        .chain()
                                        .focus()
                                        .extendMarkRange('link')
                                        .setLink({ href: `#${anchorId}` })
                                        .run()
                                }
                            />
                        </div>
                    </BubbleMenu>
                </div>
            )}
        </>
    );
};

export default TiptapEditor;
