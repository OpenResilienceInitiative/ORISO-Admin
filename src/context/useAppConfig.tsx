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

const UseAppConfigProvider = ({
    children,
}: {
    children?: React.ReactElement<any> | number | string | (React.ReactElement<any> | number | string)[];
}) => {
    const state = React.useState<AppConfigInterface>({
        useApiClusterSettings: clusterFeatureFlags.useApiClusterSettings,
    });
    return <UseAppConfigContext.Provider value={state}>{children}</UseAppConfigContext.Provider>;
};

const useAppConfigContext = (): AppConfigContextInterface => {
    // Degrade, don't throw: outside a provider (e.g. isolated Storybook/tests) fall back to the
    // same cluster defaults the provider seeds with, plus no-op setters, instead of crashing on a
    // null-context destructure.
    const context = React.useContext(UseAppConfigContext);
    const [settings, setNewSettings] = context ?? [
        { useApiClusterSettings: clusterFeatureFlags.useApiClusterSettings } as AppConfigInterface,
        (() => undefined) as React.Dispatch<React.SetStateAction<AppConfigInterface>>,
    ];

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
