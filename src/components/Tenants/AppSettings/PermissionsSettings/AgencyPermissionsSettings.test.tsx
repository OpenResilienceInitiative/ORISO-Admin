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
    useAgencyUpdate: () => ({ mutateAsync: mocks.mutate }),
}));

import { AgencyPermissionsSettings } from './AgencyPermissionsSettings';

const agency = (settings: Record<string, unknown>) => ({
    data: { id: '55', name: 'Beratungsstelle Nord', tenantId: 2, settings },
    isLoading: false,
});

const policy = (field: string) => document.querySelector(`[data-feature-policy="${field}"]`) as HTMLElement;

// The suite runs against the real i18n, in German or English: round button names are
// "<label>: <state> – <action>" while editable and "<label>: <state>" while locked.
const SWITCH_OFF = /: (Aktiviert – Deaktivieren|Active – Deactivate)$/;
const SWITCH_ON = /: (Deaktiviert – Aktivieren|Inactive – Activate)$/;
const LOCKED_ON = /: (Aktiviert|Active)$/;
const LOCKED_OFF = /: (Deaktiviert|Inactive)$/;
const LOCK_BUTTON = /Als Vorgabe festlegen|Make it a requirement|Anpassbar machen|Make it adjustable/;

describe('AgencyPermissionsSettings per-feature policies', () => {
    beforeEach(() => {
        mocks.useAgencyData.mockReset();
        mocks.mutate.mockReset();
        mocks.mutate.mockImplementation(async (patch) => ({
            ...mocks.useAgencyData().data,
            settings: { ...mocks.useAgencyData().data.settings, ...patch.settings },
        }));
    });

    it('derives an independent off state from the stored agency value', () => {
        mocks.useAgencyData.mockReturnValue(agency({ featureAnonymousChatEnabled: false }));
        render(<AgencyPermissionsSettings agencyId="55" />);

        const control = policy('featureAnonymousChatEnabled');
        const round = within(control).getByRole('button', { name: SWITCH_ON });
        expect(round).toHaveAttribute('aria-pressed', 'false');
        expect(round).toBeEnabled();
        // A Beratungsstelle only switches; it has no requirement lock.
        expect(within(control).queryByRole('button', { name: LOCK_BUTTON })).toBeNull();
    });

    it('keeps tenant-enforced-off features visible as a disabled button, with no edit path', async () => {
        const user = userEvent.setup();
        mocks.useAgencyData.mockReturnValue(
            agency({ agencyAdminControls: { allowedPermissionToggles: { videoCalls: false } } }),
        );
        render(<AgencyPermissionsSettings agencyId="55" />);

        const control = policy('featureVideoCallsOneOnOneChatsEnabled');
        const round = within(control).getByRole('button', { name: LOCKED_OFF });
        expect(round).toBeDisabled();
        await user.click(round);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(within(control).queryByRole('button', { name: LOCK_BUTTON })).toBeNull();
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('saves only the changed agency feature without replaying sibling values', async () => {
        const user = userEvent.setup();
        mocks.useAgencyData.mockReturnValue(
            agency({
                featureThreadsOneOnOneEnabled: true,
                agencyAdminControls: { allowedPermissionToggles: { videoCalls: false } },
            }),
        );
        render(<AgencyPermissionsSettings agencyId="55" />);

        const control = policy('featureThreadsOneOnOneEnabled');
        await user.click(within(control).getByRole('button', { name: SWITCH_OFF }));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
        const payload = mocks.mutate.mock.calls[0][0] as { settings: Record<string, unknown> };
        expect(payload.settings.featureThreadsOneOnOneEnabled).toBe(false);
        expect(payload.settings.featureVideoCallsEnabled).toBeUndefined();
        expect(payload.settings.featureVideoCallsOneOnOneChatsEnabled).toBeUndefined();
        expect(payload.settings.agencyAdminControls).toBeUndefined();
        // The write is done: the round button is usable again.
        await waitFor(() => expect(within(control).getByRole('button', { name: /: \S/ })).toBeEnabled());
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
        expect(within(control).getByRole('button', { name: LOCKED_ON })).toBeDisabled();
        expect(within(control).queryByRole('button', { name: LOCK_BUTTON })).toBeNull();
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
                      policies: { featureAskerEmailAgencyCounsellingEnabled: { value: true, mode: 'ENFORCED' } },
                  })
                : Response.json([]),
        );
        vi.stubGlobal('fetch', fetchStub);
        try {
            mocks.useAgencyData.mockReturnValue(agency({}));
            render(<AgencyPermissionsSettings agencyId="55" />);

            // The switch appears only once the Träger's value is loaded, never with a default first.
            const control = await waitFor(() => {
                const found = policy('featureAskerEmailAgencyCounsellingEnabled');
                expect(found).not.toBeNull();
                return found;
            });
            const trigger = within(control).getByRole('button', { name: /: \S/ });
            expect(trigger).toBeDisabled();
            await waitFor(() => expect(trigger).toHaveAccessibleName(LOCKED_ON));
            expect(within(control).getByTestId('LockIcon')).toBeInTheDocument();
            expect(within(control).queryByRole('button', { name: LOCK_BUTTON })).toBeNull();
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
            expect(policy('featureAskerEmailAgencyCounsellingEnabled')).toBeNull();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

// ORISO-Admin#1242: a Träger "off" for direct invitations locks the centre's row; an unset centre value follows it.
describe('AgencyPermissionsSettings direct invitations', () => {
    it("locks a chat type the Träger switched off and saves the centre's own choice", async () => {
        const user = userEvent.setup();
        const fetchStub = vi.fn(async (request: Request) =>
            new URL(request.url).pathname.endsWith('/tenantadmin/2/permission-policies')
                ? Response.json({
                      tenantId: 2,
                      policies: {
                          featureDirectInviteVideoEnabled: { value: false, mode: 'SUGGESTED', inherited: false },
                          featureDirectInviteChatEnabled: { value: true, mode: 'SUGGESTED', inherited: true },
                      },
                  })
                : Response.json([]),
        );
        vi.stubGlobal('fetch', fetchStub);
        try {
            mocks.useAgencyData.mockReturnValue(agency({}));
            render(<AgencyPermissionsSettings agencyId="55" />);

            await waitFor(() =>
                expect(
                    within(policy('featureDirectInviteVideoEnabled')).getByRole('button', { name: LOCKED_OFF }),
                ).toBeDisabled(),
            );
            expect(
                screen.getByText(/Ihr Träger hat das ausgeschaltet|Your Träger has switched this off/i),
            ).toBeTruthy();

            const chat = policy('featureDirectInviteChatEnabled');
            await user.click(within(chat).getByRole('button', { name: SWITCH_OFF }));
            const payload = mocks.mutate.mock.calls.at(-1)?.[0] as { settings: Record<string, unknown> };
            expect(payload.settings.featureDirectInviteChatEnabled).toBe(false);
        } finally {
            vi.unstubAllGlobals();
        }
    });
    it('shows no editable direct-invite rows when the Träger policies cannot be read', async () => {
        const fetchStub = vi.fn(async (request: Request) =>
            new URL(request.url).pathname.endsWith('/tenantadmin/2/permission-policies')
                ? new Response(null, { status: 403 })
                : Response.json([]),
        );
        vi.stubGlobal('fetch', fetchStub);
        try {
            mocks.useAgencyData.mockReturnValue(agency({}));
            render(<AgencyPermissionsSettings agencyId="55" />);

            expect(
                await screen.findByText(
                    /Einstellung des Trägers konnte nicht geladen|Träger's setting could not be loaded/i,
                ),
            ).toBeTruthy();
            expect(policy('featureDirectInviteChatEnabled')).toBeNull();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
