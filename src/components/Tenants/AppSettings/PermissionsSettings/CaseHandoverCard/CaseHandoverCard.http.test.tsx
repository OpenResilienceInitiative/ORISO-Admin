import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../../i18n';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import { CaseHandoverCard } from './index';
import { SuperAdminPermissionsSettings } from '../SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from '../TenantPermissionsSettings';
import type { PolicyValue } from '../../../../../types/permissionPolicy';

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
    reasonGetStatus: 200,
    masterPutStatus: 200,
    master: { value: true, mode: 'SUGGESTED', inherited: false } as PolicyValue<boolean>,
    canonicalWrites: [] as Array<Record<string, unknown>>,
    requests: [] as Array<{ method: string; url: string }>,
};

const fetchStub = vi.fn(async (request: Request) => {
    const url = new URL(request.url);
    server.requests.push({ method: request.method, url: request.url });
    if (url.pathname.endsWith('/controls') || url.pathname.endsWith('/permission-policies')) {
        const platform = url.pathname.endsWith('/controls');
        if (request.method === 'PUT') {
            const body = await request.json();
            server.canonicalWrites.push(body);
            if (server.masterPutStatus !== 200) return new Response('{}', { status: server.masterPutStatus });
            server.master = (platform ? body.permissionPolicies : body.policies).caseHandoverEnabled;
        }
        const policies = { caseHandoverEnabled: server.master };
        return Response.json(
            platform ? { permissionsPageEnabled: true, permissionPolicies: policies } : { tenantId: 7, policies },
        );
    }
    if (!url.pathname.endsWith('/case-handover/reason-policies')) {
        return request.method === 'GET'
            ? Response.json({ id: 7, name: 'Synthetic handover tenant', settings: {} })
            : new Response('not found', { status: 404 });
    }
    const tenantId = url.searchParams.get('tenantId') ?? '';
    if (request.method === 'GET') {
        if (server.reasonGetStatus !== 200)
            return new Response('private upstream failure body', { status: server.reasonGetStatus });
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
    server.reasonGetStatus = 200;
    server.masterPutStatus = 200;
    server.master = { value: true, mode: 'SUGGESTED', inherited: false };
    server.canonicalWrites.length = 0;
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

    it('shows every current reason the endpoint returns, without the hidden legacy emergency', async () => {
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
                'New platform reason',
            ]),
        );
        expect(tabs.map((tab) => tab.textContent)).not.toContainEqual(expect.stringMatching(/emergency/i));
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

    it('explains opt-out in one sentence, in German and English', () => {
        const oneSentence = /^[^.!?]+[.!?]$/;
        expect(i18n.getFixedT('de')('tenants.permissions.consent.effect.OPT_OUT')).toMatch(oneSentence);
        expect(i18n.getFixedT('en')('tenants.permissions.consent.effect.OPT_OUT')).toMatch(oneSentence);
    });
});

const mountPolicyPage = (level: 'platform' | 'tenant') =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {level === 'platform' ? (
                <SuperAdminPermissionsSettings tenantId="platform" />
            ) : (
                <TenantPermissionsSettings tenantId="7" />
            )}
        </QueryClientProvider>,
    );

const masterButton = async () => {
    const card = await screen.findByTestId('case-handover-card');
    const row = await waitFor(() => {
        const found = card.querySelector<HTMLElement>('[data-feature-policy="caseHandoverEnabled"]');
        if (!found) throw new Error('Case handover master policy is missing');
        return found;
    });
    return within(row).findByRole('button', { name: /Open policy choices/i });
};

const chooseMaster = async (enabled: boolean) => {
    const user = userEvent.setup();
    await user.click(await masterButton());
    await user.click(
        screen.getByRole('button', {
            name: i18n.t(`tenants.permissions.policy.${enabled ? 'activationSuggested' : 'deactivationSuggested'}`),
        }),
    );
};

// The real policy containers, card, hooks and fetchData run together at this HTTP seam.
describe.each(['platform', 'tenant'] as const)('%s handover master ownership', (level) => {
    it('keeps mixed individual reason choices through master OFF, ON and a fresh mount', async () => {
        access.isSuperAdmin = level === 'platform';
        const mixed = [storedPolicies()[0], { ...storedPolicies()[1], enabled: false }];
        server.store.set('7', mixed);
        const view = mountPolicyPage(level);

        await chooseMaster(false);
        await waitFor(() => expect(server.master.value).toBe(false));
        await waitFor(async () => expect(await masterButton()).toBeEnabled());
        await chooseMaster(true);
        await waitFor(() => expect(server.master.value).toBe(true));
        await waitFor(async () => expect(await masterButton()).toBeEnabled());

        expect(server.canonicalWrites).toHaveLength(2);
        expect(
            server.requests.filter(({ method, url }) => method === 'PUT' && url.includes('/reason-policies')),
        ).toEqual([]);
        expect(server.store.get('7')).toEqual(mixed);
        view.unmount();
        mountPolicyPage(level);
        expect(await masterButton()).toHaveAccessibleName(
            expect.stringContaining(i18n.t('tenants.permissions.policy.activationSuggested')),
        );
        expect(server.store.get('7')?.map(({ enabled }) => enabled)).toEqual([true, false]);
    });

    it('rolls back a failed master write without any reason-policy writes', async () => {
        access.isSuperAdmin = level === 'platform';
        server.masterPutStatus = 500;
        const mixed = [storedPolicies()[0], { ...storedPolicies()[1], enabled: false }];
        server.store.set('7', mixed);
        mountPolicyPage(level);

        await chooseMaster(false);
        await waitFor(() => expect(server.canonicalWrites).toHaveLength(1));
        await waitFor(async () =>
            expect(await masterButton()).toHaveAccessibleName(
                expect.stringContaining(i18n.t('tenants.permissions.policy.activationSuggested')),
            ),
        );
        expect(
            server.requests.filter(({ method, url }) => method === 'PUT' && url.includes('/reason-policies')),
        ).toEqual([]);
        expect(server.store.get('7')).toEqual(mixed);
        expect(server.master.value).toBe(true);
    });
});

