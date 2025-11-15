import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import {
    ContentState,
    convertFromHTML,
    DraftEditorCommand,
    DraftHandleValue,
    EditorState,
    getDefaultKeyBinding,
    RichUtils,
} from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import PluginsEditor from '@draft-js-plugins/editor';
import classNames from 'classnames';
import createPlaceholderPlugin from '../../utils/draftjs/placeholderPlugin';

const Editor = ({
    onChange,
    value = '',
    onSelectionChange,
    onInlineStyleChange,
    placeholders,
    onBlur,
    onFocus,
    placeholder,
    editorPlugins,
}: any) => {
    const disabled = useContext(DisabledContext);

    const plugins = useMemo(() => [...editorPlugins, createPlaceholderPlugin({ placeholders })], [placeholders]);

    const [editorState, setEditorState] = useState<EditorState>(() => {
        const { contentBlocks, entityMap } = convertFromHTML(value);
        const contentState = ContentState.createFromBlockArray(contentBlocks, entityMap);
        return EditorState.createWithContent(contentState);
    });

    useEffect(() => {
        setEditorState((state) => {
            const contentState = state.getCurrentContent();
            contentState.getAllEntities().forEach((entity, entityKey) => {
                contentState.mergeEntityData(entityKey, { disabled });
            });
            return EditorState.createWithContent(contentState, state.getDecorator());
        });
    }, [disabled]);

    useEffect(() => {
        const resetState = () => {
            if (editorState.getSelection().getHasFocus()) return;
            onSelectionChange(undefined);
            onInlineStyleChange(undefined);
        };

        const selection = editorState.getSelection();
        if (!selection.getHasFocus()) return resetState;
        onSelectionChange(selection);
        onInlineStyleChange(editorState.getCurrentInlineStyle());

        return resetState;
    }, [editorState, onSelectionChange, onInlineStyleChange]);

    const handleChange = useCallback(
        (edited: EditorState) => {
            setEditorState(edited);
            const contentState = edited.getCurrentContent();
            onChange(contentState.hasText() ? stateToHTML(contentState) : '');
        },
        [onChange],
    );

    // Just because the library isn't properly typed
    const extraProps = { onBlur, onFocus };

    const className = [`RichEditor-editor`];
    const contentState = editorState.getCurrentContent();
    if (disabled) {
        className.push('RichEditor-disabled');
    } else if (!contentState.hasText()) {
        if (contentState.getBlockMap().first().getType() !== 'unstyled') {
            className.push('RichEditor-hidePlaceholder');
        }
    }

    const handleKeyCommand = useCallback((command: string, editorStat: EditorState): DraftHandleValue => {
        const newState = RichUtils.handleKeyCommand(editorStat, command);
        if (newState) {
            handleChange(newState);
            return 'handled';
        }
        return 'not-handled';
    }, []);

    const mapKeyToEditorCommand = useCallback(
        (e): DraftEditorCommand | null => {
            if (e.keyCode === 9) {
                const newEditorState = RichUtils.onTab(e, editorState, 4);
                if (newEditorState === editorState) {
                    handleChange(newEditorState);
                }
                return null;
            }
            return getDefaultKeyBinding(e);
        },
        [editorState],
    );

    const editorRef = useRef<any>();
    const focus = useCallback(() => {
        editorRef.current.focus();
    }, []);

    return (
        <>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
            <div className={classNames(className)} onClick={focus}>
                <PluginsEditor
                    ref={editorRef}
                    editorState={editorState}
                    onChange={handleChange}
                    placeholder={placeholder}
                    plugins={plugins}
                    readOnly={disabled}
                    {...extraProps}
                    handleKeyCommand={handleKeyCommand}
                    keyBindingFn={mapKeyToEditorCommand}
                />
            </div>
        </>
    );
};
export default Editor;
