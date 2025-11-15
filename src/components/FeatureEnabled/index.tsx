import { useAppConfigContext } from '../../context/useAppConfig';
import { ReleaseToggle } from '../../enums/ReleaseToggle';

interface FeatureFlagProps {
    children: JSX.Element;
    feature: ReleaseToggle;
}

export const FeatureEnabled = ({ children, feature }: FeatureFlagProps): JSX.Element => {
    const { settings } = useAppConfigContext();

    return settings?.releaseToggles?.[feature] ? children : null;
};
