import { Spin } from 'antd';
import Title from 'antd/lib/typography/Title';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Box } from '../Box';
import { Tooltip } from '../tooltip/Tooltip';
import { ReactComponent as InfoIcon } from '../../resources/img/svg/i.svg';
import styles from './styles.module.scss';

interface CardProps {
    className?: string;
    isLoading?: boolean;
    fullHeight?: boolean;
    titleKey: string;
    subTitle?: React.ReactChild;
    subTitleKey?: string;
    cardTitleClassName?: string;
    tooltip?: string;
    children: React.ReactChild | React.ReactChild[];
    cardTitleChildren?: React.ReactChild | React.ReactChild[];
}

export const Card = ({
    className,
    isLoading,
    titleKey,
    subTitle,
    subTitleKey,
    fullHeight,
    tooltip,
    cardTitleChildren,
    cardTitleClassName,
    children,
}: CardProps) => {
    const { t } = useTranslation();

    return (
        <Box
            className={classNames(styles.card, className, { [styles.fullHeight]: fullHeight })}
            contentClassName={styles.contentClassName}
        >
            <div
                className={classNames(styles.cardTitle, cardTitleClassName, {
                    [styles.hasSubtitle]: subTitle || subTitleKey,
                })}
            >
                <div className={styles.titleContainer}>
                    <Title className={classNames(styles.title)} level={5}>
                        {t(titleKey)}
                    </Title>

                    {tooltip && (
                        <Tooltip className={styles.tooltip} trigger={<InfoIcon fill="var(--primary)" />}>
                            {tooltip}
                        </Tooltip>
                    )}
                </div>
                {cardTitleChildren}
            </div>
            {(subTitle || subTitleKey) && (
                <div className={classNames(styles.cardSubTitle)}>{subTitle || t(subTitleKey)}</div>
            )}
            <div className={classNames(styles.container, { [styles.isLoading]: isLoading })}>
                {isLoading && <Spin />}
                {!isLoading && children}
            </div>
        </Box>
    );
};
