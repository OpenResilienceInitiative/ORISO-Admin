import { ToolbarChildrenProps } from '@draft-js-plugins/static-toolbar/lib/components/Toolbar';
import { EditorState, Modifier, SelectionState } from 'draft-js';
import { useTranslation } from 'react-i18next';
import { useCallback, useMemo } from 'react';
import { Select } from 'antd';

const TEXT_STYLES = [
    { label: 'rte.text', value: 'unstyled' },
    { label: 'rte.h1', value: 'header-one' },
    { label: 'rte.h2', value: 'header-two' },
    { label: 'rte.h3', value: 'header-three' },
    { label: 'rte.h4', value: 'header-four' },
    { label: 'rte.h5', value: 'header-five' },
    { label: 'rte.h6', value: 'header-six' },
];

const TextStyleSelect = ({
    setEditorState,
    getEditorState,
    selectionState,
}: ToolbarChildrenProps & { selectionState: SelectionState }) => {
    const { t } = useTranslation();

    const blockType = useMemo(
        () =>
            selectionState &&
            getEditorState().getCurrentContent().getBlockForKey(selectionState.getStartKey()).getType(),
        [selectionState, getEditorState],
    );

    const handleToggle = useCallback(
        (type: string) => {
            setEditorState(
                EditorState.push(
                    getEditorState(),
                    Modifier.setBlockType(getEditorState().getCurrentContent(), selectionState, type),
                    'change-block-type',
                ),
            );
        },
        [setEditorState, getEditorState, selectionState],
    );

    return (
        <Select
            size="small"
            className="RichEditor-styleSelect"
            dropdownMatchSelectWidth={false}
            disabled={!blockType}
            value={blockType}
            placeholder="Formatierung wählen"
            onChange={handleToggle}
            options={TEXT_STYLES.map(({ label, value }) => ({
                value,
                label: typeof label === 'string' ? t(label) : label,
            }))}
            getPopupContainer={(element: HTMLElement) => element.parentElement}
        />
    );
};
export default TextStyleSelect;
