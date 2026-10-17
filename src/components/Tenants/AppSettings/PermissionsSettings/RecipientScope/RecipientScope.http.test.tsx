import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../../i18n';
import { SuperAdminPermissionsSettings } from '../SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from '../TenantPermissionsSettings';

// Seam 3: the HTTP boundary (global fetch) of the "Internal group chats" tile. The real hooks, API
// modules and view run; only TenantService is stubbed, as ORISO-TenantService#321 serves it.

vi.mock('../CaseHandoverCard', () => ({ CaseHandoverCard: () => null }));

type Scope = { value: string; mode: string; inherited?: boolean };
type Body = Record<string, unknown> & { internalGroupChat?: { recipientScope: Scope } };

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

const server = {
    /** Resolved answer of GET permission-policies / controls; `undefined` = backend without the field. */
    scope: undefined as Scope | undefined,
    failNextPut: false,
    puts: [] as Body[],
};

const answer = (base: Record<string, unknown>) =>
    Response.json(server.scope ? { ...base, internalGroupChat: { recipientScope: server.scope } } : base);

const store = (body: Body) => {
    if (body.internalGroupChat) {
        server.scope = { ...body.internalGroupChat.recipientScope, inherited: false };
    }
};

const fetchStub = vi.fn(async (request: Request) => {
    const { pathname } = new URL(request.url);
    const isPut = request.method === 'PUT';
    // A real network takes time; an instant answer hides what the page shows while a save is in flight.
    if (isPut) await wait(60);
    if (isPut && server.failNextPut) {
        server.failNextPut = false;
        return new Response('{}', { status: 400 });
    }
    if (pathname.endsWith('/tenantadmin/7/permission-policies')) {
        if (isPut) {
            const body = (await request.json()) as Body;
            server.puts.push(body);
            store(body);
        }
        return answer({ tenantId: 7, policies: {} });
    }
    if (pathname.endsWith('/tenantadmin/controls')) {
        if (isPut) {
            const body = (await request.json()) as Body;
            server.puts.push(body);
            store(body);
        }
        return answer({ permissionsPageEnabled: true, permissionPolicies: {} });
    }
    if (pathname.endsWith('/tenantadmin/7')) {
        return Response.json({ id: 7, name: 'Träger Süd', settings: {} });
    }
    return Response.json({});
});

/** A fresh QueryClient per mount = a page reload. */
const mountTenant = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <TenantPermissionsSettings tenantId="7" />
        </QueryClientProvider>,
    );
const mountPlatform = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <SuperAdminPermissionsSettings tenantId="platform" />
        </QueryClientProvider>,
    );

const tile = async () => {
    const control = await screen.findByTestId('recipient-scope-control');
    return within(control);
};

beforeAll(async () => {
    await i18n.changeLanguage('en');
});

beforeEach(() => {
    server.scope = undefined;
    server.failNextPut = false;
    server.puts.length = 0;
    fetchStub.mockClear();
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
        fetchStub(input instanceof Request ? input : new Request(input, init)),
    );
});

afterEach(cleanup);

