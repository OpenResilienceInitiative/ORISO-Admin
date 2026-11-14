import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { snackbar as notification } from '../../../../Snackbar';
import i18n from '../../../../../i18n';
import { SuperAdminPermissionsSettings } from '../SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from '../TenantPermissionsSettings';

// Seam 3: the HTTP boundary (global fetch) of the "Calendar" tile (ADR-032). The real hooks, API
// modules and view run; only TenantService is stubbed, as ORISO-TenantService#365 serves it.

vi.mock('../CaseHandoverCard', () => ({ CaseHandoverCard: () => null }));

type Policy = { value: unknown; mode: string; inherited?: boolean };
type Calendar = { visibilityScope?: Policy; showAskerUsernames?: Policy };
type Body = Record<string, unknown> & {
    internalGroupChat?: { recipientScope: Policy };
    calendar?: Calendar;
};

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

const server = {
    calendar: undefined as Calendar | undefined,
    scope: { value: 'TENANT', mode: 'SUGGESTED', inherited: true } as Policy,
    failNextPut: false,
    puts: [] as Body[],
};

const answer = (base: Record<string, unknown>) =>
    Response.json({
        ...base,
        internalGroupChat: { recipientScope: server.scope },
        ...(server.calendar ? { calendar: server.calendar } : {}),
    });

/** The backend replaces the block it is sent; an omitted block stays as stored. */
const store = (body: Body) => {
    if (body.internalGroupChat) server.scope = { ...body.internalGroupChat.recipientScope, inherited: false };
    if (body.calendar) {
        const own = (policy?: Policy) => (policy ? { ...policy, inherited: false } : undefined);
        server.calendar = {
            visibilityScope: own(body.calendar.visibilityScope) ?? {
                value: 'AGENCY',
                mode: 'SUGGESTED',
                inherited: true,
            },
            showAskerUsernames: own(body.calendar.showAskerUsernames) ?? {
                value: false,
                mode: 'SUGGESTED',
                inherited: true,
            },
        };
    }
};

const fetchStub = vi.fn(async (request: Request) => {
    const { pathname } = new URL(request.url);
    const isPut = request.method === 'PUT';
    if (isPut) await wait(60);
    if (isPut && server.failNextPut) {
        server.failNextPut = false;
        return new Response('{}', { status: 400 });
    }
    if (pathname.endsWith('/tenantadmin/7/permission-policies') || pathname.endsWith('/tenantadmin/controls')) {
        if (isPut) {
            const body = (await request.json()) as Body;
            server.puts.push(body);
            store(body);
        }
        return pathname.endsWith('/controls')
            ? answer({ permissionsPageEnabled: true, permissionPolicies: {} })
            : answer({
                  tenantId: 7,
                  policies: { featureCallsEnabled: { value: true, mode: 'SUGGESTED', inherited: true } },
              });
    }
    if (pathname.endsWith('/tenantadmin/7')) {
        return Response.json({ id: 7, name: 'Träger Süd', settings: {} });
    }
    return Response.json({});
});

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const mountTenant = () =>
    render(
        <QueryClientProvider client={client()}>
            <TenantPermissionsSettings tenantId="7" />
        </QueryClientProvider>,
    );
const mountPlatform = () =>
    render(
        <QueryClientProvider client={client()}>
            <SuperAdminPermissionsSettings tenantId="platform" />
        </QueryClientProvider>,
    );

const reach = async () => within(await screen.findByTestId('calendar-visibility-scope-control'));
const usernames = async () => within(await screen.findByTestId('calendar-asker-usernames-control'));

const INHERITED_DEFAULT: Calendar = {
    visibilityScope: { value: 'AGENCY', mode: 'SUGGESTED', inherited: true },
    showAskerUsernames: { value: false, mode: 'SUGGESTED', inherited: true },
};

beforeAll(async () => {
    await i18n.changeLanguage('en');
});

