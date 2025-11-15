import { useCallback } from 'react';
import { useAppConfigContext } from '../context/useAppConfig';
import { ReleaseToggle } from '../enums/ReleaseToggle';

export const useReleasesToggle = () => {
    const { settings } = useAppConfigContext();

    const isEnabled = useCallback(
        (toggle: ReleaseToggle) => {
            return !!settings?.releaseToggles?.[toggle];
        },
        [settings?.releaseToggles],
    );

    return { isEnabled };
};
