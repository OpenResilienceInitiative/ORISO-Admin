import React, { useCallback } from 'react';
import { clusterFeatureFlags, featureFlags } from '../appConfig';
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
        useConsultingTypesForAgencies: featureFlags.useConsultingTypesForAgencies,
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
            setNewSettings({
                ...settings,
                ...(finalServerSettings as unknown as AppConfigInterface),
                releaseToggles: serverSettings.releaseToggles,
            });
        },
        [setNewSettings, settings],
    );

    const setManualSettings = useCallback(
        (newSettings: Partial<AppConfigInterface>) => {
            setNewSettings({ ...settings, ...newSettings });
        },
        [settings, setNewSettings],
    );

    return {
        setServerSettings,
        settings,
        setManualSettings,
    };
};

export { UseAppConfigProvider, useAppConfigContext };
