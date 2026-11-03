import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';

// FE#1725 review 11: an ENFORCED channel switch must re-read as ENFORCED after a reload.
// Seam: the HTTP boundary (global fetch); the real hooks, API module and view run.

vi.mock('./CaseHandoverCard', () => ({ CaseHandoverCard: () => null }));

type Policy = { value: boolean; mode: 'ENFORCED' | 'SUGGESTED'; inherited?: boolean };

const server = {
    policies: {} as Record<string, Policy>,
    puts: [] as Array<{ tenantId: number; policies: Record<string, Policy> }>,
};

// Shapes as TenantService serves them: GET/PUT /tenantadmin/:id/permission-policies.
const fetchStub = vi.fn(async (request: Request) => {
    const { pathname } = new URL(request.url);
    if (pathname.endsWith('/tenantadmin/7/permission-policies')) {
        if (request.method === 'PUT') {
            const body = (await request.json()) as { tenantId: number; policies: Record<string, Policy> };
            server.puts.push(body);
            server.policies = body.policies;
        }
        return Response.json({ tenantId: 7, policies: server.policies });
    }
    if (pathname.endsWith('/tenantadmin/7')) {
        return Response.json({ id: 7, name: 'Träger Süd', settings: {} });
    }
    return Response.json({});
});

/** A fresh QueryClient per mount = a page reload. */
const mount = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <TenantPermissionsSettings tenantId="7" />
        </QueryClientProvider>,
    );

const wrapperOf = async (field: string) => {
    const card = await screen.findByTestId('chat-type-card-groupInternal');
    await waitFor(() => expect(card.querySelector(`[data-feature-policy="${field}"]`)).not.toBeNull());
    return card.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`) as HTMLElement;
};
/** The requirement lock of one switch. */
const lockOf = async (field: string) =>
    within(await wrapperOf(field)).getByRole('button', {
        name: new RegExp(
            `${i18n.t('tenants.permissions.policy.makeRequired')}|${i18n.t(
                'tenants.permissions.policy.makeAdjustable',
            )}`,
        ),
    });

beforeAll(async () => {
    await i18n.changeLanguage('en');
});

beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    server.policies = { featureConsultantEmailInternalGroupEnabled: { value: true, mode: 'SUGGESTED' } };
    server.puts.length = 0;
    fetchStub.mockClear();
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
        fetchStub(input instanceof Request ? input : new Request(input, init)),
    );
});

describe('channel switch round trip', () => {
    it('saves ENFORCED and reads ENFORCED back after a reload', async () => {
        const user = userEvent.setup();
        const field = 'featureConsultantEmailInternalGroupEnabled';
        const view = mount();

        await user.click(await lockOf(field));

        await waitFor(() => expect(server.puts.at(-1)?.policies[field]).toEqual({ value: true, mode: 'ENFORCED' }));
        const enforcedLock = new RegExp(i18n.t('tenants.permissions.policy.makeAdjustable'));
        await waitFor(async () => expect(await lockOf(field)).toHaveAccessibleName(enforcedLock));
        expect(await lockOf(field)).toHaveAttribute('aria-pressed', 'true');

        view.unmount();
        mount();
        await waitFor(async () => expect(await lockOf(field)).toHaveAccessibleName(enforcedLock));
        expect(await lockOf(field)).toHaveAttribute('aria-pressed', 'true');
    });
});