describe('agency handover master HTTP boundary', () => {
    it.each([true, false])(
        'keeps parent value %s suggested, read-only and free of cross-scope saves',
        async (value) => {
            // Even an actor who can edit the tenant must not write it from the agency card.
            access.tenantUpdate = true;
            const onFeaturePolicyChange = vi.fn();
            render(
                <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                    <CaseHandoverCard
                        tenantId={7}
                        policyLevel="agency"
                        permissionPolicies={{ caseHandoverEnabled: { value, mode: 'SUGGESTED', inherited: true } }}
                        openPolicyMenu="caseHandoverEnabled"
                        onFeaturePolicyChange={onFeaturePolicyChange}
                    />
                </QueryClientProvider>,
            );

            const master = await masterButton();
            expect(master).toBeDisabled();
            expect(master).toHaveAccessibleName(
                expect.stringContaining(
                    i18n.t(`tenants.permissions.policy.${value ? 'activationSuggested' : 'deactivationSuggested'}`),
                ),
            );
            expect(screen.getByText(/Träger administration sets these rules/i)).toBeVisible();
            expect(
                screen.queryByRole('button', { name: i18n.t('tenants.permissions.policy.deactivationSuggested') }),
            ).toBeNull();
            await userEvent.setup().click(master);
            expect(await clientConsentButton()).toBeDisabled();
            expect(screen.getByTestId('case-handover-template-input')).toBeDisabled();
            expect(onFeaturePolicyChange).not.toHaveBeenCalled();
            expect(server.requests.every(({ method }) => method === 'GET')).toBe(true);
        },
    );
});

describe('independent master while reason HTTP authority is unavailable', () => {
    it.each(['tenant', 'agency'] as const)('keeps the loaded %s master and retries only reasons', async (level) => {
        server.reasonGetStatus = 500;
        const mixed = [storedPolicies()[0], { ...storedPolicies()[1], enabled: false }];
        server.store.set('7', mixed);
        const onFeaturePolicyChange = vi.fn();
        if (level === 'tenant') mountPolicyPage('tenant');
        else
            render(
                <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                    <CaseHandoverCard
                        tenantId={7}
                        policyLevel="agency"
                        permissionPolicies={{ caseHandoverEnabled: server.master }}
                        onFeaturePolicyChange={onFeaturePolicyChange}
                    />
                </QueryClientProvider>,
            );
        const alert = await screen.findByTestId('case-handover-card-error');
        expect(await masterButton()).toHaveAccessibleName(
            expect.stringContaining(i18n.t('tenants.permissions.policy.activationSuggested')),
        );
        if (level === 'agency') {
            expect(await masterButton()).toBeDisabled();
            expect(screen.getByText(/Träger administration sets these rules/i)).toBeVisible();
        } else expect(await masterButton()).toBeEnabled();
        expect(screen.queryByRole('tablist', { name: /Handover reasons/i })).not.toBeInTheDocument();
        expect(alert).not.toHaveTextContent('private upstream failure body');
        server.reasonGetStatus = 200;
        await userEvent.setup().click(within(alert).getByRole('button', { name: /try again/i }));
        await screen.findByRole('tablist', { name: /Handover reasons/i });
        expect(screen.queryByTestId('case-handover-card-error')).not.toBeInTheDocument();
        expect(server.store.get('7')).toEqual(mixed);
        expect(server.requests.filter(({ method }) => method === 'PUT')).toEqual([]);
        expect(onFeaturePolicyChange).not.toHaveBeenCalled();
    });
    it.each([
        { value: true, mode: 'ENFORCED', key: 'activationEnforced' },
        { value: false, mode: 'ENFORCED', key: 'deactivationEnforced' },
        { value: true, mode: 'SUGGESTED', key: 'activationSuggested' },
        { value: false, mode: 'SUGGESTED', key: 'deactivationSuggested' },
    ] as const)(
        'saves canonical $key without reason writes during reason GET failure',
        async ({ value, mode, key }) => {
            server.reasonGetStatus = 500;
            const mixed = [storedPolicies()[0], { ...storedPolicies()[1], enabled: false }];
            server.store.set('7', mixed);
            mountPolicyPage('tenant');
            await screen.findByTestId('case-handover-card-error');
            await userEvent.setup().click(await masterButton());
            await userEvent
                .setup()
                .click(screen.getByRole('button', { name: i18n.t(`tenants.permissions.policy.${key}`) }));
            await waitFor(() => expect(server.canonicalWrites).toHaveLength(1));
            expect(server.master).toMatchObject({ value, mode });
            expect(
                server.requests.filter(({ method, url }) => method === 'PUT' && url.includes('/reason-policies')),
            ).toEqual([]);
            expect(server.store.get('7')).toEqual(mixed);
        },
    );
});
