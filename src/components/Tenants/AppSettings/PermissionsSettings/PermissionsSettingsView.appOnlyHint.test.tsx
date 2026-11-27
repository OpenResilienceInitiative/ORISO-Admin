import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatTypeCardKey } from './types';

vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return {
        useTranslation: () => Object.assign([t, { language: 'de' }, true], { t, i18n: { language: 'de' } }),
        Trans: ({ i18nKey }: { i18nKey?: string }) => i18nKey ?? null,
        initReactI18next: { type: '3rdParty', init: () => undefined },
    };
});
vi.mock('./CaseHandoverCard', () => ({ CaseHandoverCard: () => null }));
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

const HINT = 'tenants.permissions.feature.appOnlyHint';
const ALL_CARDS: ChatTypeCardKey[] = ['oneOnOne', 'liveChat', 'group', 'groupInternal'];

const renderOnly = async (card: ChatTypeCardKey) => {
    const { PermissionsSettingsView } = await import('./PermissionsSettingsView');
    render(
        <PermissionsSettingsView
            tenantId="t1"
            excludeCardKeys={ALL_CARDS.filter((key) => key !== card)}
            isLoading={false}
            initialValues={{
                settings: { featureCallsEnabled: true, featureGroupChatV2Enabled: true },
            }}
            formStateKey="k1"
            restrictedFields={new Set()}
            onToggleUpdate={vi.fn()}
        />,
    );
};

/**
 * ORISO-Helm#466. The app encrypts attachments and voice messages and uploads
 * them straight to the chat server, which cannot see the conversation or the
 * kind of file. So these two switches only hide the buttons in the app. The
 * tile must say so instead of implying a server-side block.
 */
describe('attachment and voice switches say they only hide the button', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it.each(['oneOnOne', 'liveChat', 'group'] as const)('says it once on the %s tile', async (card) => {
        await renderOnly(card);

        expect(screen.getAllByText(HINT)).toHaveLength(1);
    });

    it('does not show it on a tile without these switches', async () => {
        await renderOnly('groupInternal');

        expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    });
});

describe('which switches are app-only', () => {
    it('marks exactly the voice-message and media-upload switches', async () => {
        const { CHAT_TYPE_CARDS } = await import('./chatTypeCards');

        const toggles = CHAT_TYPE_CARDS.flatMap((card) => card.toggles);
        const appOnly = toggles.filter((toggle) => toggle.appOnly).map((toggle) => toggle.field[1]);
        const expected = toggles
            .map((toggle) => toggle.field[1])
            .filter((field) => /^feature(VoiceMessages|MediaUpload)/.test(field));

        expect(expected.length).toBeGreaterThan(0);
        expect(appOnly.sort()).toEqual(expected.sort());
    });
});
