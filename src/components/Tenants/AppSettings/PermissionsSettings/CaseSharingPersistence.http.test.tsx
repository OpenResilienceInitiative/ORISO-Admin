import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import i18n from '../../../../i18n';
import { AgencyPermissionsSettings } from './AgencyPermissionsSettings';
import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';
import type { CaseSharingApiMode, PolicyValue } from '../../../../types/permissionPolicy';

vi.mock('./CaseHandoverCard', () => ({ CaseHandoverCard: () => null }));

// ORISO-TenantService#374: the case sharing choice round-trips through the three stores
// (platform controls, Träger policies, Beratungsstelle settings).

type ApiPolicy = PolicyValue<CaseSharingApiMode> & { inherited?: boolean };
type Mode = 'caseHandover' | 'teamCounselling' | 'none';

beforeAll(async () => {
    await i18n.changeLanguage('en');
});
beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

/** The switch of one option, the last button of its card. */
const optionSwitch = async (mode: Mode) => {
    await screen.findByTestId('chat-type-card-oneOnOne');
    return waitFor(() => {
        const buttons = document.querySelectorAll<HTMLButtonElement>(`[data-case-sharing-option="${mode}"] button`);
        if (buttons.length === 0) throw new Error(`Case sharing option missing: ${mode}`);
        return buttons[buttons.length - 1];
    });
};
const expectChosen = (mode: Mode) =>
    waitFor(async () => expect(await optionSwitch(mode)).toHaveAttribute('aria-pressed', 'true'));

const mount = (ui: JSX.Element) =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {ui}
        </QueryClientProvider>,
    );

/** Holds every PUT until `release` answers it; keeps what each PUT carried. */
const heldWrites = <T,>() => {
    const bodies: T[] = [];
    const pending: Array<(response: Response) => void> = [];
    return {
        bodies,
        hold: (body: T, answer: () => Response) =>
            new Promise<Response>((resolve) => {
                bodies.push(body);
                pending.push(() => resolve(answer()));
            }),
        release: async () => {
            await act(async () => {
                pending.shift()?.(new Response());
            });
        },
    };
};

describe.each(['platform', 'tenant'] as const)('%s case sharing at the HTTP boundary', (level) => {
    const stub = (initial: ApiPolicy, rejectWrites = false) => {
        let stored: ApiPolicy = initial;
        const writes = heldWrites<ApiPolicy>();
        vi.stubGlobal(
            'fetch',
            vi.fn(async (request: Request) => {
                const { pathname } = new URL(request.url);
                const answer = () =>
                    Response.json(
                        level === 'platform'
                            ? { permissionsPageEnabled: true, permissionPolicies: {}, caseSharing: { mode: stored } }
                            : { tenantId: 7, policies: {}, caseSharing: { mode: stored } },
                    );
                if (pathname.endsWith('/controls') || pathname.endsWith('/permission-policies')) {
                    if (request.method === 'PUT') {
                        const body = await request.json();
                        const {
                            caseSharing: { mode },
                        }: { caseSharing: { mode: ApiPolicy } } = body;
                        return writes.hold(mode, () => {
                            if (rejectWrites) return Response.json({}, { status: 400 });
                            stored = { ...mode, inherited: false };
                            return answer();
                        });
                    }
                    return answer();
                }
                return Response.json({ id: 7, name: 'Synthetic case sharing tenant', settings: {} });
            }),
        );
        return writes;
    };
    const page = () =>
        level === 'platform' ? (
            <SuperAdminPermissionsSettings tenantId="platform" />
        ) : (
            <TenantPermissionsSettings tenantId="7" />
        );

    it('shows the loaded choice, sends the new one and keeps it after a fresh mount', async () => {
        const writes = stub({ value: 'CASE_HANDOVER', mode: 'SUGGESTED', inherited: false });
        const view = mount(page());
        await expectChosen('caseHandover');

        await userEvent.click(await optionSwitch('teamCounselling'));
        await waitFor(() => expect(writes.bodies).toHaveLength(1));
        expect(writes.bodies[0]).toMatchObject({ value: 'TEAM_COUNSELLING', mode: 'SUGGESTED' });
        await writes.release();
        await expectChosen('teamCounselling');

        view.unmount();
        mount(page());
        await expectChosen('teamCounselling');
    });

    it('sends the latest of two quick choices last', async () => {
        const writes = stub({ value: 'NONE', mode: 'SUGGESTED', inherited: false });
        mount(page());
        await expectChosen('none');

        await userEvent.click(await optionSwitch('teamCounselling'));
        await waitFor(() => expect(writes.bodies).toHaveLength(1));
        // the queued choice shows at once, so going back to "none" is a change again
        await expectChosen('teamCounselling');
        await userEvent.click(await optionSwitch('none'));
        await writes.release();
        await waitFor(() => expect(writes.bodies).toHaveLength(2));
        expect(writes.bodies[1]).toMatchObject({ value: 'NONE' });
        await writes.release();
        await expectChosen('none');
    });

    it('keeps the confirmed choice when the save is refused', async () => {
        const writes = stub({ value: 'CASE_HANDOVER', mode: 'SUGGESTED', inherited: false }, true);
        mount(page());
        await expectChosen('caseHandover');

        await userEvent.click(await optionSwitch('none'));
        await waitFor(() => expect(writes.bodies).toHaveLength(1));
        await writes.release();
        await expectChosen('caseHandover');
    });
});

