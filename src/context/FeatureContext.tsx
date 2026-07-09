import { createContext, ReactNode, useState, useContext, useCallback } from 'react';
import { FeatureFlag } from '../enums/FeatureFlag';
import { IFeature } from '../types/feature';
import { TenantData } from '../types/tenant';

const FeatureContext = createContext<[IFeature[], (features: IFeature[]) => void]>(null);

interface FeatureProviderProps {
    children: ReactNode;
    tenantData: TenantData;
    publicTenantData: TenantData;
}

const FeatureProvider = ({ children, tenantData, publicTenantData }: FeatureProviderProps) => {
    // Add safety check for undefined data with permissive typing to avoid TS errors on optional fields
    const safeTenantData = (tenantData || {}) as any;
    const safePublicTenantData = (publicTenantData || {}) as any;

    const state = useState<IFeature[]>([
        {
            name: FeatureFlag.Appointments,
            active: !!safeTenantData?.settings?.featureAppointmentsEnabled,
        },
        {
            name: FeatureFlag.Developer,
            active: false,
        },
        {
            name: FeatureFlag.Demographics,
            active: !!safeTenantData?.settings?.featureDemographicsEnabled,
        },
        {
            name: FeatureFlag.Topics,
            active:
                !!safePublicTenantData?.settings?.featureTopicsEnabled ||
                !!safeTenantData?.settings?.featureTopicsEnabled,
        },
        {
            name: FeatureFlag.TopicsInRegistration,
            active: !!safeTenantData?.settings?.topicsInRegistrationEnabled,
        },
        {
            name: FeatureFlag.GroupChatV2,
            active: !!safePublicTenantData?.settings?.featureGroupChatV2Enabled,
        },
        {
            name: FeatureFlag.CentralDataProtectionTemplate,
            active: !!safePublicTenantData?.settings?.featureCentralDataProtectionTemplateEnabled,
        },
    ]);

    return <FeatureContext.Provider value={state}>{children}</FeatureContext.Provider>;
};

function useFeatureContext() {
    const contextValue = useContext(FeatureContext);

    if (!contextValue) {
        // eslint-disable-next-line no-console
        console.error('useFeatureContext used outside of FeatureProvider; all feature flags read as disabled.');
    }

    // Degrade to "all flags off" instead of crashing the tree when the
    // provider is missing (e.g. on public pages).
    const [features, setFeatures] = contextValue ?? [[] as IFeature[], () => undefined];

    const isEnabled = useCallback(
        (name: FeatureFlag) => {
            const tempFeature = features.find((feature) => feature.name === name);

            return tempFeature?.active || false;
        },
        [features],
    );

    const toggleFeature = (key: FeatureFlag) => {
        if (!features.some((f) => f.name === key)) {
            return;
        }

        setFeatures(features.map((f) => (f.name === key ? { ...f, active: !f.active } : f)));
    };

    return {
        isEnabled,
        toggleFeature,
    };
}

export { FeatureProvider, useFeatureContext };
