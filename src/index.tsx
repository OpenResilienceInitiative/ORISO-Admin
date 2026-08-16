import 'react-app-polyfill/stable';
// React 19 removed ReactDOM.render/unmountComponentAtNode, which antd v5's static
// message/notification/Modal APIs rely on. Without this official patch those static
// calls silently no-op (toasts/alerts never appear). Must run before any antd usage.
import '@ant-design/v5-patch-for-react-19';
import { useEffect, useState, type JSX } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, message } from 'antd';
import { Locale } from 'antd/lib/locale';
import de_DE from 'antd/es/locale/de_DE';
import en_GB from 'antd/es/locale/en_GB';
import { App } from './App';
import routePathNames from './appConfig';
import { queryClient } from './constants/client';
import { Login } from './pages/Login/Login';
import { Error404 } from './pages/Error404';
import { ProtectedRoute } from './router/ProtectedRoute';
import i18n from './i18n';
import { Imprint } from './pages/Imprint';
import { Privacy } from './pages/Privacy';
import { AdminEmpty } from './components/AdminEmpty';
import { useAppConfigContext, UseAppConfigProvider } from './context/useAppConfig';
import { apiServerSettings } from './api/settings/apiServerSettings';
import { Initialization } from './components/Layout/Initialization';
import { AccessDenied } from './pages/ErrorPages/AccessDenied';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DEFAULT_LANGUAGE, normalizeLanguage } from './utils/language';
import { buildAdminAntdTheme } from './theme/antdM3Theme';
import { initObservability } from './observability/initObservability';
import { PasswordResetRequestPage } from './pages/PasswordReset/PasswordResetRequestPage';
import { PasswordResetConfirmPage } from './pages/PasswordReset/PasswordResetConfirmPage';
import { TenantAdminOnboardingPage } from './pages/TenantOnboarding/TenantAdminOnboardingPage';
import { CounsellorOnboardingPage } from './pages/CounsellorOnboarding/CounsellorOnboardingPage';

// OBS-P8 (ORISO-Helm#62): start Real User Monitoring (Core Web Vitals) export
// to SigNoz as early as possible, before the app renders.
initObservability();

interface LangMap {
    [key: string]: Locale;
}

const myLanguages: LangMap = {
    de: de_DE,
    en: en_GB,
};

declare global {
    interface Window {
        orisoAdminRoot?: Root;
    }
}

/**
 * ant design message config
 * @see {@link https://ant.design/components/message/#API}
 */
message.config({
    duration: 3,
    maxCount: 3,
    top: 100,
});

const AppSettingsWrapper = ({ children }: { children: JSX.Element }): JSX.Element => {
    const [loaded, setLoaded] = useState(false);

    const { settings, setServerSettings } = useAppConfigContext();
    useEffect(() => {
        if (settings.useApiClusterSettings) {
            apiServerSettings()
                .then(setServerSettings)
                .finally(() => setLoaded(true));
        } else {
            setLoaded(true);
        }
    }, []);

    return loaded ? children : <Initialization />;
};

const LanguageAwareConfigProvider = ({ children }: { children: JSX.Element }) => {
    const [language, setLanguage] = useState(() => normalizeLanguage(i18n.language) || DEFAULT_LANGUAGE);

    useEffect(() => {
        const handleLanguageChanged = (nextLanguage: string) => {
            setLanguage(normalizeLanguage(nextLanguage) || DEFAULT_LANGUAGE);
        };

        i18n.on('languageChanged', handleLanguageChanged);
        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, []);

    // One empty state for the whole admin: antd asks for it once here, so every
    // table, list and select that runs out of data shows the ORISO graphic
    // instead of antd's stock tray drawing.
    return (
        <ConfigProvider locale={myLanguages[language]} theme={buildAdminAntdTheme()} renderEmpty={() => <AdminEmpty />}>
            {children}
        </ConfigProvider>
    );
};

const container = document.getElementById('root');
if (!container) {
    throw new Error('Application root element not found');
}

const root = window.orisoAdminRoot ?? createRoot(container);
window.orisoAdminRoot = root;
root.render(
    <ErrorBoundary scope="app">
        <QueryClientProvider client={queryClient}>
            <UseAppConfigProvider>
                <AppSettingsWrapper>
                    <LanguageAwareConfigProvider>
                        <Router>
                            <Routes>
                                <Route path={routePathNames.login} element={<Login />} />
                                <Route path={routePathNames.passwordReset} element={<PasswordResetRequestPage />} />
                                <Route
                                    path={routePathNames.passwordResetConfirm}
                                    element={<PasswordResetConfirmPage />}
                                />
                                {/* Public tenant-admin onboarding (TEN-INV U8, #571): reached
                                    from the emailed invite link {base}/{rawToken}. */}
                                <Route
                                    path={`${routePathNames.tenantOnboarding}/:token`}
                                    element={<TenantAdminOnboardingPage />}
                                />
                                <Route path={routePathNames.tenantOnboarding} element={<TenantAdminOnboardingPage />} />
                                {/* Public counsellor onboarding wizard (#997): reached from the
                                    emailed counsellor invite link {base}/{rawToken}. */}
                                <Route
                                    path={`${routePathNames.counsellorOnboarding}/:token`}
                                    element={<CounsellorOnboardingPage />}
                                />
                                <Route
                                    path={routePathNames.counsellorOnboarding}
                                    element={<CounsellorOnboardingPage />}
                                />
                                <Route path="/admin/404" element={<Error404 />} />
                                <Route path="/admin/access-denied" element={<AccessDenied />} />

                                <Route path={routePathNames.imprint} element={<Imprint />} />
                                <Route path={routePathNames.privacy} element={<Privacy />} />

                                {/* put protected routes at the end to act as a wildcard route fetcher */}
                                <Route
                                    path="*"
                                    element={
                                        <ProtectedRoute>
                                            <App />
                                        </ProtectedRoute>
                                    }
                                />
                            </Routes>
                        </Router>
                    </LanguageAwareConfigProvider>
                </AppSettingsWrapper>
            </UseAppConfigProvider>
        </QueryClientProvider>
    </ErrorBoundary>, // Contextprovider does not work at the moment as they have an error there
);