describe('tenant case sharing under a platform requirement', () => {
    it('locks every option and sends nothing', async () => {
        const fetchMock = vi.fn(async (request: Request) => {
            const { pathname } = new URL(request.url);
            if (pathname.endsWith('/permission-policies'))
                return Response.json({
                    tenantId: 7,
                    policies: {},
                    caseSharing: { mode: { value: 'NONE', mode: 'ENFORCED', inherited: true } },
                });
            return Response.json({ id: 7, name: 'Synthetic case sharing tenant', settings: {} });
        });
        vi.stubGlobal('fetch', fetchMock);
        mount(<TenantPermissionsSettings tenantId="7" />);

        await expectChosen('none');
        const switches = await Promise.all((['caseHandover', 'teamCounselling', 'none'] as const).map(optionSwitch));
        switches.forEach((button) => expect(button).toBeDisabled());
        expect(fetchMock.mock.calls.some(([request]) => (request as Request).method === 'PUT')).toBe(false);
    });
});

describe('agency case sharing at the HTTP boundary', () => {
    const stub = (initial: ApiPolicy, rejectWrites = false) => {
        let stored: ApiPolicy = initial;
        const writes = heldWrites<Record<string, unknown>>();
        const snapshot = () => ({
            id: '55',
            tenantId: 7,
            name: 'Synthetic case sharing centre',
            consultingType: '4',
            teamAgency: false,
            settings: { caseSharing: stored },
        });
        vi.stubGlobal(
            'fetch',
            vi.fn(async (request: Request) => {
                if (new URL(request.url).pathname.endsWith('/agencyadmin/agencies/55')) {
                    if (request.method === 'PUT') {
                        const body: { settings: Record<string, unknown> } = await request.json();
                        return writes.hold(body.settings, () => {
                            if (rejectWrites) return Response.json({}, { status: 403 });
                            stored = {
                                value: body.settings.caseSharingMode as CaseSharingApiMode,
                                mode: 'SUGGESTED',
                                inherited: false,
                            };
                            return Response.json({ _embedded: snapshot() });
                        });
                    }
                    return Response.json({ _embedded: snapshot() });
                }
                return Response.json({ tenantId: 7, policies: {} });
            }),
        );
        return writes;
    };

    it('sends the centre mode and shows the answer after a fresh mount', async () => {
        const writes = stub({ value: 'CASE_HANDOVER', mode: 'SUGGESTED', inherited: true });
        const view = mount(<AgencyPermissionsSettings agencyId="55" />);
        await expectChosen('caseHandover');

        await userEvent.click(await optionSwitch('teamCounselling'));
        await waitFor(() => expect(writes.bodies).toHaveLength(1));
        expect(writes.bodies[0].caseSharingMode).toBe('TEAM_COUNSELLING');
        // the merged snapshot may echo the read-only effective `caseSharing`; AgencyService drops it
        await writes.release();
        await expectChosen('teamCounselling');

        view.unmount();
        mount(<AgencyPermissionsSettings agencyId="55" />);
        await expectChosen('teamCounselling');
    });

    it('keeps the effective choice when the AgencyService refuses the change', async () => {
        const writes = stub({ value: 'CASE_HANDOVER', mode: 'SUGGESTED', inherited: true }, true);
        mount(<AgencyPermissionsSettings agencyId="55" />);
        await expectChosen('caseHandover');

        await userEvent.click(await optionSwitch('none'));
        await waitFor(() => expect(writes.bodies).toHaveLength(1));
        await writes.release();
        await expectChosen('caseHandover');
    });

    it('locks every option under an inherited requirement', async () => {
        const writes = stub({ value: 'NONE', mode: 'ENFORCED', inherited: true });
        mount(<AgencyPermissionsSettings agencyId="55" />);

        await expectChosen('none');
        const switches = await Promise.all((['caseHandover', 'teamCounselling', 'none'] as const).map(optionSwitch));
        switches.forEach((button) => expect(button).toBeDisabled());
        expect(writes.bodies).toHaveLength(0);
    });
});
