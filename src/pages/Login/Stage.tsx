import React, { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Title from 'antd/es/typography/Title';
import Spinner from '../../components/Spinner/Spinner';

export interface StageProps {
    className?: string;
    hasAnimation?: boolean;
    isReady?: boolean;
    /**
     * The platform logo configured in **Theme settings → Appearance**
     * (`theming.logo` on the public tenant data — the exact source the app
     * layer reads, see `Tenants/GeneralSettings/components/LogoAndFavicon`).
     * When it is not configured — or the URL fails to load — the panel simply
     * shows the headline; there is no stand-in artwork any more (#594.14).
     */
    logo?: string | null;
}

/**
 * The dark stage panel of the public sign-in/sign-up surface.
 *
 * Its surface is the shared `--m3-on-background` token, i.e. literally the
 * desktop sidebar's colour (#594.13a) — see styles/components/stage.less.
 *
 * Language: the headline pair is the localized ADMIN product name and nothing
 * else. It deliberately does NOT show the tenant's public claim
 * (`content.claim`). TenantService resolves that field server-side out of a
 * multilingual map — picking the language from a `lang` cookie the admin does
 * not set and silently falling back to `de`
 * (`TenantConverter#getTranslatedStringFromMap`) — so the value that arrives
 * here carries no language of its own. Rendering it replaced the localized
 * headline once the (serial) settings → tenant request chain resolved, which
 * both flipped this operator surface into whatever language the claim happened
 * to be written in and produced a visible content jump on every cold load.
 *
 * Branding (#594.14): it used to fall back to a hardcoded Lottie animation
 * (`resources/animations/admin_panel.json`) whenever no tenant logo was set,
 * which is what put a stand-in animation next to an uploaded test asset on the
 * onboarding page. The panel now shows exactly one thing — the logo configured
 * in Theme settings → Appearance — and nothing when none is configured.
 */
const Stage = ({ className, hasAnimation, isReady = true, logo }: StageProps) => {
    const { t } = useTranslation();
    const [logoFailed, setLogoFailed] = useState(false);
    const showTenantLogo = Boolean(logo) && !logoFailed;

    return (
        <div id="loginLogoWrapper" className={clsx(className, 'stage', 'stage--animated', { 'stage--ready': isReady })}>
            {showTenantLogo && (
                <div className="logo">
                    <img src={logo as string} alt="Logo" onError={() => setLogoFailed(true)} />
                </div>
            )}
            <div className="stage__headline">
                <Title level={1}>{t('slogan')}</Title>
                <Title level={3}>{t('subSlogan')}</Title>
            </div>
            <Spinner className={clsx('stage__spinner', !hasAnimation && 'hidden')} />
        </div>
    );
};

export default Stage;
