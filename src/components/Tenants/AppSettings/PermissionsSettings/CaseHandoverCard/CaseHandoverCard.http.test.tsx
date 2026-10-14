import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../../i18n';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import { CaseHandoverCard } from './index';

// FE#1725: the card reads and writes the rules of one Träger, named by `tenantId`.
// Seam: the HTTP boundary (global fetch); the real hook and fetchData run.

const access = vi.hoisted(() => ({ isSuperAdmin: false, tenantUpdate: true }));

vi.mock('../../../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ isSuperAdmin: access.isSuperAdmin }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({
        can: (action: PermissionAction, resource: Resource) =>
            access.tenantUpdate && action === PermissionAction.Update && resource === Resource.Tenant,
    }),
}));

type Policy = Record<string, unknown> & { code: string };

const storedPolicies = (): Policy[] => [
    {
        code: 'ADVICE_REQUESTED',
        label: 'Advice requested',
        clientConsent: 'OPT_IN',
        clientConsentMode: 'SUGGESTED',
        clientConsentRequired: true,
        accessAllowed: true,
        enabled: true,
        displayOrder: 10,
        maxAccessDurationMinutes: 180,
    },
    {
        code: 'PLANNED_ABSENCE',
        label: 'Planned absence',
        clientConsent: 'NONE',
        clientConsentMode: 'SUGGESTED',
        clientConsentRequired: false,
        accessAllowed: true,
        enabled: true,
        displayOrder: 20,
    },
];

const server = {
    store: new Map<string, Policy[]>(),
    putStatus: 200,
    requests: [] as Array<{ method: string; url: string }>,
};

const fetchStub = vi.fn(async (request: Request) => {
    const url = new URL(request.url);
    server.requests.push({ method: request.method, url: request.url });
    if (!url.pathname.endsWith('/case-handover/reason-policies')) {
        return new Response('not found', { status: 404 });
    }
    const tenantId = url.searchParams.get('tenantId') ?? '';
    if (request.method === 'GET') {
        return Response.json(server.store.get(tenantId) ?? []);
    }
    if (server.putStatus !== 200) {
        return new Response('{}', { status: server.putStatus });
    }
    const body = (await request.json()) as Policy[];
    // Mirror UserService: the bare consent value comes back, the mode beside it.
    const saved = body.map((policy) => {
        const consent = policy.clientConsent as { value: string; mode: string } | string | undefined;
        return typeof consent === 'object'
            ? { ...policy, clientConsent: consent.value, clientConsentMode: consent.mode }
            : policy;
    });
    server.store.set(tenantId, saved);
    return Response.json(saved);
});

/** A fresh QueryClient per mount = a page reload. */
const mountCard = (tenantId?: number) =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <CaseHandoverCard tenantId={tenantId} />
        </QueryClientProvider>,
    );

const clientConsentButton = () => screen.findByRole('button', { name: /Advice seeker.*Open policy choices/i });

const chooseClientConsent = async (reasonTab: RegExp, option: RegExp) => {
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: reasonTab }));
    await user.click(await clientConsentButton());
    await user.click(screen.getByRole('button', { name: option }));
};

beforeAll(async () => {
    await i18n.changeLanguage('en');
});

