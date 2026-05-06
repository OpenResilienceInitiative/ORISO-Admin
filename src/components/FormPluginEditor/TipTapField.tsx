import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import {
    FormatBold,
    FormatItalic,
    FormatUnderlined,
    FormatListBulleted,
    FormatListNumbered,
    FormatQuote,
    Code,
    Link as LinkIcon,
    Undo,
    Redo,
} from '@mui/icons-material';

interface TipTapFieldProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
}

export const TipTapField = ({ value = '', onChange, placeholder, disabled }: TipTapFieldProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Highlight.configure({ multicolor: true }),
            Link.configure({
                openOnClick: false,
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content: value || '',
        editable: !disabled,
        onUpdate: ({ editor: currentEditor }) => {
            onChange?.(currentEditor.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) {
            return;
        }
        editor.setEditable(!disabled);
    }, [disabled, editor]);

    useEffect(() => {
        if (!editor) {
            return;
        }
        if ((value || '') === editor.getHTML()) {
            return;
        }
        editor.commands.setContent(value || '');
    }, [editor, value]);

    if (!editor) {
        return <div className="TipTapAdminEditor__loading" />;
    }

    return (
        <div className={`TipTapAdminEditor ${disabled ? 'is-disabled' : ''}`}>
            {!disabled && (
                <div className="TipTapAdminEditor__toolbar">
                    <button type="button" onClick={() => editor.chain().focus().undo().run()}>
                        <Undo fontSize="small" />
                    </button>
                    <button type="button" onClick={() => editor.chain().focus().redo().run()}>
                        <Redo fontSize="small" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={editor.isActive('bold') ? 'is-active' : ''}
                    >
                        <FormatBold fontSize="small" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={editor.isActive('italic') ? 'is-active' : ''}
                    >
                        <FormatItalic fontSize="small" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={editor.isActive('underline') ? 'is-active' : ''}
                    >
                        <FormatUnderlined fontSize="small" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={editor.isActive('bulletList') ? 'is-active' : ''}
                    >
                        <FormatListBulleted fontSize="small" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={editor.isActive('orderedList') ? 'is-active' : ''}
                    >
                        <FormatListNumbered fontSize="small" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={editor.isActive('blockquote') ? 'is-active' : ''}
                    >
                        <FormatQuote fontSize="small" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        className={editor.isActive('codeBlock') ? 'is-active' : ''}
                    >
                        <Code fontSize="small" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (editor.isActive('link')) {
                                editor.chain().focus().unsetLink().run();
                                return;
                            }
                            editor.chain().focus().setLink({ href: 'https://' }).run();
                        }}
                        className={editor.isActive('link') ? 'is-active' : ''}
                    >
                        <LinkIcon fontSize="small" />
                    </button>
                </div>
            )}
            <EditorContent editor={editor} className="TipTapAdminEditor__content" />
        </div>
    );
};
