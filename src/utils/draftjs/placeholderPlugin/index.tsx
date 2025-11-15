import React, { ReactElement } from 'react';
import { EditorState, Modifier, SelectionState } from 'draft-js';
import { EditorPlugin } from '@draft-js-plugins/editor';
import { useTranslation } from 'react-i18next';
import Placeholder, { PlaceholderProps } from './Placeholder/Placeholder';
import placeholderStrategy from './placeholderStrategy';
import { PlaceholderPluginConfig, PlaceholderPluginStore } from './types';

export * from './Control/Placeholder';

const PLACEHOLDER_REGEX = /\${[A-Za-z0-9_-]*}/g;

const findWithRegex = (regex, contentBlock, placeholders, callback) => {
    const text = contentBlock.getText();
    let matchArr;
    let start;
    // eslint-disable-next-line no-cond-assign
    while ((matchArr = regex.exec(text)) !== null) {
        const placeholderKey = text.substring(matchArr.index + 2, matchArr.index + matchArr[0].length - 1);
        if (!placeholders?.[placeholderKey]) {
            return;
        }
        start = matchArr.index;
        callback(start, start + matchArr[0].length);
    }
};

const DecoratedPlaceholder = (store, placeholders) =>
    function PlaceholderComponent(props: PlaceholderProps): ReactElement {
        const { t } = useTranslation();
        const editorState = store.getEditorState();
        const contentState = editorState.getCurrentContent();

        const { key } = contentState.getEntity(props.entityKey).getData();
        return <Placeholder {...props}>{t(placeholders[key])}</Placeholder>;
    };

export default (config: PlaceholderPluginConfig = {}): EditorPlugin => {
    const store: PlaceholderPluginStore = {
        getEditorRef: undefined,
        getReadOnly: undefined,
        getEditorState: undefined,
        setEditorState: undefined,
        getProps: undefined,
    };

    const { placeholders } = config;

    return {
        initialize: ({ getEditorRef, getReadOnly, getEditorState, setEditorState, getProps }) => {
            store.getReadOnly = getReadOnly;
            store.getEditorRef = getEditorRef;
            store.getEditorState = getEditorState;
            store.setEditorState = setEditorState;
            store.getProps = getProps;
        },
        onChange: (editorState) => {
            let contentState = editorState.getCurrentContent();
            const selection = editorState.getSelection();

            contentState.getBlocksAsArray().forEach((block) => {
                findWithRegex(PLACEHOLDER_REGEX, block, placeholders, (start, end) => {
                    const key = block.getText().substring(start + 2, end - 1);
                    if (!placeholders?.[key]) {
                        return;
                    }

                    const contentStateWithEntity = contentState.createEntity('PLACEHOLDER', 'IMMUTABLE', {
                        key,
                        disabled: store.getProps && store.getProps().readOnly,
                    });
                    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();

                    const selectionState = SelectionState.createEmpty(block.getKey()).merge({
                        anchorOffset: start,
                        focusOffset: end,
                    });

                    contentState = Modifier.applyEntity(contentState, selectionState, entityKey);
                });
            });

            const newEditorState = EditorState.push(editorState, contentState, 'apply-entity');
            return selection.getHasFocus() ? EditorState.forceSelection(newEditorState, selection) : newEditorState;
        },
        handleBeforeInput: (chars, state: EditorState) => {
            const selection = state.getSelection();
            const startOffset = selection.getStartOffset();
            const endOffset = selection.getEndOffset();
            const content = state.getCurrentContent();
            const startBlock = content.getBlockForKey(selection.getStartKey());
            const endBlock = content.getBlockForKey(selection.getEndKey());
            const startEntityKey = startBlock.getEntityAt(startOffset);
            const endEntityKey = endBlock.getEntityAt(endOffset);
            if (startEntityKey === null && endEntityKey === null) return 'not-handled';
            let hasPlaceholder = false;
            let startEntity;
            let endEntity;
            if (startEntityKey) {
                startEntity = content.getEntity(startEntityKey);
                if (startEntity.getType() === 'PLACEHOLDER') {
                    hasPlaceholder = true;
                }
            }
            if (endEntityKey) {
                endEntity = content.getEntity(endEntityKey);
                if (endEntity.getType() === 'PLACEHOLDER') {
                    hasPlaceholder = true;
                }
            }

            if (!hasPlaceholder) return 'not-handled';

            let canEdit = true;
            startBlock.findEntityRanges(
                (v) =>
                    (startEntityKey && v.getEntity() === startEntityKey) ||
                    (endEntityKey && v.getEntity() === endEntityKey),
                (start) => {
                    if (startOffset > start || endOffset > start) {
                        canEdit = false;
                    }
                },
            );
            endBlock.findEntityRanges(
                (v) =>
                    (startEntityKey && v.getEntity() === startEntityKey) ||
                    (endEntityKey && v.getEntity() === endEntityKey),
                (start) => {
                    if (startOffset > start || endOffset > start) {
                        canEdit = false;
                    }
                },
            );

            return canEdit ? 'not-handled' : 'handled';
        },
        decorators: [
            {
                strategy: placeholderStrategy,
                component: DecoratedPlaceholder(store, placeholders),
            },
        ],
    };
};
