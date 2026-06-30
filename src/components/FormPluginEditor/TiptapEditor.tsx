import { useContext, useEffect, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
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
import { Button, Select } from 'antd';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import { useTranslation } from 'react-i18next';

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
};

const isEmptyHtml = (html: string) => html === '' || html === '<p></p>';

const ToolbarButton = ({
    active,
    onClick,
    children,
    title,
}: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title: string;
}) => (
    <Button
        type={active ? 'primary' : 'text'}
        size="small"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        title={title}
        aria-pressed={active}
    >
        {children}
    </Button>
);

const Toolbar = ({ editor, placeholders }: { editor: Editor; placeholders?: { [key: string]: string } }) => {
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

    const insertImage = () => {
        // eslint-disable-next-line no-alert
        const url = window.prompt(t('editor.plugin.image.url', 'Image URL'));
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    return (
        <div className="RichEditor-toolbar">
            <div className="RichEditor-controls">
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
                    <ToolbarButton onClick={insertImage} title="Image">
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

const TiptapEditor = ({ value = '', onChange, onBlur, onFocus, placeholder, placeholders }: TiptapEditorProps) => {
    const disabled = useContext(DisabledContext);
    // The placeholder extension reads the (possibly i18n-translated) text via
    // this ref, so a runtime language switch is picked up without re-mounting.
    const placeholderRef = useRef(placeholder);
    placeholderRef.current = placeholder;

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false, autolink: false }),
            Image,
            Placeholder.configure({ placeholder: () => placeholderRef.current || '' }),
        ],
        content: value,
        editable: !disabled,
        editorProps: { attributes: { class: 'RichEditor-editor' } },
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
        editor?.setEditable(!disabled);
    }, [disabled, editor]);

    // Re-render the placeholder decoration when the placeholder text changes
    // at runtime (e.g. the user switches the UI language).
    useEffect(() => {
        if (editor) editor.view.dispatch(editor.state.tr);
    }, [placeholder, editor]);

    if (!editor) return null;

    return (
        <>
            {!disabled && <Toolbar editor={editor} placeholders={placeholders} />}
            <EditorContent editor={editor} />
        </>
    );
};

export default TiptapEditor;
