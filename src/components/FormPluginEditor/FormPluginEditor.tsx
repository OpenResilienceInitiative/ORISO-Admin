import { useContext, useState } from 'react';
import { Form } from 'antd';

import './FormPluginEditor.styles.scss';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import classNames from 'classnames';
import { FormItemProps } from 'antd/lib/form/FormItem';
import styles from './styles.module.scss';
import TiptapEditor from './TiptapEditor';

type FormEditorProps = {
    name?: string | string[];
    placeholder: string;
    disabled?: boolean;
    className?: string;
    placeholders?: { [key: string]: string };
    itemProps: FormItemProps;
};

// antd Form.Item injects `value` (HTML string) + `onChange` into the single
// child (TiptapEditor); we add the static editor props alongside.
const FormPluginEditor = ({ placeholder, className, placeholders, itemProps, name }: FormEditorProps) => {
    const disabled = useContext(DisabledContext);
    const [focused, setFocused] = useState(false);

    return (
        <div
            className={classNames('RichEditor-root', className, styles.input, {
                [styles.disabled]: disabled,
                [styles.focused]: focused,
            })}
        >
            <Form.Item {...itemProps} className={itemProps.className} name={name}>
                <TiptapEditor
                    placeholder={placeholder}
                    placeholders={placeholders}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />
            </Form.Item>
        </div>
    );
};

export default FormPluginEditor;
