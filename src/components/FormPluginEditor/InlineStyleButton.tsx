import clsx from 'clsx';
import { RichUtils } from 'draft-js';
import React, { MouseEvent, ReactNode, useCallback } from 'react';
import { DraftJsStyleButtonProps } from '@draft-js-plugins/buttons';
import { Button } from 'antd';
import { ButtonType } from 'antd/lib/button/button';

interface ButtonProps extends DraftJsStyleButtonProps {
    type: ButtonType;
}

interface CreateInlineStyleButtonProps extends Omit<DraftJsStyleButtonProps, 'buttonProps'> {
    inlineStyle: string;
    children: ReactNode;
    active: boolean;
    buttonProps?: ButtonProps;
}

const InlineStyleButton = ({
    inlineStyle,
    children,
    theme,
    buttonProps,
    setEditorState,
    getEditorState,
    active,
}: CreateInlineStyleButtonProps) => {
    const toggleStyle = useCallback(
        (event: MouseEvent): void => {
            event.preventDefault();
            setEditorState(RichUtils.toggleInlineStyle(getEditorState(), inlineStyle));
        },
        [getEditorState, setEditorState],
    );

    const preventBubblingUp = useCallback((event: MouseEvent): void => {
        event.preventDefault();
    }, []);

    const className = active ? clsx(theme.button, theme.active) : theme.button;

    return (
        <Button
            className={className}
            onMouseDown={preventBubblingUp}
            onClick={toggleStyle}
            size="small"
            role="button"
            aria-label={`${inlineStyle} text`}
            {...buttonProps}
        >
            {children}
        </Button>
    );
};
export default InlineStyleButton;
