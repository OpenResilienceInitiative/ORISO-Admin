import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { PermissionsSettingsViewProps } from './PermissionsSettingsView';

vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return {
        useTranslation: () => Object.assign([t, { language: 'de' }, true], { t, i18n: { language: 'de' } }),
        Trans: ({ i18nKey }: { i18nKey?: string }) => i18nKey ?? null,
        initReactI18next: { type: '3rdParty', init: () => undefined },
    };
});
vi.mock('./CaseHandoverCard', () => ({
    CaseHandoverCard: ({ embedded }: { embedded?: boolean }) => (
        <div data-testid={embedded ? 'case-handover-settings' : 'case-handover-card'} />
    ),
}));
vi.mock('./AskerPermissionsCard', () => ({ AskerPermissionsCard: () => <div data-testid="asker-card" /> }));
vi.mock('../../../../resources/img/svg/permissions/one_on_one.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../resources/img/svg/permissions/live_chat.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../resources/img/svg/permissions/group.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../resources/img/svg/permissions/group_internal.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../config/runtimeConfig', () => ({
    get runtimeConfig() {
        return { mediaAiScanAvailable: false };
    },
    keycloakAuthPath: () => '',
}));

const renderView = async (props: Partial<PermissionsSettingsViewProps> = {}) => {
    const { PermissionsSettingsView } = await import('./PermissionsSettingsView');
    render(
        <PermissionsSettingsView
            tenantId="t1"
            isLoading={false}
            initialValues={{ settings: { featureCallsEnabled: true, featureGroupChatV2Enabled: true } }}
            formStateKey="k1"
            restrictedFields={new Set()}
            onToggleUpdate={vi.fn()}
            {...props}
        />,
    );
};

// ORISO-Admin#1558: case handover and team counselling become one choice on the Mailberatung tile.
describe('case sharing on the Mailberatung tile', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('keeps the separate handover tile while the choice is not wired', async () => {
        await renderView();

        expect(screen.getByTestId('case-handover-card')).toBeInTheDocument();
        expect(screen.queryByRole('radiogroup', { name: 'tenants.permissions.caseSharing.title' })).toBeNull();
    });

    it('replaces the separate handover tile with a choice on the Mailberatung tile', async () => {
        await renderView({ caseSharing: { mode: 'caseHandover' } });

        expect(screen.queryByTestId('case-handover-card')).not.toBeInTheDocument();
        const mail = within(screen.getByTestId('chat-type-card-oneOnOne'));
        expect(mail.getByRole('radiogroup', { name: 'tenants.permissions.caseSharing.title' })).toBeInTheDocument();
        expect(mail.getByTestId('case-handover-settings')).toBeInTheDocument();
    });

    it('hides the handover settings when another option is chosen', async () => {
        await renderView({ caseSharing: { mode: 'teamCounselling' } });

        expect(screen.queryByTestId('case-handover-settings')).not.toBeInTheDocument();
    });

    it.each(['liveChat', 'group', 'groupInternal'])('offers no case sharing on the %s tile', async (key) => {
        await renderView({ caseSharing: { mode: 'caseHandover' } });

        const tile = within(screen.getByTestId(`chat-type-card-${key}`));
        expect(tile.queryByRole('radiogroup', { name: 'tenants.permissions.caseSharing.title' })).toBeNull();
    });

    // Nothing may become unreachable: the account-wide asker switches have no other home yet.
    it('keeps the asker account tile', async () => {
        await renderView({ caseSharing: { mode: 'none' } });

        expect(screen.getByTestId('asker-card')).toBeInTheDocument();
    });
});
