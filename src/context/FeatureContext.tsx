import { createContext, ReactNode, useState, useContext, useCallback } from 'react';
import { featureFlags } from '../appConfig';
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
            name: FeatureFlag.ConsultingTypesForAgencies,
            active: !!featureFlags.useConsultingTypesForAgencies,
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
    const [features, setFeatures] = useContext(FeatureContext);

    const isEnabled = useCallback(
        (name: FeatureFlag) => {
            const tempFeature = features.find((feature) => feature.name === name);

            return tempFeature?.active || false;
        },
        [features],
    );

    const toggleFeature = (key: FeatureFlag) => {
        const feature = features.find((f) => f.name === key);

        feature.active = !feature.active;

        setFeatures([...features]);
    };

    return {
        isEnabled,
        toggleFeature,
    };
}

export { FeatureProvider, useFeatureContext };
