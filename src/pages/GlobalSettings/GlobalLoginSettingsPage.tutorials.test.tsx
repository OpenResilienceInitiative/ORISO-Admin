import '@ant-design/v5-patch-for-react-19';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { GlobalLoginSettingsPage } from '.';

vi.mock('../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ isSuperAdmin: true }) }));
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
    AccountInactivitySettingsCardContainer: () => <div />,
}));
vi.mock('../../components/GlobalSettings/OneTopicPerAgencySettingsCard', () => ({
    OneTopicPerAgencySettingsCardContainer: () => <div data-testid="topics-card" />,
}));
vi.mock('../../components/GlobalSettings/ChatRecoverySettingsCard', () => ({
    ChatRecoverySettingsCard: () => <div />,
}));

beforeEach(async () => i18n.changeLanguage('de'));

it('places the tutorial preview after topics and before translation settings', () => {
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <GlobalLoginSettingsPage />
        </QueryClientProvider>,
    );
    const heading = screen.getByRole('heading', { name: 'Tutorials für Berater' });
    expect(screen.getByTestId('topics-card').compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(heading.compareDocumentPosition(screen.getByTestId('translation-card'))).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText('Kommt bald')).toBeVisible();
    expect(screen.getAllByRole('switch')).toHaveLength(5);
});
