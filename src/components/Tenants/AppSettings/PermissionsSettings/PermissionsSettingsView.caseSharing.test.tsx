import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Frank 2026-11-18: long tiles fold up to an overview, as on the Legal page.
describe('folding conversation-type tiles', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('folds the Mailberatung tile to a header that still says what is set', async () => {
        await renderView({ caseSharing: { mode: 'caseHandover' } });
        const mail = within(screen.getByTestId('chat-type-card-oneOnOne'));
        const header = mail.getByRole('button', { name: /tenants\.permissions\.card\.oneOnOne\.title/ });

        expect(header).toHaveAttribute('aria-expanded', 'true');
        expect(header).toHaveTextContent('tenants.permissions.card.summary.on');
        expect(header).toHaveTextContent('tenants.permissions.caseSharing.summary.caseHandover');

        await userEvent.click(header);

        expect(header).toHaveAttribute('aria-expanded', 'false');
        expect(
            mail.getByRole('radiogroup', { hidden: true, name: 'tenants.permissions.caseSharing.title' }),
        ).not.toBeVisible();
    });

    it('says "off" in the header when the conversation type is switched off', async () => {
        await renderView({
            initialValues: { settings: { featureCallsEnabled: false } },
            permissionPolicies: { featureCallsEnabled: { value: false, mode: 'SUGGESTED' } },
        });
        const mail = within(screen.getByTestId('chat-type-card-oneOnOne'));

        expect(mail.getByRole('button', { name: /oneOnOne\.title/ })).toHaveTextContent(
            'tenants.permissions.card.summary.off',
        );
    });

    it('puts every topic of the tile in a section of its own', async () => {
        await renderView({ caseSharing: { mode: 'none' } });
        const mail = within(screen.getByTestId('chat-type-card-oneOnOne'));

        const sections = mail.getAllByRole('region').map((section) => section.getAttribute('aria-labelledby'));
        expect(sections.length).toBeGreaterThanOrEqual(4);
        expect(mail.getByRole('region', { name: 'tenants.permissions.card.configurableFeatures' })).toBeInTheDocument();
        expect(mail.getByRole('region', { name: 'tenants.permissions.caseSharing.title' })).toBeInTheDocument();
        expect(mail.getByRole('region', { name: 'tenants.permissions.directInvite.title' })).toBeInTheDocument();
    });
});

// Frank 2026-11-18, review round 2.
describe('page intro, account settings and conversation type names', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('explains the page and the purpose of every shown conversation type above the tiles', async () => {
        await renderView({ excludeCardKeys: ['liveChat'] });
        const intro = within(screen.getByTestId('permissions-intro'));

        expect(intro.getByText('tenants.permissions.intro.lead')).toBeInTheDocument();
        expect(intro.getByText('tenants.permissions.intro.purpose.oneOnOne')).toBeInTheDocument();
        expect(intro.queryByText('tenants.permissions.intro.purpose.liveChat')).toBeNull();
    });

    it('shows the account settings as a section of the Mailberatung tile, not as a tile', async () => {
        await renderView();

        const mail = within(screen.getByTestId('chat-type-card-oneOnOne'));
        expect(mail.getByRole('region', { name: 'tenants.permissions.asker.title' })).toBeInTheDocument();
        expect(screen.getAllByTestId('asker-card')).toHaveLength(1);
    });

    it('keeps the account settings reachable when the Mailberatung tile is not shown', async () => {
        await renderView({ excludeCardKeys: ['oneOnOne'] });

        expect(screen.getByTestId('asker-card')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'tenants.permissions.asker.title' })).toBeNull();
    });

    it('shows a renamed conversation type and opens its name and icon from the tile icon', async () => {
        const onEdit = vi.fn();
        await renderView({ typeNames: { oneOnOne: 'Fragebogenberatung' }, onEditTypeAppearance: onEdit });
        const mail = within(screen.getByTestId('chat-type-card-oneOnOne'));

        expect(mail.getByRole('button', { name: /^Fragebogenberatung/ })).toBeInTheDocument();
        await userEvent.click(mail.getByRole('button', { name: 'tenants.permissions.card.editAppearance' }));

        expect(onEdit).toHaveBeenCalledWith('oneOnOne');
        // Renaming does not fold the tile.
        expect(mail.getByRole('button', { name: /^Fragebogenberatung/ })).toHaveAttribute('aria-expanded', 'true');
    });

    it('offers no rename where the level may not rename', async () => {
        await renderView();

        expect(screen.queryByRole('button', { name: 'tenants.permissions.card.editAppearance' })).toBeNull();
    });
});
