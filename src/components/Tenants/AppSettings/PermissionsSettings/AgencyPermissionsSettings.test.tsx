import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, screen, within } from '@testing-library/react';
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

const mocks = vi.hoisted(() => ({ useAgencyData: vi.fn(), mutate: vi.fn() }));

vi.mock('../../../../hooks/useAgencyData', () => ({ useAgencyData: mocks.useAgencyData }));
vi.mock('../../../../hooks/useAgencyUpdate', () => ({
    useAgencyUpdate: () => ({ mutate: mocks.mutate }),
}));

import { AgencyPermissionsSettings } from './AgencyPermissionsSettings';

const agency = (settings: Record<string, unknown>) => ({
    data: { id: '55', name: 'Beratungsstelle Nord', tenantId: 2, settings },
    isLoading: false,
});

const policy = (field: string) => document.querySelector(`[data-feature-policy="${field}"]`) as HTMLElement;

describe('AgencyPermissionsSettings per-feature policies', () => {
    beforeEach(() => {
        mocks.useAgencyData.mockReset();
        mocks.mutate.mockReset();
    });

    it('derives an independent deactivate suggestion from the stored agency value', async () => {
        const user = userEvent.setup();
        mocks.useAgencyData.mockReturnValue(agency({ featureAnonymousChatEnabled: false }));
        render(<AgencyPermissionsSettings agencyId="55" />);

        const control = policy('featureAnonymousChatEnabled');
        await user.click(within(control).getByRole('button', { name: /Policy-Auswahl öffnen|Open policy choices/i }));
        expect(
            within(control).getByRole('button', { name: /Empfehlung: Deaktivierung|deactivation recommendation/i }),
        ).toHaveAttribute('aria-current', 'page');
    });

    it('keeps tenant-enforced-off features visible and opens information instead of an edit menu', async () => {
        const user = userEvent.setup();
        mocks.useAgencyData.mockReturnValue(
            agency({ agencyAdminControls: { allowedPermissionToggles: { videoCalls: false } } }),
        );
        render(<AgencyPermissionsSettings agencyId="55" />);

        const control = policy('featureVideoCallsOneOnOneChatsEnabled');
        await user.click(within(control).getByRole('button', { name: /Weitere Informationen|more information/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(
            within(control).queryByText(/Empfehlung: Aktivierung|activation recommendation/i),
        ).not.toBeInTheDocument();
    });

    it('saves an agency suggestion and reapplies tenant constraints to the payload', async () => {
        const user = userEvent.setup();
        mocks.useAgencyData.mockReturnValue(
            agency({
                featureThreadsOneOnOneEnabled: true,
                agencyAdminControls: { allowedPermissionToggles: { videoCalls: false } },
            }),
        );
        render(<AgencyPermissionsSettings agencyId="55" />);

        const control = policy('featureThreadsOneOnOneEnabled');
        await user.click(within(control).getByRole('button', { name: /Policy-Auswahl öffnen|Open policy choices/i }));
        await user.click(
            within(control).getByRole('button', { name: /Empfehlung: Deaktivierung|deactivation recommendation/i }),
        );

        expect(mocks.mutate).toHaveBeenCalledTimes(1);
        const payload = mocks.mutate.mock.calls[0][0] as { settings: Record<string, unknown> };
        expect(payload.settings.featureThreadsOneOnOneEnabled).toBe(false);
        expect(payload.settings.featureVideoCallsEnabled).toBe(false);
        expect(payload.settings.featureVideoCallsOneOnOneChatsEnabled).toBe(false);
        expect(payload.settings.agencyAdminControls).toBeUndefined();
        expect(
            within(control).getByRole('button', { name: /Policy-Auswahl öffnen|Open policy choices/i }),
        ).toBeDisabled();
    });

    it('projects tenant-enforced-on values as locked active controls', () => {
        mocks.useAgencyData.mockReturnValue(
            agency({
                featureVoiceMessagesEnabled: false,
                agencyAdminControls: { enforcedPermissionToggles: { voiceMessages: true } },
            }),
        );
        render(<AgencyPermissionsSettings agencyId="55" />);

        const control = policy('featureVoiceMessagesOneOnOneChatsEnabled');
        expect(within(control).getByTestId('LockIcon')).toBeInTheDocument();
        expect(within(control).getByTestId('CheckIcon')).toBeInTheDocument();
        expect(within(control).getByRole('button', { name: /Weitere Informationen|more information/i })).toBeTruthy();
    });
});