beforeEach(() => {
    access.isSuperAdmin = false;
    access.tenantUpdate = true;
    server.store.clear();
    server.store.set('7', storedPolicies());
    server.store.set('8', storedPolicies());
    server.putStatus = 200;
    server.requests.length = 0;
    vi.stubGlobal('fetch', fetchStub);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('CaseHandoverCard against the reason-policy endpoint', () => {
    it('saves a changed rule for the named Träger and shows it again after a reload', async () => {
        const { unmount } = mountCard(7);
        await chooseClientConsent(/Planned/i, /^Consent opt-out \(adjustable\)$/i);

        await waitFor(() => expect(server.store.get('7')?.[1]).toMatchObject({ clientConsent: 'OPT_OUT' }));
        expect(server.store.get('8')?.[1]).toMatchObject({ clientConsent: 'NONE' });
        expect(server.requests.filter((request) => request.method === 'PUT').map((r) => r.url)).toEqual([
            expect.stringMatching(/reason-policies\?tenantId=7$/),
        ]);
        unmount();

        mountCard(7);
        await screen.findByRole('tab', { name: /Planned/i });
        await userEvent.setup().click(screen.getByRole('tab', { name: /Planned/i }));
        expect(await clientConsentButton()).toHaveAccessibleName(/Consent opt-out \(adjustable\)/i);
        expect(server.requests.at(-1)?.url).toMatch(/reason-policies\?tenantId=7$/);
    });

    it('shows an error and keeps the edit visible when saving fails', async () => {
        server.putStatus = 500;
        mountCard(7);
        await chooseClientConsent(/Planned/i, /^Consent opt-out \(adjustable\)$/i);

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(/not saved/i);
        expect(await clientConsentButton()).toHaveAccessibleName(/Consent opt-out \(adjustable\)/i);
        expect(server.store.get('7')?.[1]).toMatchObject({ clientConsent: 'NONE' });
    });

    it('says when the Träger may not be changed by this admin', async () => {
        server.putStatus = 403;
        mountCard(7);
        await chooseClientConsent(/Planned/i, /^Consent opt-out \(adjustable\)$/i);

        expect(await screen.findByRole('alert')).toHaveTextContent(/not allowed/i);
    });

    it('retries the failed save from the error message', async () => {
        server.putStatus = 500;
        mountCard(7);
        await chooseClientConsent(/Planned/i, /^Consent opt-out \(adjustable\)$/i);
        const alert = await screen.findByRole('alert');

        server.putStatus = 200;
        await userEvent.setup().click(within(alert).getByRole('button', { name: /try again/i }));

        await waitFor(() => expect(server.store.get('7')?.[1]).toMatchObject({ clientConsent: 'OPT_OUT' }));
        await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    });

    it('shows a BST admin the rules read-only with a note that the Träger admin sets them', async () => {
        access.tenantUpdate = false;
        mountCard(7);
        await userEvent.setup().click(await screen.findByRole('tab', { name: /Planned/i }));

        expect(screen.getByText(/Träger administration sets these rules/i)).toBeInTheDocument();
        expect(await clientConsentButton()).toBeDisabled();
        expect(server.requests.every((request) => request.method === 'GET')).toBe(true);
    });

    it('lets a platform admin edit any Träger', async () => {
        access.isSuperAdmin = true;
        access.tenantUpdate = false;
        mountCard(8);
        await chooseClientConsent(/Planned/i, /^Consent opt-out \(adjustable\)$/i);

        await waitFor(() => expect(server.store.get('8')?.[1]).toMatchObject({ clientConsent: 'OPT_OUT' }));
        expect(screen.queryByText(/Träger administration sets these rules/i)).not.toBeInTheDocument();
    });

    it('asks for a Träger on the platform-wide page instead of requesting rules without one', async () => {
        access.isSuperAdmin = true;
        mountCard(undefined);

        expect(await screen.findByText(/Handover rules are set per Träger/i)).toBeInTheDocument();
        expect(server.requests).toHaveLength(0);
    });

    it('shows every reason the endpoint returns', async () => {
        server.store.set('7', [
            ...storedPolicies(),
            { ...storedPolicies()[1], code: 'UNPLANNED_ABSENCE', label: 'Unplanned absence', displayOrder: 40 },
            { ...storedPolicies()[1], code: 'ASSIGNMENT_ENDED', label: 'Assignment ended', displayOrder: 50 },
            { ...storedPolicies()[1], code: 'OTHER_EMERGENCY', label: 'Other emergency', displayOrder: 60 },
            { ...storedPolicies()[1], code: 'NEW_PLATFORM_REASON', label: 'New platform reason', displayOrder: 70 },
        ]);
        mountCard(7);

        const tabs = within(await screen.findByRole('tablist', { name: /Handover reasons/i })).getAllByRole('tab');
        expect(tabs.map((tab) => tab.textContent)).toEqual(
            expect.arrayContaining([
                expect.stringMatching(/Advice/i),
                expect.stringMatching(/Planned/i),
                expect.stringMatching(/Unplanned/i),
                expect.stringMatching(/ended|left/i),
                expect.stringMatching(/emergency/i),
                'New platform reason',
            ]),
        );
    });

    it('explains in the menu what the client experiences with each consent option', async () => {
        mountCard(7);
        await userEvent.setup().click(await clientConsentButton());

        const option = (name: RegExp) => screen.getByRole('button', { name });
        expect(option(/^No consent \(adjustable\)$/i)).toHaveAccessibleDescription(/not asked.*immediately/i);
        expect(option(/^Consent opt-in \(adjustable\)$/i)).toHaveAccessibleDescription(/asked first.*agrees/i);
        expect(option(/^Consent opt-out \(adjustable\)$/i)).toHaveAccessibleDescription(
            /silent.*immediately.*informed.*object/i,
        );
        expect(option(/^Consent opt-out \(enforced\)$/i)).toHaveAccessibleDescription(/silent/i);
        // Shown as text in the menu, not only to screen readers.
        expect(screen.getAllByText(/Silent: access starts immediately/i)[0]).toBeVisible();
    });

    it('has the consent explanations in German as well', () => {
        const de = i18n.getFixedT('de');
        expect(de('tenants.permissions.consent.effect.OPT_OUT')).toMatch(/Stillschweigend.*sofort.*widersprechen/);
        expect(de('tenants.permissions.consent.effect.OPT_IN')).toMatch(/vorher gefragt/);
        expect(de('tenants.permissions.consent.effect.NONE')).toMatch(/nicht gefragt/);
    });
});
