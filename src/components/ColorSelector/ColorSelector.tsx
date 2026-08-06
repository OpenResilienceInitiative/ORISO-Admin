import React, { useEffect, useState } from 'react';

import { HexColorPicker } from 'react-colorful';
import useComponentVisible from '../../hooks/useComponentVisible';

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
            <button
                type="button"
                disabled={isLoading}
                className="colorIndicator"
                style={{ backgroundColor: selectedColor }}
                aria-label={label}
                onClick={() => setIsComponentVisible(!isComponentVisible)}
            />
            <div>
                <span>{label}</span>
                {/* Plain `h4` — it used to be antd's `Title level={4}`, and the
                    surrounding stylesheets hook it as `.colorSelector h4`.
                    MuiColorField supplies the baseline type those sheets override. */}
                <h4>HEX {selectedColor}</h4>
            </div>
            {isComponentVisible && (
                <div className="pickerWrapper">
                    <HexColorPicker color={selectedColor || ''} onChange={(color) => handleOnChange(color)} />
                </div>
            )}
        </div>
    );
};

export default ColorSelector;
