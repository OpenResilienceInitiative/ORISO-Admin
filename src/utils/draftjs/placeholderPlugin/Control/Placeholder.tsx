import { ToolbarChildrenProps } from '@draft-js-plugins/static-toolbar/lib/components/Toolbar';
import React, { useCallback, useEffect, useState } from 'react';
import { EditorState, Modifier, SelectionState } from 'draft-js';
import { Select, Tooltip } from 'antd';
import { InfoCircleFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

export const PlaceholderControl = ({
    placeholders,
    setEditorState,
    getEditorState,
    selectionState,
}: ToolbarChildrenProps & { placeholders: any; selectionState: SelectionState }) => {
    const { t } = useTranslation();
    const [disabled, setDisabled] = useState(!selectionState || !selectionState.isCollapsed());

    useEffect(() => {
        setDisabled((state) => {
            return selectionState && selectionState.getHasFocus() ? !selectionState.isCollapsed() : state;
        });
    }, [selectionState]);

    const insertPlaceholder = useCallback(
        (key: string) => {
            if (!selectionState) return;
            const state = getEditorState();
            const selection = SelectionState.createEmpty(selectionState.getStartKey()).merge({
                anchorOffset: selectionState.getAnchorOffset(),
                focusOffset: selectionState.getFocusOffset(),
            });

            const contentState = state.getCurrentContent();
            const contentStateWithEntity = contentState.createEntity('PLACEHOLDER', 'IMMUTABLE', {
                key,
                disabled,
            });

            const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
            const modifiedContent = Modifier.insertText(contentState, selection, `\${${key}}`, null, entityKey);

            // Add placeholder to state and force selection after the placeholder
            setEditorState(
                EditorState.forceSelection(
                    EditorState.push(state, modifiedContent, 'apply-entity'),
                    SelectionState.createEmpty(selectionState.getStartKey()).merge({
                        anchorOffset: selection.getAnchorOffset() + `\${${key}}`.length,
                        focusOffset: selection.getFocusOffset() + `\${${key}}`.length,
                    }),
                ),
            );
        },
        [disabled, selectionState, getEditorState],
    );

    return (
        <div className="RichEditor-toolbar-placeholder">
            <div>{t('editor.plugin.placeholder.label')}:</div>
            <div>
                <Tooltip
                    overlayClassName="RichEditor-toolbar-placeholder-tooltip"
                    title={t('editor.plugin.placeholder.tooltip.title')}
                    trigger="hover"
                    color="white"
                >
                    <InfoCircleFilled />
                </Tooltip>
            </div>
            <div>
                <Select
                    size="small"
                    placeholder={t('editor.plugin.placeholder.select.placeholder')}
                    dropdownMatchSelectWidth={false}
                    value={null}
                    disabled={disabled}
                    onChange={insertPlaceholder}
                    options={Object.keys(placeholders).map((p) => ({
                        label: t(placeholders[p]),
                        value: p,
                    }))}
                />
            </div>
        </div>
    );
};
