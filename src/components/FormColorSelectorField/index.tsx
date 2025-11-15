import { Form } from 'antd';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import classNames from 'classnames';
import ColorSelector from '../ColorSelector/ColorSelector';
import styles from './styles.module.scss';

interface FormColorSelectorFieldProps {
    className?: string;
    name?: string | string[];
    labelKey?: string;
    required?: boolean;
}

interface FormColorSelectorProps {
    onChange?: (value: string) => void;
    value?: string;
    labelKey?: string;
}

const FormColorSelectorLocal = ({ labelKey, onChange, value }: FormColorSelectorProps) => {
    const contextDisabled = useContext(DisabledContext);
    const { t } = useTranslation();

    return (
        <ColorSelector
            isLoading={contextDisabled}
            label={t(labelKey)}
            tenantColor={value}
            setColorValue={(_, color: string) => onChange(color)}
            field="primaryColor"
        />
    );
};

export const FormColorSelectorField = ({ className, name, labelKey, required }: FormColorSelectorFieldProps) => {
    return (
        <Form.Item className={classNames(className, styles.item)} name={name} rules={[{ required }]}>
            <FormColorSelectorLocal labelKey={labelKey} />
        </Form.Item>
    );
};
