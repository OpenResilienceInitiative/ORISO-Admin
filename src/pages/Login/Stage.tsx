import React, { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Title from 'antd/es/typography/Title';
import Spinner from '../../components/Spinner/Spinner';
import { LottieAnimation } from '../../components/LottieAnimation';
import adminPanelAnimation from '../../resources/animations/admin_panel.json';

export interface StageProps {
    className?: string;
    hasAnimation?: boolean;
    isReady?: boolean;
    // Tenant branding — falls back to the brand animation when not configured or broken
    logo?: string | null;
    claim?: string | null;
}

/**
 * Login stage panel — shows tenant logo and slogan over the dark loading overlay.
 * A configured tenant logo is shown when it loads; otherwise — including when the
 * configured logo URL fails to load — the ORISO brand Lottie animation plays once
 * (half speed) in its place.
 */
const Stage = ({ className, hasAnimation, isReady = true, logo, claim }: StageProps) => {
    const { t } = useTranslation();
    const [logoFailed, setLogoFailed] = useState(false);
    const showTenantLogo = Boolean(logo) && !logoFailed;

    return (
        <div id="loginLogoWrapper" className={clsx(className, 'stage', 'stage--animated', { 'stage--ready': isReady })}>
            {showTenantLogo ? (
                <div className="logo">
                    <img src={logo as string} alt="Logo" onError={() => setLogoFailed(true)} />
                </div>
            ) : (
                <LottieAnimation className="stage__lottie" animationData={adminPanelAnimation} />
            )}
            <div className="stage__headline">
                <Title level={1}>{claim || t('slogan')}</Title>
                <Title level={3}>{t('subSlogan')}</Title>
            </div>
            <Spinner className={clsx('stage__spinner', !hasAnimation && 'hidden')} />
        </div>
    );
};

export default Stage;
