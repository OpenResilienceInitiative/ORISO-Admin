import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Title from 'antd/es/typography/Title';
import DefaultLogo from '../../resources/img/Logo-Connecta.png';
import Spinner from '../../components/Spinner/Spinner';

export interface StageProps {
    className?: string;
    hasAnimation?: boolean;
    isReady?: boolean;
    // Tenant branding — falls back to defaults when not configured
    logo?: string | null;
    claim?: string | null;
}

/**
 * Login stage panel — shows tenant logo and slogan.
 * Uses tenant appearance config when available, falls back to defaults.
 */
const Stage = ({ className, hasAnimation, isReady = true, logo, claim }: StageProps) => {
    const { t } = useTranslation();
    return (
        <div
            id="loginLogoWrapper"
            className={clsx(className, 'stage stage--animated', {
                'stage--ready': isReady,
            })}
        >
            <div className="logo">
                <img src={logo || DefaultLogo} alt="Logo" />
            </div>
            <div className="stage__headline">
                <Title level={1}>{claim || t('slogan')}</Title>
                <Title level={3}>{t('subSlogan')}</Title>
            </div>
            <Spinner className={clsx('stage__spinner', !hasAnimation && 'hidden')} />
        </div>
    );
};

export default Stage;
