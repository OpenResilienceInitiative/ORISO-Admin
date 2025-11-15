import { useContext, useState } from 'react';
import createToolbarPlugin from '@draft-js-plugins/static-toolbar';
import '@draft-js-plugins/static-toolbar/lib/plugin.css';
import {
    FormatBold,
    FormatItalic,
    FormatUnderlined,
    FormatListBulleted,
    FormatListNumbered,
} from '@mui/icons-material';
import { SelectionState, DraftInlineStyle } from 'draft-js';
import { Form } from 'antd';

import './FormPluginEditor.styles.scss';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import classNames from 'classnames';
import { FormItemProps } from 'antd/lib/form/FormItem';
import styles from './styles.module.scss';
import createLinkPlugin, { LinkControl } from '../../utils/draftjs/linkPlugin';
import createImagePlugin, { ImageControl } from '../../utils/draftjs/imagePlugin';
import { PlaceholderControl } from '../../utils/draftjs/placeholderPlugin';
import BlockStyleButton from './BlockStyleButton';
import InlineStyleButton from './InlineStyleButton';
import TextStyleSelect from './TextStyleSelect';
import Editor from './Editor';

type FormEditorProps = {
    name?: string | string[];
    placeholder: string;
    disabled?: boolean;
    className?: string;
    placeholders?: { [key: string]: string };
    itemProps: FormItemProps;
};

const FormPluginEditor = ({ placeholder, className, placeholders, itemProps, name }: FormEditorProps) => {
    // This state handling for plugins and toolbar is required because multiple editors will collide on the same page
    const [{ plugins, Toolbar }] = useState(() => {
        const toolbarPlugin = createToolbarPlugin();
        const linkPlugin = createLinkPlugin();
        const imagePlugin = createImagePlugin();
        const { Toolbar: ToolbarComponent } = toolbarPlugin;
        return {
            plugins: [toolbarPlugin, linkPlugin, imagePlugin],
            Toolbar: ToolbarComponent,
        };
    });

    const disabled = useContext(DisabledContext);
    const [selectionState, setSelectionState] = useState<SelectionState>();
    const [currentInlineStyle, setCurrentInlineStyle] = useState<DraftInlineStyle>();
    const [focused, setFocused] = useState(false);

    return (
        <div
            className={classNames('RichEditor-root', className, styles.input, {
                [styles.disabled]: disabled,
                [styles.focused]: focused,
            })}
        >
            {!disabled && (
                <div className="RichEditor-toolbar">
                    <Toolbar>
                        {
                            // may be use React.Fragment instead of div to improve perfomance after React 16
                            (externalProps) => (
                                <>
                                    <div className="RichEditor-controls">
                                        <div className="RichEditor-control-group">
                                            <TextStyleSelect {...externalProps} selectionState={selectionState} />
                                        </div>
                                        <div className="RichEditor-control-group">
                                            <InlineStyleButton
                                                {...externalProps}
                                                inlineStyle="BOLD"
                                                active={currentInlineStyle?.has('BOLD')}
                                            >
                                                <FormatBold />
                                            </InlineStyleButton>
                                            <InlineStyleButton
                                                {...externalProps}
                                                inlineStyle="ITALIC"
                                                active={currentInlineStyle?.has('ITALIC')}
                                            >
                                                <FormatItalic />
                                            </InlineStyleButton>
                                            <InlineStyleButton
                                                {...externalProps}
                                                inlineStyle="UNDERLINE"
                                                active={currentInlineStyle?.has('UNDERLINE')}
                                            >
                                                <FormatUnderlined />
                                            </InlineStyleButton>
                                        </div>
                                        <div className="RichEditor-control-group">
                                            <BlockStyleButton
                                                {...externalProps}
                                                selectionState={selectionState}
                                                blockType="unordered-list-item"
                                            >
                                                <FormatListBulleted />
                                            </BlockStyleButton>
                                            <BlockStyleButton
                                                {...externalProps}
                                                selectionState={selectionState}
                                                blockType="ordered-list-item"
                                            >
                                                <FormatListNumbered />
                                            </BlockStyleButton>
                                        </div>
                                        <div className="RichEditor-control-group">
                                            <LinkControl {...externalProps} selectionState={selectionState} />
                                        </div>
                                        <div className="RichEditor-control-group">
                                            <ImageControl {...externalProps} selectionState={selectionState} />
                                        </div>
                                    </div>
                                    {Object.keys(placeholders || {}).length > 0 && (
                                        <PlaceholderControl
                                            placeholders={placeholders}
                                            selectionState={selectionState}
                                            {...externalProps}
                                        />
                                    )}
                                </>
                            )
                        }
                    </Toolbar>
                </div>
            )}

            <Form.Item {...itemProps} className={itemProps.className} name={name}>
                <Editor
                    placeholders={placeholders}
                    onSelectionChange={setSelectionState}
                    onInlineStyleChange={setCurrentInlineStyle}
                    placeholder={placeholder}
                    onBlur={() => setFocused(false)}
                    onFocus={() => setFocused(true)}
                    editorPlugins={plugins}
                />
            </Form.Item>
        </div>
    );
};

export default FormPluginEditor;
