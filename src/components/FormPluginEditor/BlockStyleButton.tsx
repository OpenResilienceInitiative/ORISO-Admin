import clsx from 'clsx';
import { RichUtils, SelectionState } from 'draft-js';
import React, { MouseEvent, ReactNode, useCallback, useMemo } from 'react';
import { DraftJsStyleButtonProps } from '@draft-js-plugins/buttons';
import { Button } from 'antd';
import { ButtonType } from 'antd/lib/button/button';

interface ButtonProps extends DraftJsStyleButtonProps {
    type: ButtonType;
}

interface CreateBlockStyleButtonProps extends Omit<DraftJsStyleButtonProps, 'buttonProps'> {
    blockType: string;
    children: ReactNode;
    selectionState: SelectionState;
    buttonProps?: ButtonProps;
}

const BlockStyleButton = ({
    blockType,
    children,
    theme,
    buttonProps,
    setEditorState,
    getEditorState,
    selectionState,
}: CreateBlockStyleButtonProps) => {
    const toggleStyle = useCallback(
        (event: MouseEvent): void => {
            event.preventDefault();
            setEditorState(RichUtils.toggleBlockType(getEditorState(), blockType));
        },
        [setEditorState, getEditorState],
    );

    const preventBubblingUp = useCallback((event: MouseEvent): void => {
        event.preventDefault();
    }, []);

    const blockTypeIsActive = useMemo((): boolean => {
        // if the button is rendered before the editor
        const editorState = getEditorState();
        if (!editorState) {
            return false;
        }

        const type =
            selectionState && editorState.getCurrentContent().getBlockForKey(selectionState.getStartKey()).getType();
        return type === blockType;
    }, [selectionState, getEditorState]);

    const className = blockTypeIsActive ? clsx(theme.button, theme.active) : theme.button;

    return (
        <Button
            className={className}
            onMouseDown={preventBubblingUp}
            onClick={toggleStyle}
            size="small"
            role="button"
            aria-label={`create ${blockType}`}
            {...buttonProps}
        >
            {children}
        </Button>
    );
};
export default BlockStyleButton;