beforeEach(() => {
    vi.spyOn(notification, 'success').mockImplementation(() => undefined);
    vi.spyOn(notification, 'error').mockImplementation(() => undefined);
    server.calendar = structuredClone(INHERITED_DEFAULT);
    server.scope = { value: 'TENANT', mode: 'SUGGESTED', inherited: true };
    server.failNextPut = false;
    server.puts.length = 0;
    fetchStub.mockClear();
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
        fetchStub(input instanceof Request ? input : new Request(input, init)),
    );
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('Träger admin', () => {
    it('saves the reach as the calendar block only, without the read-only marker', async () => {
        const user = userEvent.setup();
        mountTenant();
        const control = await reach();
        await user.click(control.getByRole('radio', { name: /Provider/ }));
        await user.click(control.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(server.puts).toHaveLength(1));
        expect(server.puts[0]).toEqual({
            tenantId: 7,
            policies: {},
            calendar: { visibilityScope: { value: 'TENANT', mode: 'SUGGESTED' } },
        });
        await waitFor(() =>
            expect(notification.success).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Calendar setting saved.' }),
            ),
        );
    });

    it('keeps its own reach when it then switches usernames on, and reads both back after a reload', async () => {
        const user = userEvent.setup();
        server.calendar = {
            ...INHERITED_DEFAULT,
            visibilityScope: { value: 'PLATFORM', mode: 'SUGGESTED', inherited: false },
        };
        const view = mountTenant();
        let control = await usernames();
        await user.click(control.getByRole('switch'));
        await user.click(control.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(server.puts).toHaveLength(1));
        expect(server.puts[0].calendar).toEqual({
            visibilityScope: { value: 'PLATFORM', mode: 'SUGGESTED' },
            showAskerUsernames: { value: true, mode: 'SUGGESTED' },
        });
        expect(server.puts[0]).not.toHaveProperty('internalGroupChat');

        view.unmount();
        mountTenant();
        control = await usernames();
        await waitFor(() => expect(control.getByRole('switch')).toBeChecked());
        expect((await reach()).getByRole('radio', { name: /Platform/ })).toBeChecked();
    });

    it('sees an enforced platform value locked, and no save goes out', async () => {
        server.calendar = {
            visibilityScope: { value: 'TENANT', mode: 'ENFORCED', inherited: true },
            showAskerUsernames: { value: false, mode: 'ENFORCED', inherited: true },
        };
        mountTenant();
        const scope = await reach();
        await waitFor(() => expect(scope.getByRole('radio', { name: /Provider/ })).toBeChecked());
        scope.getAllByRole('radio').forEach((option) => expect(option).toBeDisabled());
        expect((await usernames()).getByRole('switch')).toBeDisabled();
        expect(within(screen.getByTestId('permissions-card-calendar')).queryByRole('button', { name: 'Save' })).toBe(
            null,
        );
        expect(server.puts).toHaveLength(0);
    });

    it('keeps the edit and shows an error when the server rejects the save', async () => {
        const user = userEvent.setup();
        mountTenant();
        const control = await usernames();
        server.failNextPut = true;
        await user.click(control.getByRole('switch'));
        await user.click(control.getByRole('button', { name: 'Save' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(/Not saved\./);
        await wait(150);
        expect(control.getByRole('switch')).toBeChecked();
        expect(control.getByRole('button', { name: 'Save' })).toBeEnabled();
        expect(notification.success).not.toHaveBeenCalled();
    });

    it('does not send the calendar when the group-chat scope is saved', async () => {
        const user = userEvent.setup();
        mountTenant();
        const scope = within(await screen.findByTestId('recipient-scope-control'));
        await user.click(scope.getByRole('radio', { name: /Platform-wide/ }));
        await user.click(scope.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(server.puts).toHaveLength(1));
        expect(server.puts[0]).toHaveProperty('internalGroupChat');
        expect(server.puts[0]).not.toHaveProperty('calendar');
    });
});

describe('platform admin', () => {
    it('makes the reach a requirement; the stored username preset is kept, the group-chat scope is left out', async () => {
        const user = userEvent.setup();
        // The platform controls carry stored values, without markers.
        server.calendar = {
            visibilityScope: { value: 'AGENCY', mode: 'SUGGESTED' },
            showAskerUsernames: { value: true, mode: 'SUGGESTED' },
        };
        mountPlatform();
        const control = await reach();
        await user.click(control.getByRole('radio', { name: /Provider/ }));
        await user.click(control.getByRole('button', { name: 'Requirement' }));
        await user.click(control.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(server.puts).toHaveLength(1));
        expect(server.puts[0].calendar).toEqual({
            visibilityScope: { value: 'TENANT', mode: 'ENFORCED' },
            showAskerUsernames: { value: true, mode: 'SUGGESTED' },
        });
        expect(server.puts[0]).not.toHaveProperty('internalGroupChat');
        expect(server.puts[0]).toHaveProperty('permissionsPageEnabled', true);
    });

    it('does not send the calendar when the group-chat scope or a switch is saved', async () => {
        const user = userEvent.setup();
        mountPlatform();
        const scope = within(await screen.findByTestId('recipient-scope-control'));
        await user.click(scope.getByRole('radio', { name: /Platform-wide/ }));
        await user.click(scope.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(server.puts).toHaveLength(1));
        expect(server.puts[0]).not.toHaveProperty('calendar');

        const card = screen.getByTestId('chat-type-card-groupInternal');
        const master = card.querySelector<HTMLElement>('[data-feature-policy="featureInternalGroupChatEnabled"]');
        expect(master).not.toBeNull();
        await user.click(within(master as HTMLElement).getByRole('button', { name: /: (Active|Inactive) – / }));
        await waitFor(() => expect(server.puts).toHaveLength(2));
        expect(server.puts[1]).not.toHaveProperty('calendar');
    });
});
