import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
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
            within(control).getByRole('button', { name: /Deaktivierung \(anpassbar\)|deactivation \(adjustable\)/i }),
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
            within(control).queryByText(/Aktivierung \(anpassbar\)|activation \(adjustable\)/i),
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
            within(control).getByRole('button', { name: /Deaktivierung \(anpassbar\)|deactivation \(adjustable\)/i }),
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

// FE#1725: the Case handover card on a counselling-centre page shows that centre's Träger rules.
describe('AgencyPermissionsSettings case handover card', () => {
    it("requests the handover rules of the agency's Träger", async () => {
        const fetchStub = vi.fn(async () => Response.json([]));
        vi.stubGlobal('fetch', fetchStub);
        try {
            mocks.useAgencyData.mockReturnValue(agency({}));
            render(<AgencyPermissionsSettings agencyId="55" />);

            await waitFor(() =>
                expect(fetchStub.mock.calls.map(([request]) => (request as unknown as Request).url)).toContainEqual(
                    expect.stringMatching(/case-handover\/reason-policies\?tenantId=2$/),
                ),
            );
        } finally {
            vi.unstubAllGlobals();
        }
    });

    // Review 9: no "open a Träger" hint while the centre's Träger is still unknown.
    it('shows a loading state, not the no-Träger hint, while the agency is pending', () => {
        const fetchStub = vi.fn(async () => Response.json([]));
        vi.stubGlobal('fetch', fetchStub);
        try {
            // react-query v5: pending without fetching yet (e.g. paused) is not `isLoading`.
            mocks.useAgencyData.mockReturnValue({ data: undefined, isLoading: false, isPending: true });
            render(<AgencyPermissionsSettings agencyId="55" />);

            expect(screen.queryByText(/Übergaberegeln gelten je Träger|Handover rules are set per Träger/i)).toBeNull();
            expect(document.querySelector('[data-testid="case-handover-card-loading"]')).not.toBeNull();
            expect(fetchStub.mock.calls.map(([request]) => (request as unknown as Request).url).join(' ')).not.toMatch(
                /case-handover/,
            );
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('shows the no-Träger hint once the agency has loaded without one', () => {
        mocks.useAgencyData.mockReturnValue({
            data: { id: '55', name: 'Beratungsstelle Nord', settings: {} },
            isLoading: false,
            isPending: false,
        });
        render(<AgencyPermissionsSettings agencyId="55" />);

        expect(screen.getByText(/Übergaberegeln gelten je Träger|Handover rules are set per Träger/i)).toBeTruthy();
    });
});

// Review 10: AgencyService stores no channel switches; the centre shows its Träger's, read-only.
describe('AgencyPermissionsSettings notification channels', () => {
    it("shows the Träger's channel value read-only", async () => {
        const fetchStub = vi.fn(async (request: Request) =>
            new URL(request.url).pathname.endsWith('/tenantadmin/2/permission-policies')
                ? Response.json({
                      tenantId: 2,
                      policies: { featureAskerEmailLiveChatEnabled: { value: true, mode: 'ENFORCED' } },
                  })
                : Response.json([]),
        );
        vi.stubGlobal('fetch', fetchStub);
        try {
            mocks.useAgencyData.mockReturnValue(agency({}));
            render(<AgencyPermissionsSettings agencyId="55" />);

            // The switch appears only once the Träger's value is loaded, never with a default first.
            const control = await waitFor(() => {
                const found = policy('featureAskerEmailLiveChatEnabled');
                expect(found).not.toBeNull();
                return found;
            });
            const trigger = within(control).getByRole('button', { name: /Policy-Auswahl öffnen|Open policy choices/i });
            expect(trigger).toBeDisabled();
            await waitFor(() => expect(trigger).toHaveAccessibleName(/Aktivierung erzwungen|Activation enforced/i));
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('says the Träger values could not be loaded when the read is refused', async () => {
        const fetchStub = vi.fn(async (request: Request) =>
            new URL(request.url).pathname.endsWith('/tenantadmin/2/permission-policies')
                ? new Response(null, { status: 403 })
                : Response.json([]),
        );
        vi.stubGlobal('fetch', fetchStub);
        try {
            mocks.useAgencyData.mockReturnValue(agency({}));
            render(<AgencyPermissionsSettings agencyId="55" />);

            expect((await screen.findAllByText(/Träger.*(nicht geladen|could not be loaded)/i)).length).toBeGreaterThan(
                0,
            );
            expect(policy('featureAskerEmailLiveChatEnabled')).toBeNull();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
