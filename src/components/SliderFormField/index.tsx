import React from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Slider } from 'antd';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import classNames from 'classnames';
import styles from './styles.module.scss';

export interface SliderFormFieldProps {
    label: string;
    name: string | string[];
    help?: string;
    className?: string;
    min: number;
    max: number;
}

export const SliderFormField = ({ className, label, name, help, min, max }: SliderFormFieldProps) => {
    const contextDisabled = React.useContext(DisabledContext);
    const [t] = useTranslation();

    return (
        <Form.Item
            label={t(label)}
            help={help ? t(help) : undefined}
            name={name}
            className={classNames(styles.sliderContainer, className)}
        >
            <Slider
                trackStyle={[{ backgroundColor: 'var(--primary)' }]}
                disabled={contextDisabled}
                range
                min={min}
                max={max}
                marks={{ [min]: min, [max]: max }}
                tooltip={{
                    open: true,
                    getPopupContainer: (triggerNode) => triggerNode.parentElement,
                }}
            />
        </Form.Item>
    );
};
