import { useContext, useState } from 'react';
import { Form } from 'antd';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import classNames from 'classnames';
import { FormItemProps } from 'antd/lib/form/FormItem';
import { TipTapField } from './TipTapField';
import styles from './styles.module.scss';
import './TipTapEditor.styles.scss';

type FormTipTapEditorProps = {
    name?: string | string[];
    placeholder: string;
    disabled?: boolean;
    className?: string;
    placeholders?: { [key: string]: string };
    itemProps: FormItemProps;
};

export const FormTipTapEditor = ({ placeholder, className, placeholders, itemProps, name }: FormTipTapEditorProps) => {
    const disabled = useContext(DisabledContext);
    const [focused, setFocused] = useState(false);

    return (
        <div
            className={classNames('TipTapAdminEditor-root', className, styles.input, {
                [styles.disabled]: disabled,
                [styles.focused]: focused,
                'is-focused': focused,
                'is-disabled': disabled,
            })}
        >
            <Form.Item {...itemProps} className={itemProps.className} name={name}>
                <TipTapField
                    placeholder={placeholder}
                    placeholders={placeholders}
                    disabled={disabled}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />
            </Form.Item>
        </div>
    );
};

export default FormTipTapEditor;
