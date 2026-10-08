import '@ant-design/v5-patch-for-react-19';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const oneTopicSwitch = () => screen.getByRole('switch', { name: /genau einen Fachbereich/ });
// Every card sits in its own <section>; the login card next to it has its own edit button.
const oneTopicCard = () => within(oneTopicSwitch().closest('section') as HTMLElement);

describe('GlobalLoginSettingsPage one-topic-per-agency switch access', () => {
    beforeEach(async () => {
        await i18n.changeLanguage('de');
    });

    it('lets a platform admin edit the platform-wide switch', async () => {
        state.isSuperAdmin = true;
        showPage();

        expect(screen.getByText('Fachbereiche')).toBeVisible();
        await userEvent.click(oneTopicCard().getByRole('button', { name: 'Bearbeiten' }));
        expect(oneTopicSwitch()).toBeEnabled();
        expect(oneTopicCard().getByRole('button', { name: 'Speichern' })).toBeVisible();
    });

    /** ORISO rule: superadmin-only settings stay visible for everyone, they just cannot be edited. */
    it('shows the switch to other admins, disabled and without edit or save', () => {
        state.isSuperAdmin = false;
        showPage();

        expect(screen.getByText('Fachbereiche')).toBeVisible();
        expect(oneTopicSwitch()).toBeDisabled();
        expect(oneTopicCard().queryByRole('button', { name: 'Bearbeiten' })).not.toBeInTheDocument();
        expect(oneTopicCard().queryByRole('button', { name: 'Speichern' })).not.toBeInTheDocument();
    });
});
