import { render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { GlobalLoginSettingsPage } from '.';
import { setSessionTokens, clearSessionTokens } from '../../api/auth/tokenSessionStore';

let inactivityReads = 0;
const server = setupServer(
    http.get('*/controls/account-inactivity', () => {
        inactivityReads += 1;
        return HttpResponse.json({ askerMonths: 24, consultantMonths: 24, otherMonths: 24, revision: 0 });
    }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    clearSessionTokens();
});
const showPage = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <GlobalLoginSettingsPage />
        </QueryClientProvider>,
    );

const state = vi.hoisted(() => ({ isSuperAdmin: true, useChatRecoverySettings: vi.fn() }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ isSuperAdmin: state.isSuperAdmin }) }));
vi.mock('../../hooks/useChatRecoverySettings.hook', () => ({
    useChatRecoverySettings: state.useChatRecoverySettings,
}));
vi.mock('../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: undefined, isLoading: false }) }));
vi.mock('../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../components/CardEditable', () => ({ CardEditable: () => <div data-testid="login-card" /> }));
vi.mock('../../components/GlobalSettings/TranslationApiKeysCardContainer', () => ({
    TranslationApiKeysCardContainer: () => <div data-testid="translation-card" />,
}));
vi.mock('../../components/GlobalSettings/DocumentMasterDataCardContainer', () => ({
    DocumentMasterDataCardContainer: () => <div data-testid="document-card" />,
}));
vi.mock('../../components/GlobalSettings/ChatRecoverySettingsCard', () => ({
    ChatRecoverySettingsCard: () => <div data-testid="chat-recovery-card" />,
}));

describe('GlobalLoginSettingsPage chat recovery access', () => {
    beforeEach(() => {
        state.isSuperAdmin = true;
        inactivityReads = 0;
        setSessionTokens('browser-contract-access-token', null);
        state.useChatRecoverySettings.mockReset();
        state.useChatRecoverySettings.mockReturnValue({
            data: undefined,
            isLoading: false,
            isSaving: false,
            error: null,
            save: vi.fn(),
        });
    });

    it('renders the recovery settings and enables its query for a platform admin', async () => {
        showPage();

        expect(state.useChatRecoverySettings).toHaveBeenCalledWith(true);
        expect(screen.getByTestId('chat-recovery-card')).toBeVisible();
        await waitFor(() => expect(inactivityReads).toBe(1));
    });

    it('hides the recovery settings and suppresses its query for other admins', () => {
        state.isSuperAdmin = false;
        showPage();

        expect(state.useChatRecoverySettings).toHaveBeenCalledWith(false);
        expect(screen.queryByTestId('chat-recovery-card')).not.toBeInTheDocument();
    });
});
