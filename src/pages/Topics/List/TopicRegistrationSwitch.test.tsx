import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { TopicRegistrationSwitch } from './TopicRegistrationSwitch';

const toggleFeature = vi.fn();
let hookOptions: { onSuccess?: () => void } = {};

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: false } }),
}));
vi.mock('../../../context/FeatureContext', () => ({
    useFeatureContext: () => ({ isEnabled: () => true, toggleFeature }),
}));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 1 } }) }));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ hasRole: () => true }) }));
vi.mock('../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: (options: { onSuccess?: () => void }) => {
        hookOptions = options;
        return { mutate: vi.fn(), isPending: false };
    },
}));

describe('TopicRegistrationSwitch', () => {
    beforeEach(() => {
        toggleFeature.mockClear();
        hookOptions = {};
    });

    it('applies a saved switch to the feature context even after the card is gone', () => {
        const { unmount } = render(<TopicRegistrationSwitch />);
        expect(screen.getByRole('switch')).toBeInTheDocument();

        unmount();
        hookOptions.onSuccess?.();

        expect(toggleFeature).toHaveBeenCalledWith(FeatureFlag.TopicsInRegistration);
    });
});
