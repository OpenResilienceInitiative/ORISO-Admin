import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => {
    // react-i18next returns a hybrid: an array [t, i18n, ready] that also carries
    // t/i18n as properties, so both `const { t } =` and `const [t] =` work.
    const t = (key: string) => key;
    const i18n = { language: 'en' };
    const result: any = [t, i18n, true];
    result.t = t;
    result.i18n = i18n;
    result.ready = true;
    return { useTranslation: () => result };
});

vi.mock('../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({ data: { settings: {} }, isLoading: false }),
}));

vi.mock('../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate: vi.fn() }),
}));

vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: false } }),
}));

import { OtherFunctionsSettings } from './index';

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('OtherFunctionsSettings', () => {
    it('renders the shared advice-seeker username policy toggle', () => {
        render(<OtherFunctionsSettings tenantId="1" />);

        expect(
            screen.getByText('tenants.appSettings.otherFunctions.adviceSeekerUsernameEditing.title'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('tenants.appSettings.otherFunctions.adviceSeekerUsernameEditing.description'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('switch', {
                name: 'tenants.appSettings.otherFunctions.adviceSeekerUsernameEditing.title',
            }),
        ).toBeChecked();
    });

    it('renders the Team-Besprechung toggle bound to featureTeamDiscussionEnabled', () => {
        render(<OtherFunctionsSettings tenantId="1" />);

        expect(screen.getByText('tenants.appSettings.otherFunctions.teamDiscussion.title')).toBeInTheDocument();
        expect(screen.getByText('tenants.appSettings.otherFunctions.teamDiscussion.description')).toBeInTheDocument();
    });
});
