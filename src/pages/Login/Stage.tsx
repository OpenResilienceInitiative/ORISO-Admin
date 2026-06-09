import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Title from 'antd/es/typography/Title';
import Spinner from '../../components/Spinner/Spinner';
import { ReactComponent as StandardIcon } from '../../resources/img/svg/login/standard_icon_oriso.svg';
import { ReactComponent as StandardFilledIcon } from '../../resources/img/svg/login/standard_icon_oriso-filled.svg';

export interface StageProps {
    className?: string;
    hasUsernameInput?: boolean;
    hasAnimation?: boolean;
    isReady?: boolean;
}

/**
 * login component
 * checks if the users token is still valid
 * @constructor
 */
const Stage = ({ className, hasAnimation, hasUsernameInput = false, isReady = true }: StageProps) => {
    const { t } = useTranslation();
    const LogoIcon = hasUsernameInput ? StandardIcon : StandardFilledIcon;

    return (
        <div
            id="loginLogoWrapper"
            className={clsx(className, 'stage stage--animated', {
                'stage--ready': isReady,
            })}
        >
            <div className="logo">
                <LogoIcon aria-hidden />
            </div>
            <div className="stage__headline">
                <Title level={1}>{t('slogan')}</Title>
                <Title level={3}>{t('subSlogan')}</Title>
            </div>
            <Spinner className={clsx('stage__spinner', !hasAnimation && 'hidden')} />
        </div>
    );
};

export default Stage;
