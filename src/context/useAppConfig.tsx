import React, { useCallback } from 'react';
import { clusterFeatureFlags } from '../appConfig';
import { AppConfigInterface } from '../types/AppConfigInterface';
import { ServerAppConfigInterface } from '../types/ServerAppConfigInterface';

interface AppConfigContextInterface {
    settings: AppConfigInterface;
    setServerSettings: (settings: ServerAppConfigInterface) => void;
    setManualSettings: (settings: Partial<AppConfigInterface>) => void;
}

const UseAppConfigContext =
    React.createContext<[AppConfigInterface, React.Dispatch<React.SetStateAction<AppConfigInterface>>]>(null);

const UseAppConfigProvider = ({ children }: { children?: React.ReactChild | React.ReactChild[] }) => {
    const state = React.useState<AppConfigInterface>({
        useApiClusterSettings: clusterFeatureFlags.useApiClusterSettings,
    });
    return <UseAppConfigContext.Provider value={state}>{children}</UseAppConfigContext.Provider>;
};

const useAppConfigContext = (): AppConfigContextInterface => {
    const [settings, setNewSettings] = React.useContext(UseAppConfigContext);

    const setServerSettings = useCallback(
        (serverSettings: ServerAppConfigInterface) => {
            const finalServerSettings = Object.keys(serverSettings).reduce(
                (current, key) => ({
                    ...current,
                    [key]: serverSettings[key]?.value,
                }),
                {} as Record<string, boolean>,
            );
            setNewSettings((currentSettings) => ({
                ...currentSettings,
                ...(finalServerSettings as unknown as AppConfigInterface),
                releaseToggles: serverSettings.releaseToggles,
                serverSettingsMeta: serverSettings,
            }));
        },
        [setNewSettings],
    );

    const setManualSettings = useCallback(
        (newSettings: Partial<AppConfigInterface>) => {
            setNewSettings((currentSettings) => ({ ...currentSettings, ...newSettings }));
        },
        [setNewSettings],
    );

    return {
        setServerSettings,
        settings,
        setManualSettings,
    };
};

export { UseAppConfigProvider, useAppConfigContext };
