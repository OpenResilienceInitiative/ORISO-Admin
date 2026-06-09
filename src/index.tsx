import 'react-app-polyfill/stable';
import { useEffect, useState } from 'react';
import { QueryClientProvider } from 'react-query';
import { render } from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, message } from 'antd';
import { Locale } from 'antd/lib/locale-provider';
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
import { useAppConfigContext, UseAppConfigProvider } from './context/useAppConfig';
import { apiServerSettings } from './api/settings/apiServerSettings';
import { Initialization } from './components/Layout/Initialization';
import { AccessDenied } from './pages/ErrorPages/AccessDenied';
import { DEFAULT_LANGUAGE, normalizeLanguage } from './utils/language';

interface LangMap {
    [key: string]: Locale;
}

const myLanguages: LangMap = {
    de: de_DE,
    en: en_GB,
};

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

    return <ConfigProvider locale={myLanguages[language]}>{children}</ConfigProvider>;
};

render(
    <QueryClientProvider client={queryClient}>
        <UseAppConfigProvider>
            <AppSettingsWrapper>
                <LanguageAwareConfigProvider>
                    <Router>
                        <Routes>
                            <Route path={routePathNames.login} element={<Login />} />
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
    </QueryClientProvider>, // Contextprovider does not work at the moment as they have an error there
    document.getElementById('root'),
);
