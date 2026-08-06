import { Spin } from 'antd';
import Title from 'antd/lib/typography/Title';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Box } from '../Box';
import { Tooltip } from '../tooltip/Tooltip';
import { ReactComponent as InfoIcon } from '../../resources/img/svg/i.svg';
import styles from './styles.module.scss';

export type CardVariant = 'default' | 'dialog';

interface CardProps {
    className?: string;
    isLoading?: boolean;
    fullHeight?: boolean;
    autoHeight?: boolean;
    dialogContentPadding?: boolean;
    variant?: CardVariant;
    headerIcon?: React.ReactElement<any> | number | string;
    titleKey: string;
    subTitle?: React.ReactElement<any> | number | string;
    subTitleKey?: string;
    cardTitleClassName?: string;
    tooltip?: string;
    children: React.ReactElement<any> | number | string | (React.ReactElement<any> | number | string)[];
    cardTitleChildren?: React.ReactElement<any> | number | string | (React.ReactElement<any> | number | string)[];
    /** Optional footer slot: rendered below a top divider (M3 card action row —
     *  Back/Next, Cancel/Save, Edit, etc.). Shared by every wizard/settings card. */
    footer?: React.ReactNode;
    /** Forwarded to the card root as `data-testid` (preserves existing test anchors). */
    dataTestId?: string;
}

export const Card = ({
    className,
    isLoading,
    titleKey,
    subTitle,
    subTitleKey,
    fullHeight,
    autoHeight,
    dialogContentPadding,
    tooltip,
    cardTitleChildren,
    cardTitleClassName,
    variant = 'default',
    headerIcon,
    footer,
    dataTestId,
    children,
}: CardProps) => {
    const { t } = useTranslation();
    const isDialog = variant === 'dialog';

    return (
        <Box
            data-testid={dataTestId}
            className={classNames(styles.card, className, {
                [styles.fullHeight]: fullHeight,
                [styles.dialogCard]: isDialog,
                [styles.dialogAutoHeight]: isDialog && autoHeight,
            })}
            contentClassName={classNames(styles.contentClassName, { [styles.dialogContentClassName]: isDialog })}
        >
            <div
                className={classNames(styles.cardTitle, cardTitleClassName, {
                    [styles.hasSubtitle]: subTitle || subTitleKey,
                    [styles.dialogCardTitle]: isDialog,
                })}
            >
                <div className={classNames(styles.titleContainer, { [styles.dialogTitleContainer]: isDialog })}>
                    {headerIcon && <div className={styles.headerIcon}>{headerIcon}</div>}
                    <Title className={classNames(styles.title)} level={5}>
                        {t(titleKey)}
                    </Title>

                    {tooltip && (
                        <Tooltip className={styles.tooltip} trigger={<InfoIcon fill="var(--m3-primary)" />}>
                            {tooltip}
                        </Tooltip>
                    )}
                </div>
                {cardTitleChildren}
            </div>
            {(subTitle || subTitleKey) && (
                <div className={classNames(styles.cardSubTitle, { [styles.dialogCardSubTitle]: isDialog })}>
                    {subTitle || t(subTitleKey)}
                </div>
            )}
            <div
                className={classNames(styles.container, {
                    [styles.isLoading]: isLoading,
                    [styles.dialogContainer]: isDialog,
                    [styles.dialogContentPadding]: isDialog && dialogContentPadding,
                })}
            >
                {isLoading && <Spin />}
                {!isLoading && children}
            </div>
            {footer && <div className={styles.footer}>{footer}</div>}
        </Box>
    );
};
