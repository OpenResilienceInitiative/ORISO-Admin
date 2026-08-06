import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionsSettingsView } from './PermissionsSettingsView';

// CardDeck measures/scrolls on mount; jsdom has no scrollTo (mirrors CardDeck's own test).
beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

// Identity t + a trivial Trans so labels are the raw i18n keys.
vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return {
        useTranslation: () => Object.assign([t, { language: 'de' }, true], { t, i18n: { language: 'de' } }),
        Trans: ({ i18nKey }: { i18nKey?: string }) => i18nKey ?? null,
        initReactI18next: { type: '3rdParty', init: () => undefined },
    };
});

// The Case-handover card has its own data hooks; render it inert to isolate the generic cards.
vi.mock('./CaseHandoverCard', () => ({ CaseHandoverCard: () => null }));

// vitest has no svgr plugin — stub the card icons.
vi.mock('../../../../resources/img/svg/permissions/one_on_one.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../resources/img/svg/permissions/live_chat.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../resources/img/svg/permissions/group.svg', () => ({ ReactComponent: () => null }));
vi.mock('../../../../resources/img/svg/permissions/group_internal.svg', () => ({ ReactComponent: () => null }));

const MASTER = ['settings', 'featureCallsEnabled'];
const VIDEO = ['settings', 'featureVideoCallsOneOnOneChatsEnabled'];

/**
 * Data-parity contract for the generic chat-type cards. Renders ONLY the 1-on-1
 * card and pins that the Form.Item-bound CheckToggles read from `initialValues`
 * and write the exact `settings.<key>` path via onToggleUpdate. Must stay green
 * across the `.chatTypeCard` → <Card> shell swap.
 */
const renderOneOnOne = (initialSettings: Record<string, boolean>, onToggleUpdate = vi.fn()) => {
    render(
        <PermissionsSettingsView
            tenantId="t1"
            excludeCardKeys={['liveChat', 'group', 'groupInternal']}
            isLoading={false}
            initialValues={{ settings: initialSettings }}
            formStateKey="k1"
            restrictedFields={new Set()}
            onToggleUpdate={onToggleUpdate}
            onSave={vi.fn()}
        />,
    );
    return { onToggleUpdate };
};

describe('PermissionsSettingsView data parity (1-on-1 card)', () => {
    it('reads: master + child toggles reflect initialValues', () => {
        renderOneOnOne({ featureCallsEnabled: true, featureVideoCallsOneOnOneChatsEnabled: false });

        expect(screen.getByRole('switch', { name: 'tenants.permissions.card.activated' })).toBeChecked();
        expect(screen.getByRole('switch', { name: 'tenants.permissions.feature.videoCalls' })).not.toBeChecked();
    });

    it('writes: toggling the master emits the exact settings path + new value', async () => {
        const user = userEvent.setup();
        const { onToggleUpdate } = renderOneOnOne({ featureCallsEnabled: true });

        await user.click(screen.getByRole('switch', { name: 'tenants.permissions.card.activated' }));

        expect(onToggleUpdate).toHaveBeenCalledWith(
            MASTER,
            false,
            expect.objectContaining({ settings: expect.objectContaining({ featureCallsEnabled: false }) }),
        );
    });

    it('writes: toggling a child emits its own settings path', async () => {
        const user = userEvent.setup();
        const { onToggleUpdate } = renderOneOnOne({
            featureCallsEnabled: true,
            featureVideoCallsOneOnOneChatsEnabled: false,
        });

        await user.click(screen.getByRole('switch', { name: 'tenants.permissions.feature.videoCalls' }));

        expect(onToggleUpdate).toHaveBeenCalledWith(
            VIDEO,
            true,
            expect.objectContaining({
                settings: expect.objectContaining({ featureVideoCallsOneOnOneChatsEnabled: true }),
            }),
        );
    });

    it('keeps child features visible but disabled until the platform card master is enabled', async () => {
        const user = userEvent.setup();
        renderOneOnOne({ featureCallsEnabled: false, featureVideoCallsOneOnOneChatsEnabled: true });

        const videoCalls = screen.getByRole('switch', { name: 'tenants.permissions.feature.videoCalls' });
        expect(videoCalls).toBeDisabled();

        await user.click(screen.getByRole('switch', { name: 'tenants.permissions.card.activated' }));

        expect(videoCalls).toBeEnabled();
    });
});
