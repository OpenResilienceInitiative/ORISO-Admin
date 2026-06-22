import { useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Select, Tooltip } from 'antd';
import { InfoCircleFilled } from '@ant-design/icons';
import {
    FormatBold,
    FormatItalic,
    FormatUnderlined,
    FormatStrikethrough,
    FormatListBulleted,
    FormatListNumbered,
    FormatQuote,
    Code,
    Link as LinkIcon,
    Undo,
    Redo,
    HorizontalRule,
    Highlight as HighlightIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface TipTapFieldProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    placeholders?: { [key: string]: string };
    onFocus?: () => void;
    onBlur?: () => void;
}

const HEADING_OPTIONS = [
    { value: 'paragraph', labelKey: 'rte.text' },
    { value: '1', labelKey: 'rte.h1' },
    { value: '2', labelKey: 'rte.h2' },
    { value: '3', labelKey: 'rte.h3' },
    { value: '4', labelKey: 'rte.h4' },
    { value: '5', labelKey: 'rte.h5' },
    { value: '6', labelKey: 'rte.h6' },
];

const getActiveBlockType = (editor: ReturnType<typeof useEditor>): string => {
    if (!editor) {
        return 'paragraph';
    }
    for (let level = 1; level <= 6; level += 1) {
        if (editor.isActive('heading', { level })) {
            return String(level);
        }
    }
    return 'paragraph';
};

export const TipTapField = ({
    value = '',
    onChange,
    placeholder,
    disabled,
    placeholders,
    onFocus,
    onBlur,
}: TipTapFieldProps) => {
    const { t } = useTranslation();

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Highlight.configure({ multicolor: true }),
            Link.configure({
                openOnClick: false,
                autolink: true,
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
        onFocus: () => onFocus?.(),
        onBlur: () => onBlur?.(),
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

    const headingOptions = useMemo(
        () =>
            HEADING_OPTIONS.map(({ value: optionValue, labelKey }) => ({
                value: optionValue,
                label: t(labelKey),
            })),
        [t],
    );

    const placeholderOptions = useMemo(
        () =>
            Object.keys(placeholders || {}).map((key) => ({
                value: key,
                label: t(placeholders?.[key] || key),
            })),
        [placeholders, t],
    );

    const setBlockType = (blockType: string) => {
        if (!editor) {
            return;
        }
        if (blockType === 'paragraph') {
            editor.chain().focus().setParagraph().run();
            return;
        }
        editor
            .chain()
            .focus()
            .toggleHeading({ level: Number(blockType) as 1 | 2 | 3 | 4 | 5 | 6 })
            .run();
    };

    const setLink = () => {
        if (!editor) {
            return;
        }
        const previousUrl = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt(t('editor.plugin.link.prompt', 'Enter URL'), previousUrl || 'https://');
        if (url === null) {
            return;
        }
        if (url.trim() === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    };

    const insertPlaceholder = (key: string) => {
        editor?.chain().focus().insertContent(`\${${key}}`).run();
    };

    if (!editor) {
        return <div className="TipTapAdminEditor__loading" />;
    }

    return (
        <div className={`TipTapAdminEditor ${disabled ? 'is-disabled' : ''}`}>
            {!disabled && (
                <div className="TipTapAdminEditor__toolbar">
                    <div className="TipTapAdminEditor__toolbar-group">
                        <button type="button" onClick={() => editor.chain().focus().undo().run()} aria-label="Undo">
                            <Undo fontSize="small" />
                        </button>
                        <button type="button" onClick={() => editor.chain().focus().redo().run()} aria-label="Redo">
                            <Redo fontSize="small" />
                        </button>
                    </div>

                    <div className="TipTapAdminEditor__toolbar-group">
                        <Select
                            size="small"
                            className="TipTapAdminEditor__heading-select"
                            value={getActiveBlockType(editor)}
                            options={headingOptions}
                            onChange={setBlockType}
                            placeholder={t('rte.placeholder')}
                        />
                    </div>

                    <div className="TipTapAdminEditor__toolbar-group">
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={editor.isActive('bold') ? 'is-active' : ''}
                            aria-label="Bold"
                        >
                            <FormatBold fontSize="small" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={editor.isActive('italic') ? 'is-active' : ''}
                            aria-label="Italic"
                        >
                            <FormatItalic fontSize="small" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            className={editor.isActive('underline') ? 'is-active' : ''}
                            aria-label="Underline"
                        >
                            <FormatUnderlined fontSize="small" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={editor.isActive('strike') ? 'is-active' : ''}
                            aria-label="Strikethrough"
                        >
                            <FormatStrikethrough fontSize="small" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleHighlight().run()}
                            className={editor.isActive('highlight') ? 'is-active' : ''}
                            aria-label="Highlight"
                        >
                            <HighlightIcon fontSize="small" />
                        </button>
                    </div>

                    <div className="TipTapAdminEditor__toolbar-group">
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className={editor.isActive('bulletList') ? 'is-active' : ''}
                            aria-label="Bullet list"
                        >
                            <FormatListBulleted fontSize="small" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            className={editor.isActive('orderedList') ? 'is-active' : ''}
                            aria-label="Numbered list"
                        >
                            <FormatListNumbered fontSize="small" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            className={editor.isActive('blockquote') ? 'is-active' : ''}
                            aria-label="Quote"
                        >
                            <FormatQuote fontSize="small" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                            className={editor.isActive('codeBlock') ? 'is-active' : ''}
                            aria-label="Code block"
                        >
                            <Code fontSize="small" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().setHorizontalRule().run()}
                            aria-label="Horizontal rule"
                        >
                            <HorizontalRule fontSize="small" />
                        </button>
                    </div>

                    <div className="TipTapAdminEditor__toolbar-group">
                        <button
                            type="button"
                            onClick={setLink}
                            className={editor.isActive('link') ? 'is-active' : ''}
                            aria-label="Link"
                        >
                            <LinkIcon fontSize="small" />
                        </button>
                    </div>

                    {placeholderOptions.length > 0 && (
                        <div className="TipTapAdminEditor__toolbar-group TipTapAdminEditor__placeholder">
                            <span>{t('editor.plugin.placeholder.label')}:</span>
                            <Tooltip
                                overlayClassName="RichEditor-toolbar-placeholder-tooltip"
                                title={t('editor.plugin.placeholder.tooltip.title')}
                                trigger="hover"
                                color="white"
                            >
                                <InfoCircleFilled />
                            </Tooltip>
                            <Select
                                size="small"
                                placeholder={t('editor.plugin.placeholder.select.placeholder')}
                                dropdownMatchSelectWidth={false}
                                value={null}
                                options={placeholderOptions}
                                onChange={insertPlaceholder}
                            />
                        </div>
                    )}
                </div>
            )}
            <EditorContent editor={editor} className="TipTapAdminEditor__content" />
        </div>
    );
};
