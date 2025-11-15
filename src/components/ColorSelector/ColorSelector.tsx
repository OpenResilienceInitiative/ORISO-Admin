import React, { useEffect, useState } from 'react';

import { SketchPicker } from 'react-color';
import { Typography, Input } from 'antd';
import useComponentVisible from '../../hooks/useComponentVisible';

const { Title } = Typography;

interface ColorSelectorProps {
    isLoading: boolean;
    label: string;
    tenantColor: string;
    field: string;
    setColorValue: (field: string, color: string) => void;
}

const ColorSelector = ({ isLoading, label, tenantColor, setColorValue, field }: ColorSelectorProps) => {
    const [selectedColor, setSelectedColor] = useState(tenantColor);
    const { ref, isComponentVisible, setIsComponentVisible } = useComponentVisible();

    const handleOnChange = (color: string) => {
        setSelectedColor(color);
        setColorValue(field, color);
    };

    useEffect(() => {
        setSelectedColor(tenantColor);
    }, [tenantColor]);

    return (
        <div className="colorSelector" ref={ref}>
            <Input hidden />
            <button
                type="button"
                disabled={isLoading}
                className="colorIndicator"
                style={{ backgroundColor: selectedColor }}
                onClick={() => setIsComponentVisible(!isComponentVisible)}
            />
            <div>
                <span>{label}</span>
                <Title level={4}>HEX {selectedColor}</Title>
            </div>
            {isComponentVisible && (
                <div className="pickerWrapper">
                    <SketchPicker
                        disableAlpha
                        color={selectedColor || ''}
                        onChange={(color: any) => handleOnChange(color.hex)}
                    />
                </div>
            )}
        </div>
    );
};

export default ColorSelector;
