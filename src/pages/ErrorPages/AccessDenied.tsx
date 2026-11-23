import { Button } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicPageLayoutWrapper from '../../components/Layout/PublicPageLayoutWrapper';
import routePathNames from '../../appConfig';
import { bootstrapAuthSession, getAccessTokenForRequests } from '../../api/auth/auth';
import { AUTH_BFF_REQUEST_TIMEOUT_MS } from '../../api/auth/authBffClient';
import { hasSessionTokens } from '../../api/auth/tokenSessionStore';
import { hasAdminPortalAccess } from '../../utils/adminPortalAccess';
import logout from '../../api/auth/logout';
import { ReactComponent as UnauthorizedIcon } from '../../resources/img/illustrations/unauthorized.svg';
import styles from './styles.module.scss';

export const AccessDenied = () => {
    const { t } = useTranslation();
    const [sessionState, setSessionState] = useState<'restoring' | 'ready' | 'signingOut'>(() =>
        hasSessionTokens() ? 'ready' : 'restoring',
    );
    const restoreController = useRef<AbortController | null>(null);

    useEffect(() => {
        if (sessionState !== 'restoring') return undefined;

        const controller = new AbortController();
        restoreController.current = controller;
        const timeout = window.setTimeout(() => {
            if (controller.signal.aborted) return;
            controller.abort();
            setSessionState('ready');
        }, AUTH_BFF_REQUEST_TIMEOUT_MS);

        const finishRestore = () => {
            if (!controller.signal.aborted) setSessionState('ready');
        };
        bootstrapAuthSession(controller.signal).then(finishRestore, finishRestore);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
            restoreController.current = null;
        };
    }, [sessionState]);

    const homeReady = sessionState === 'ready';
    const hasAdminSession = hasSessionTokens() && hasAdminPortalAccess(getAccessTokenForRequests());
    const redirectPath = hasAdminSession ? routePathNames.root : '/app';

    const signOut = () => {
        restoreController.current?.abort();
        setSessionState('signingOut');
        logout(true, undefined, 'explicit');
    };

    return (
        <PublicPageLayoutWrapper hideFooter>
            <div className={styles.wrapper}>
                <div className={styles.illustrationContainer}>
                    <UnauthorizedIcon className={styles.illustration} />
                </div>
                <div className={styles.infoContainer}>
                    <h1 className={styles.title}>{t('errorPages.accessDenied.title')}</h1>
                    <div className={styles.description}>{t('errorPages.accessDenied.description')}</div>

                    <div className={styles.actions}>
                        <Button href={homeReady ? redirectPath : undefined} disabled={!homeReady} type="primary">
                            {t('toHomePage')}
                        </Button>
                        {/* The page sits outside the protected layout, so without this the
                            only way out of a 403 loop was to let the session expire. */}
                        <Button onClick={signOut}>{t('logout')}</Button>
                    </div>
                </div>
            </div>
        </PublicPageLayoutWrapper>
    );
};
