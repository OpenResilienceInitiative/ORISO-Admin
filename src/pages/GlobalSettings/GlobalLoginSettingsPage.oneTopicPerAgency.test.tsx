import '@ant-design/v5-patch-for-react-19';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { GlobalLoginSettingsPage } from '.';

const state = vi.hoisted(() => ({ isSuperAdmin: true }));

vi.mock('../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ isSuperAdmin: state.isSuperAdmin }) }));
vi.mock('../../hooks/useChatRecoverySettings.hook', () => ({
    useChatRecoverySettings: () => ({ data: undefined, isLoading: false, isSaving: false, error: null, save: vi.fn() }),
}));
vi.mock('../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: undefined, isLoading: false }) }));
vi.mock('../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../components/GlobalSettings/TranslationApiKeysCardContainer', () => ({
    TranslationApiKeysCardContainer: () => <div data-testid="translation-card" />,
}));
vi.mock('../../components/GlobalSettings/DocumentMasterDataCardContainer', () => ({
    DocumentMasterDataCardContainer: () => <div data-testid="document-card" />,
}));
vi.mock('../../components/GlobalSettings/AccountInactivitySettingsCard', () => ({
    AccountInactivitySettingsCardContainer: () => <div data-testid="account-inactivity-card" />,
}));
vi.mock('../../components/GlobalSettings/ChatRecoverySettingsCard', () => ({
    ChatRecoverySettingsCard: () => <div data-testid="chat-recovery-card" />,
}));

const showPage = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <GlobalLoginSettingsPage />
        </QueryClientProvider>,
    );

const oneTopicSwitch = () => screen.queryByRole('switch', { name: /genau einen Fachbereich/ });

describe('GlobalLoginSettingsPage one-topic-per-agency switch access', () => {
    beforeEach(async () => {
        await i18n.changeLanguage('de');
    });

    it('offers the platform-wide switch to a platform admin', () => {
        state.isSuperAdmin = true;
        showPage();

        expect(oneTopicSwitch()).toBeInTheDocument();
        expect(screen.getByText('Fachbereiche')).toBeVisible();
    });

    it('does not offer the switch to other admins, like the other platform-only cards', () => {
        state.isSuperAdmin = false;
        showPage();

        expect(screen.getByTestId('translation-card')).toBeInTheDocument();
        expect(screen.queryByTestId('account-inactivity-card')).not.toBeInTheDocument();
        expect(oneTopicSwitch()).not.toBeInTheDocument();
        expect(screen.queryByText('Fachbereiche')).not.toBeInTheDocument();
    });
});
