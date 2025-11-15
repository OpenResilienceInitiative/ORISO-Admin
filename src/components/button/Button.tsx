/* eslint-disable  @typescript-eslint/ban-types */
import { useEffect } from 'react';

export const BUTTON_TYPES = {
    PRIMARY: 'PRIMARY',
    SECONDARY: 'SECONDARY',
    TERTIARY: 'TERTIARY',
    LINK: 'LINK',
    AUTO_CLOSE: 'AUTO_CLOSE',
    SMALL_ICON: 'SMALL_ICON',
};

export interface ButtonItem {
    function?: string;
    disabled?: boolean;
    icon?: JSX.Element;
    id?: string;
    label?: string;
    smallIconBackgroundColor?: 'green' | 'red' | 'yellow' | 'grey' | 'alternate';
    title?: string;
    type: string;
}

export interface ButtonProps {
    buttonHandle?: Function;
    disabled?: boolean;
    isLink?: boolean;
    item: ButtonItem;
    testingAttribute?: string;
    className?: string;
}

export const OVERLAY_RESET_TIME = 10000;

export const Button = (props: ButtonProps) => {
    const { item } = props;
    let timeoutID: number;

    const handleButtonTimer = () => {
        if (item.type === BUTTON_TYPES.AUTO_CLOSE) {
            timeoutID = window.setTimeout(() => {
                props.buttonHandle(item.function);
            }, OVERLAY_RESET_TIME);
        }
    };

    useEffect(() => {
        handleButtonTimer();

        return (): void => {
            if (timeoutID) window.clearTimeout(timeoutID);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const getButtonClassName = (type: string) => {
        let className;
        switch (type) {
            case BUTTON_TYPES.PRIMARY:
                className = 'button__primary';
                break;
            case BUTTON_TYPES.SECONDARY:
                className = 'button__secondary';
                break;
            case BUTTON_TYPES.TERTIARY:
                className = 'button__tertiary';
                break;
            case BUTTON_TYPES.LINK:
                className = 'button__link';
                break;
            case BUTTON_TYPES.AUTO_CLOSE:
                className = 'button__autoClose';
                break;
            case BUTTON_TYPES.SMALL_ICON:
                className = 'button__smallIcon';
                break;
            default:
                className = '';
        }
        return className;
    };

    const handleButtonClick = (event: any) => {
        if (props.disabled || !props.isLink) {
            event.preventDefault();
        }

        if (!props.disabled && !props.item.disabled && props.buttonHandle) {
            if (timeoutID) window.clearTimeout(timeoutID);
            props.buttonHandle(item.function);
        }
    };

    return (
        <div className={`button__wrapper ${props.className ? props.className : ''}`}>
            <button
                type="button"
                onClick={(event) => handleButtonClick(event)}
                id={item.id}
                disabled={props.disabled}
                title={item.title}
                className={`
					button__item 
					${getButtonClassName(item.type)} 
					${item.type === BUTTON_TYPES.SMALL_ICON ? `${getButtonClassName(item.type)}--${item.smallIconBackgroundColor}` : ''} 
					${item.type === BUTTON_TYPES.SMALL_ICON && item.label ? `${getButtonClassName(item.type)}--withLabel` : ''} 
					${props.disabled || props.item.disabled ? ' button__item--disabled' : ''}
				`}
                data-cy={props.testingAttribute}
            >
                {item.icon && item.icon}
                {item.label && item.label}
            </button>
        </div>
    );
};
