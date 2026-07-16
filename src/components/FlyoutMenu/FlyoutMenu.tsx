import { Children, useCallback, useEffect, useState, type ReactNode } from 'react';
import { EllipsisOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './FlyoutMenu.module.scss';

export type FlyoutMenuPosition = 'right' | 'left' | 'left-bottom' | 'right-bottom' | 'left-top' | 'right-top';

export interface FlyoutMenuProps {
    /** Menu entries — each child becomes one item (buttons/links keep their own handlers). */
    children?: ReactNode;
    /** Controlled open state (the trigger still toggles it locally). */
    isOpen?: boolean;
    /** Fires when the flyout closes (outside click or trigger toggle). */
    handleClose?: () => void;
    position?: FlyoutMenuPosition;
    isHidden?: boolean;
    className?: string;
}

const POSITION_CLASS: Record<FlyoutMenuPosition, string> = {
    right: styles.positionRight,
    left: styles.positionLeft,
    'left-bottom': styles.positionLeftBottom,
    'right-bottom': styles.positionRightBottom,
    'left-top': styles.positionLeftTop,
    'right-top': styles.positionRightTop,
};

/**
 * Ported from ORISO-Frontend's `FlyoutMenu` (#310) so both layers share the menu
 * look & behaviour: an ellipsis trigger toggling a positioned flyout panel that
 * fades in/out (0.25s), closes on outside click and renders each child as a
 * hoverable item. Restyled with the admin `--m3-*` tokens (Elevation-3 shadow).
 */
export const FlyoutMenu = ({
    children,
    isOpen = false,
    handleClose,
    position = 'left',
    isHidden = false,
    className,
}: FlyoutMenuProps) => {
    const [flyoutShown, setFlyoutShown] = useState(isOpen);
    const { t } = useTranslation();

    const closeFlyout = useCallback(() => {
        setFlyoutShown(false);
        handleClose?.();
    }, [handleClose]);

    useEffect(() => {
        setFlyoutShown(isOpen);
    }, [isOpen]);

    // Any click outside (the trigger stops propagation) closes the open flyout.
    useEffect(() => {
        if (!flyoutShown) {
            return undefined;
        }

        document.addEventListener('click', closeFlyout);

        return () => {
            document.removeEventListener('click', closeFlyout);
        };
    }, [flyoutShown, closeFlyout]);

    const items = Children.toArray(children).filter(Boolean);
    if (isHidden || items.length === 0) {
        return null;
    }

    return (
        <div className={classNames(styles.flyoutMenu, POSITION_CLASS[position], className)}>
            <button
                type="button"
                className={styles.trigger}
                aria-label={t('app.menu', 'Menü')}
                title={t('app.menu', 'Menü')}
                aria-expanded={flyoutShown}
                onClick={(event) => {
                    event.stopPropagation();
                    if (flyoutShown) {
                        closeFlyout();
                        return;
                    }

                    setFlyoutShown(true);
                }}
            >
                <EllipsisOutlined />
            </button>
            {/* No `menu` role: the children are arbitrary buttons/links (mirroring the
                frontend component), which would violate aria-required-children. */}
            <div className={classNames(styles.content, { [styles.contentShown]: flyoutShown })}>
                {items.map((child, index) => (
                    // eslint-disable-next-line react/no-array-index-key -- items are positional, mirroring the frontend component
                    <div className={styles.item} key={`flyout-item-${index}`}>
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FlyoutMenu;
