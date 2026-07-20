import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, screen } from '@testing-library/react';
import { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../../i18n';

const render = (ui: ReactElement) =>
    rtlRender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {ui}
        </QueryClientProvider>,
    );

const mocks = vi.hoisted(() => ({
    useAgencyData: vi.fn(),
    mutate: vi.fn(),
}));

vi.mock('../../../../hooks/useAgencyData', () => ({ useAgencyData: mocks.useAgencyData }));
vi.mock('../../../../hooks/useAgencyUpdate', () => ({
    useAgencyUpdate: () => ({ mutate: mocks.mutate }),
}));

import { AgencyPermissionsSettings } from './AgencyPermissionsSettings';

const agency = (settings: Record<string, unknown>) => ({
    data: { id: '55', name: 'Beratungsstelle Nord', tenantId: 2, settings },
    isLoading: false,
});

describe('AgencyPermissionsSettings', () => {
    beforeEach(() => {
        mocks.useAgencyData.mockReset();
        mocks.mutate.mockReset();
    });

    it('renders the chat-type cards with the agency settings as initial values', async () => {
        mocks.useAgencyData.mockReturnValue(agency({ featureAnonymousChatEnabled: false }));
        render(<AgencyPermissionsSettings agencyId="55" />);

        const masters = await screen.findAllByRole('switch');
        expect(masters.length).toBeGreaterThan(0);
        // liveChat master mirrors featureAnonymousChatEnabled=false
        const off = masters.filter((s) => s.getAttribute('aria-checked') === 'false');
        expect(off.length).toBeGreaterThan(0);
    });

    it('disables platform-forced-off fields instead of hiding them', async () => {
        mocks.useAgencyData.mockReturnValue(
            agency({
                agencyAdminControls: { allowedPermissionToggles: { videoCalls: false } },
            }),
        );
        render(<AgencyPermissionsSettings agencyId="55" />);

        const switches = await screen.findAllByRole('switch');
        const disabled = switches.filter(
            (s) => s.hasAttribute('disabled') || s.getAttribute('aria-disabled') === 'true',
        );
        // videoCalls forced off: the 4 rendered chat-type variants (the family master
        // featureVideoCallsEnabled is not a card switch) are disabled but still visible
        expect(disabled.length).toBeGreaterThanOrEqual(4);
    });

    it('applies platform constraints to the payload when a toggle is switched', async () => {
        mocks.useAgencyData.mockReturnValue(
            agency({
                featureThreadsEnabled: true,
                agencyAdminControls: { allowedPermissionToggles: { videoCalls: false } },
            }),
        );
        render(<AgencyPermissionsSettings agencyId="55" />);

        const user = userEvent.setup();
        const editButtons = await screen.findAllByRole('button', { name: /edit|bearbeiten/i });
        await user.click(editButtons[0]);

        const enabledSwitch = (await screen.findAllByRole('switch')).find(
            (s) => !s.hasAttribute('disabled') && s.getAttribute('aria-checked') === 'true',
        );
        expect(enabledSwitch).toBeDefined();
        await user.click(enabledSwitch);

        expect(mocks.mutate).toHaveBeenCalledTimes(1);
        const payload = mocks.mutate.mock.calls[0][0] as { settings: Record<string, unknown> };
        // forced-off constraint re-applied on every save
        expect(payload.settings.featureVideoCallsEnabled).toBe(false);
        expect(payload.settings.featureVideoCallsOneOnOneChatsEnabled).toBe(false);
        // the platform singleton is never part of the agency payload
        expect(payload.settings.agencyAdminControls).toBeUndefined();
    });

    it('treats enforced-on fields as locked on', async () => {
        mocks.useAgencyData.mockReturnValue(
            agency({
                featureVoiceMessagesEnabled: false,
                agencyAdminControls: { enforcedPermissionToggles: { voiceMessages: true } },
            }),
        );
        render(<AgencyPermissionsSettings agencyId="55" />);

        const switches = await screen.findAllByRole('switch');
        // enforced-on: value shows true (overriding the stored false) and control is disabled
        const lockedOn = switches.filter(
            (s) =>
                (s.hasAttribute('disabled') || s.getAttribute('aria-disabled') === 'true') &&
                s.getAttribute('aria-checked') === 'true',
        );
        expect(lockedOn.length).toBeGreaterThanOrEqual(4);
    });
});
