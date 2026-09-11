import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// CardDeck measures/scrolls on mount; jsdom has no scrollTo.
beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

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

const mediaAiScanAvailable = vi.fn<() => boolean>();
vi.mock('../../../../config/runtimeConfig', () => ({
    get runtimeConfig() {
        return { mediaAiScanAvailable: mediaAiScanAvailable() };
    },
    keycloakAuthPath: () => '',
}));

const renderOneOnOne = async () => {
    const { PermissionsSettingsView } = await import('./PermissionsSettingsView');
    render(
        <PermissionsSettingsView
            tenantId="t1"
            excludeCardKeys={['liveChat', 'group', 'groupInternal']}
            isLoading={false}
            initialValues={{ settings: { featureCallsEnabled: true } }}
            formStateKey="k1"
            restrictedFields={new Set()}
            onToggleUpdate={vi.fn()}
        />,
    );
};

const labelsByField: Record<string, string> = {
    featureMediaAiScanOneOnOneChatsEnabled: 'tenants.permissions.feature.mediaAiScan',
    featureMediaUploadOneOnOneChatsEnabled: 'tenants.permissions.feature.mediaUpload',
    featureMediaInlineDisplayOneOnOneChatsEnabled: 'tenants.permissions.feature.mediaInlineDisplay',
};

const policyButton = (field: string) => {
    const control = document.querySelector(`[data-feature-policy="${field}"]`) as HTMLElement;
    return within(control).getByRole('button', { name: new RegExp(labelsByField[field]) });
};

const aiScanControl = () => policyButton('featureMediaAiScanOneOnOneChatsEnabled');

/**
 * ORISO-Admin#734. The AI media check is switchable in this panel but does
 * nothing until a content scanner is deployed and its zero-retention
 * sub-processor agreement is on record. A switch that looks live while nothing
 * scans misleads QA and the client, so it is disabled with a reason —
 * disabled, never hidden.
 */
describe('AI media check availability gate', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('is disabled while no AI scan is available', async () => {
        mediaAiScanAvailable.mockReturnValue(false);

        await renderOneOnOne();

        expect(aiScanControl()).toBeDisabled();
    });

    it('says why, rather than looking arbitrarily broken', async () => {
        mediaAiScanAvailable.mockReturnValue(false);

        await renderOneOnOne();

        expect(screen.getByText('tenants.permissions.feature.mediaAiScanUnavailable')).toBeInTheDocument();
    });

    it('stays visible so the capability is not hidden from the client', async () => {
        mediaAiScanAvailable.mockReturnValue(false);

        await renderOneOnOne();

        expect(aiScanControl()).toBeInTheDocument();
    });

    it('leaves the sibling media toggles alone', async () => {
        mediaAiScanAvailable.mockReturnValue(false);

        await renderOneOnOne();

        expect(policyButton('featureMediaUploadOneOnOneChatsEnabled')).toBeEnabled();
        expect(policyButton('featureMediaInlineDisplayOneOnOneChatsEnabled')).toBeEnabled();
    });

    it('becomes switchable once the environment declares the AI scan available', async () => {
        mediaAiScanAvailable.mockReturnValue(true);

        await renderOneOnOne();

        expect(aiScanControl()).toBeEnabled();
        expect(screen.queryByText('tenants.permissions.feature.mediaAiScanUnavailable')).not.toBeInTheDocument();
    });
});