describe('Träger admin', () => {
    it('shows the default and still saves when the backend has no such field yet', async () => {
        const user = userEvent.setup();
        mountTenant();
        const control = await tile();
        expect(control.getByRole('radio', { name: /Counselling centre only/ })).toBeChecked();

        await user.click(control.getByRole('radio', { name: /Träger-wide/ }));
        await user.click(control.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(server.puts.at(-1)).toMatchObject({
                tenantId: 7,
                internalGroupChat: { recipientScope: { value: 'TENANT', mode: 'SUGGESTED' } },
            }),
        );
        // `inherited` is read-only: it must never go back to the server.
        expect(server.puts.at(-1)?.internalGroupChat?.recipientScope).not.toHaveProperty('inherited');
    });

    it('reads the saved value back after a reload', async () => {
        const user = userEvent.setup();
        server.scope = { value: 'AGENCY', mode: 'SUGGESTED', inherited: true };
        const view = mountTenant();
        let control = await tile();
        await user.click(control.getByRole('radio', { name: /Platform-wide/ }));
        await user.click(control.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(server.puts).toHaveLength(1));

        view.unmount();
        mountTenant();
        control = await tile();
        await waitFor(() => expect(control.getByRole('radio', { name: /Platform-wide/ })).toBeChecked());
        expect(control.getByText('Set by this Träger')).toBeInTheDocument();
    });

    it('sees the choice locked when the platform enforces it, and no save goes out', async () => {
        server.scope = { value: 'TENANT', mode: 'ENFORCED', inherited: true };
        mountTenant();
        const control = await tile();
        await waitFor(() => expect(control.getByRole('radio', { name: /Träger-wide/ })).toBeChecked());
        control.getAllByRole('radio').forEach((option) => expect(option).toBeDisabled());
        expect(control.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
        expect(server.puts).toHaveLength(0);
    });

    it('keeps the edit and shows an error when the server rejects the save', async () => {
        const user = userEvent.setup();
        mountTenant();
        const control = await tile();
        server.failNextPut = true;
        await user.click(control.getByRole('radio', { name: /Platform-wide/ }));
        await user.click(control.getByRole('button', { name: 'Save' }));

        expect(await control.findByRole('alert')).toHaveTextContent(/^Not saved\./);
        // Rolling back the cache must not move the choice or clear the error a moment later.
        await wait(150);
        expect(control.getByRole('alert')).toBeInTheDocument();
        expect(control.getByRole('radio', { name: /Platform-wide/ })).toBeChecked();
        expect(control.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    it('does not write the scope back when another switch on the same tile changes', async () => {
        const user = userEvent.setup();
        server.scope = { value: 'TENANT', mode: 'SUGGESTED', inherited: true };
        mountTenant();
        await tile();
        const card = screen.getByTestId('chat-type-card-groupInternal');
        const emailSwitch = await waitFor(() => {
            const found = card.querySelector<HTMLElement>('[data-feature-policy="featureInternalGroupChatEnabled"]');
            expect(found).not.toBeNull();
            return found as HTMLElement;
        });
        await user.click(
            within(emailSwitch).getByRole('button', {
                name: new RegExp(i18n.t('tenants.permissions.policy.openMenu')),
            }),
        );
        await user.click(
            await screen.findByRole('button', { name: i18n.t('tenants.permissions.policy.deactivationSuggested') }),
        );

        await waitFor(() => expect(server.puts).toHaveLength(1));
        // An echo would turn the inherited value into a Träger override that stops following the platform.
        expect(server.puts[0]).not.toHaveProperty('internalGroupChat');
    });
});

describe('platform admin', () => {
    it('makes the scope a requirement and reads it back after a reload', async () => {
        const user = userEvent.setup();
        const view = mountPlatform();
        let control = await tile();
        await user.click(control.getByRole('radio', { name: /Platform-wide/ }));
        await user.click(control.getByRole('button', { name: 'Requirement' }));
        await user.click(control.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(server.puts.at(-1)?.internalGroupChat).toEqual({
                recipientScope: { value: 'PLATFORM', mode: 'ENFORCED' },
            }),
        );

        view.unmount();
        mountPlatform();
        control = await tile();
        await waitFor(() => expect(control.getByRole('radio', { name: /Platform-wide/ })).toBeChecked());
        expect(control.getByRole('button', { name: 'Requirement' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('keeps the edit and shows an error when the server rejects the save', async () => {
        const user = userEvent.setup();
        mountPlatform();
        const control = await tile();
        server.failNextPut = true;
        await user.click(control.getByRole('radio', { name: /Platform-wide/ }));
        await user.click(control.getByRole('button', { name: 'Requirement' }));
        await user.click(control.getByRole('button', { name: 'Save' }));

        expect(await control.findByRole('alert')).toHaveTextContent(/^Not saved\./);
        await wait(150);
        expect(control.getByRole('alert')).toBeInTheDocument();
        expect(control.getByRole('radio', { name: /Platform-wide/ })).toBeChecked();
        expect(control.getByRole('button', { name: 'Requirement' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('keeps a stored scope when another platform switch is saved, but never sends the read-only marker', async () => {
        const user = userEvent.setup();
        server.scope = { value: 'TENANT', mode: 'ENFORCED', inherited: false };
        mountPlatform();
        await tile();
        const card = screen.getByTestId('chat-type-card-groupInternal');
        const emailSwitch = await waitFor(() => {
            const found = card.querySelector<HTMLElement>('[data-feature-policy="featureInternalGroupChatEnabled"]');
            expect(found).not.toBeNull();
            return found as HTMLElement;
        });
        await user.click(
            within(emailSwitch).getByRole('button', {
                name: new RegExp(i18n.t('tenants.permissions.policy.openMenu')),
            }),
        );
        await user.click(
            await screen.findByRole('button', { name: i18n.t('tenants.permissions.policy.deactivationSuggested') }),
        );

        await waitFor(() => expect(server.puts).toHaveLength(1));
        expect(server.puts[0].internalGroupChat).toEqual({ recipientScope: { value: 'TENANT', mode: 'ENFORCED' } });
    });

    it('does not turn the untouched default into a stored value when another switch is saved', async () => {
        const user = userEvent.setup();
        server.scope = { value: 'AGENCY', mode: 'SUGGESTED', inherited: true };
        mountPlatform();
        await tile();
        const card = screen.getByTestId('chat-type-card-groupInternal');
        const emailSwitch = await waitFor(() => {
            const found = card.querySelector<HTMLElement>('[data-feature-policy="featureInternalGroupChatEnabled"]');
            expect(found).not.toBeNull();
            return found as HTMLElement;
        });
        await user.click(
            within(emailSwitch).getByRole('button', {
                name: new RegExp(i18n.t('tenants.permissions.policy.openMenu')),
            }),
        );
        await user.click(
            await screen.findByRole('button', { name: i18n.t('tenants.permissions.policy.deactivationSuggested') }),
        );

        await waitFor(() => expect(server.puts).toHaveLength(1));
        expect(server.puts[0]).not.toHaveProperty('internalGroupChat');
    });
});
