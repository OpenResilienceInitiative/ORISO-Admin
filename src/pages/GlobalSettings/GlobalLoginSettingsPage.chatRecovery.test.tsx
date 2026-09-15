import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalLoginSettingsPage } from '.';

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
        state.useChatRecoverySettings.mockReset();
        state.useChatRecoverySettings.mockReturnValue({
            data: undefined,
            isLoading: false,
            isSaving: false,
            error: null,
            save: vi.fn(),
        });
    });

    it('renders the recovery settings and enables its query for a platform admin', () => {
        render(<GlobalLoginSettingsPage />);

        expect(state.useChatRecoverySettings).toHaveBeenCalledWith(true);
        expect(screen.getByTestId('chat-recovery-card')).toBeVisible();
    });

    it('hides the recovery settings and suppresses its query for other admins', () => {
        state.isSuperAdmin = false;
        render(<GlobalLoginSettingsPage />);

        expect(state.useChatRecoverySettings).toHaveBeenCalledWith(false);
        expect(screen.queryByTestId('chat-recovery-card')).not.toBeInTheDocument();
    });
});
