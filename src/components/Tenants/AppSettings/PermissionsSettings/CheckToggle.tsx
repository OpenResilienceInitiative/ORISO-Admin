import { Form } from 'antd';
import { M3Switch } from '../../../M3Switch';
import { syncMasterChildTogglesInForm } from './permissionsToggleLogic';
import type { ToggleAfterChangeHandler } from './types';

type CheckToggleInnerProps = {
    checked?: boolean;
    onChange?: (value: boolean) => void;
    disabled?: boolean;
    label: string;
    fieldName: string | string[];
    onAfterChange?: ToggleAfterChangeHandler;
};

const CheckToggleInner = ({
    checked,
    onChange,
    disabled,
    label,
    fieldName,
    onAfterChange,
}: CheckToggleInnerProps) => {
    const form = Form.useFormInstance();

    const handleToggle = () => {
        if (disabled) return;
        const newValue = !checked;
        onChange?.(newValue);
        syncMasterChildTogglesInForm(form, fieldName, newValue);
        onAfterChange?.(fieldName, newValue, form.getFieldsValue(true));
    };

    return <M3Switch checked={checked} label={label} disabled={disabled} onChange={handleToggle} />;
};

type CheckToggleProps = {
    name: string | string[];
    label: string;
    disabled?: boolean;
    onAfterChange?: ToggleAfterChangeHandler;
};

export const CheckToggle = ({ name, label, disabled, onAfterChange }: CheckToggleProps) => (
    <Form.Item name={name} valuePropName="checked" noStyle>
        <CheckToggleInner label={label} disabled={disabled} fieldName={name} onAfterChange={onAfterChange} />
    </Form.Item>
);
