import { FeatureFlag } from '../enums/FeatureFlag';

export interface IFeature {
    name: FeatureFlag;
    active: boolean;
}

export type FeatureContextType = {
    features: IFeature[];
    getFeatureStatus: (name: FeatureFlag) => boolean;
    toggleFeature: (feature: IFeature) => void;
};
