import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';
import type { PolicyValue } from '../../../../types/permissionPolicy';

vi.mock('./CaseHandoverCard', () => ({ CaseHandoverCard: () => null }));

const field = 'featureVideoCallsOneOnOneChatsEnabled';
const states: Array<{ value: boolean; mode: 'ENFORCED' | 'SUGGESTED' }> = [
    { value: true, mode: 'ENFORCED' },
    { value: false, mode: 'ENFORCED' },
    { value: true, mode: 'SUGGESTED' },
    { value: false, mode: 'SUGGESTED' },
];
const otherMode = (mode: 'ENFORCED' | 'SUGGESTED') => (mode === 'ENFORCED' ? 'SUGGESTED' : 'ENFORCED');

const ROUND = /: (Active|Inactive)/;
const LOCK = /Make it (a requirement|adjustable)/;
/** What the two buttons of one setting say for a given value and mode. */
const expectedNames = (label: string, value: boolean, mode: 'ENFORCED' | 'SUGGESTED') => ({
    round: `${label}: ${i18n.t(`tenants.permissions.policy.${value ? 'activated' : 'deactivated'}`)} – ${i18n.t(
        `tenants.permissions.policy.${value ? 'deactivate' : 'activate'}`,
    )}`,
    lock: `${label}: ${i18n.t(
        `tenants.permissions.policy.${mode === 'ENFORCED' ? 'enforced' : 'suggestion'}`,
    )} – ${i18n.t(`tenants.permissions.policy.${mode === 'ENFORCED' ? 'makeAdjustable' : 'makeRequired'}`)}`,
});

const control = async () => {
    const card = await screen.findByTestId('chat-type-card-oneOnOne');
    const row = card.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`);
    if (!row) throw new Error('Video permission row is missing');
    return within(row);
};

beforeAll(async () => {
    await i18n.changeLanguage('en');
});
beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

describe.each(['platform', 'tenant'] as const)('%s four-state permission HTTP persistence', (level) => {
    it.each(states)(
        'keeps $value / $mode selected after the save responses and a fresh page mount',
        async ({ value, mode }) => {
            // Start from the opposite of both decisions, so reaching the target takes both buttons.
            const start = { value: !value, mode: otherMode(mode) };
            let policies: Record<string, PolicyValue<boolean>> = {
                [field]: { ...start, inherited: false },
            };
            const puts: Array<Record<string, PolicyValue<boolean>>> = [];
            vi.stubGlobal(
                'fetch',
                vi.fn(async (request: Request) => {
                    const { pathname } = new URL(request.url);
                    if (pathname.endsWith('/controls') || pathname.endsWith('/permission-policies')) {
                        if (request.method === 'PUT') {
                            const body = await request.json();
                            policies = level === 'platform' ? body.permissionPolicies : body.policies;
                            puts.push(policies);
                        }
                        return Response.json(
                            level === 'platform'
                                ? { permissionsPageEnabled: true, permissionPolicies: policies }
                                : { tenantId: 7, policies },
                        );
                    }
                    return Response.json({ id: 7, name: 'Synthetic policy tenant', settings: {} });
                }),
            );
            const mount = () =>
                render(
                    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                        {level === 'platform' ? (
                            <SuperAdminPermissionsSettings tenantId="platform" />
                        ) : (
                            <TenantPermissionsSettings tenantId="7" />
                        )}
                    </QueryClientProvider>,
                );
            const label = i18n.t('tenants.permissions.feature.videoCalls');
            const expectSelected = async () => {
                const names = expectedNames(label, value, mode);
                await waitFor(async () => {
                    const row = await control();
                    expect(row.getByRole('button', { name: names.round })).toHaveAttribute(
                        'aria-pressed',
                        String(value),
                    );
                    expect(row.getByRole('button', { name: names.lock })).toHaveAttribute(
                        'aria-pressed',
                        String(mode === 'ENFORCED'),
                    );
                });
            };
            const view = mount();
            const user = userEvent.setup();

            // Click 1, the round button: only the value moves, the mode stays as stored.
            await user.click((await control()).getByRole('button', { name: ROUND }));
            await waitFor(() => expect(puts).toHaveLength(1));
            expect(puts[0][field]).toMatchObject({ value, mode: start.mode });
            await waitFor(async () => expect((await control()).getByRole('button', { name: ROUND })).toBeEnabled());

            // Click 2, the lock: only the mode moves, the value saved by click 1 stays.
            await user.click((await control()).getByRole('button', { name: LOCK }));
            await waitFor(() => expect(puts).toHaveLength(2));
            expect(puts[1][field]).toMatchObject({ value, mode });
            await expectSelected();

            view.unmount();
            mount();
            await expectSelected();
            expect(puts).toHaveLength(2);
        },
    );
});

const collectionFields = [
    'featureAskerEmailCollectionAgencyCounsellingEnabled',
    'featureAskerEmailCollectionSelfHelpEnabled',
] as const;
const emailMaster = 'featureAskerEmailEnabled';
const liveDelivery = 'featureAskerEmailLiveChatEnabled';
const initialCollectionPolicies = (): Record<string, PolicyValue<boolean>> => ({
    [emailMaster]: { value: true, mode: 'SUGGESTED', inherited: false },
    [collectionFields[0]]: { value: true, mode: 'SUGGESTED', inherited: false },
    [collectionFields[1]]: { value: true, mode: 'ENFORCED', inherited: false },
    [liveDelivery]: { value: false, mode: 'SUGGESTED', inherited: false },
});
const currentCollectionRow = (key: string) => {
    const row = document.querySelector<HTMLElement>(`[data-feature-policy="${key}"]`);
    if (!row) throw new Error(`Account collection policy is missing: ${key}`);
    return within(row);
};
const policyButton = (key: string) => currentCollectionRow(key).getByRole('button', { name: ROUND });
const lockButton = (key: string) => currentCollectionRow(key).getByRole('button', { name: LOCK });
const mountCollectionPage = (level: 'platform' | 'tenant') =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {level === 'platform' ? (
                <SuperAdminPermissionsSettings tenantId="platform" excludeCardKeys={['liveChat']} />
            ) : (
                <TenantPermissionsSettings tenantId="7" />
            )}
        </QueryClientProvider>,
    );
const collectionServer = (level: 'platform' | 'tenant') => {
    const fixture = {
        policies: initialCollectionPolicies(),
        writes: [] as Array<Record<string, PolicyValue<boolean>>>,
        failFirst: false,
        releaseFirst: () => {},
        normalize: (policies: Record<string, PolicyValue<boolean>>) => policies,
    };
    vi.stubGlobal(
        'fetch',
        vi.fn(async (request: Request) => {
            const { pathname } = new URL(request.url);
            if (pathname.endsWith('/controls') || pathname.endsWith('/permission-policies')) {
                const platform = pathname.endsWith('/controls');
                if (request.method === 'PUT') {
                    const body = await request.json();
                    const submitted = platform ? body.permissionPolicies : body.policies;
                    fixture.writes.push(structuredClone(submitted));
                    if (fixture.failFirst && fixture.writes.length === 1) {
                        return new Promise<Response>((resolve) => {
                            fixture.releaseFirst = () => resolve(Response.json({}, { status: 503 }));
                        });
                    }
                    fixture.policies = Object.fromEntries(
                        Object.entries(submitted as Record<string, PolicyValue<boolean>>).map(([key, policy]) => [
                            key,
                            { ...policy, inherited: false },
                        ]),
                    );
                    fixture.policies = fixture.normalize(fixture.policies);
                }
                return Response.json(
                    platform
                        ? {
                              permissionsPageEnabled: true,
                              permissionPolicies: level === 'platform' ? fixture.policies : {},
                          }
                        : { tenantId: 7, policies: fixture.policies },
                );
            }
            return Response.json({ id: 7, name: 'Synthetic collection tenant', settings: {} });
        }),
    );
    return fixture;
};
const chooseCollectionValue = async (key: string) => {
    const user = userEvent.setup();
    await waitFor(() => expect(policyButton(key)).toBeEnabled());
    await user.click(policyButton(key));
};
const chooseCollectionMode = async (key: string) => {
    const user = userEvent.setup();
    await waitFor(() => expect(lockButton(key)).toBeEnabled());
    await user.click(lockButton(key));
};
const stateOf = (key: string) => ({
    value: policyButton(key).getAttribute('aria-pressed') === 'true',
    enforced: lockButton(key).getAttribute('aria-pressed') === 'true',
});

describe.each(['platform', 'tenant'] as const)('%s collection permission HTTP boundary', (level) => {
    it.each(collectionFields.flatMap((key) => states.map((state) => ({ key, ...state }))))(
        'persists $key=$value/$mode through normalized response and reload, separately from delivery',
        async ({ key, value, mode }) => {
            const fixture = collectionServer(level);
            // Start from the opposite of both decisions, so reaching the target takes both buttons.
            const start = { value: !value, mode: otherMode(mode) };
            fixture.policies[key] = { ...start, inherited: false };
            const view = mountCollectionPage(level);
            await chooseCollectionValue(key);
            await waitFor(() => expect(fixture.writes).toHaveLength(1));
            expect(fixture.writes[0][key]).toMatchObject({ value, mode: start.mode });
            await chooseCollectionMode(key);
            await waitFor(() => expect(fixture.writes).toHaveLength(2));
            expect(fixture.writes[1][key]).toMatchObject({ value, mode });
            await waitFor(() => expect(policyButton(key)).toBeEnabled());
            expect(stateOf(key)).toEqual({ value, enforced: mode === 'ENFORCED' });
            expect(fixture.policies[liveDelivery].value).toBe(false);
            view.unmount();
            mountCollectionPage(level);
            await waitFor(() => expect(stateOf(key)).toEqual({ value, enforced: mode === 'ENFORCED' }));
            expect(fixture.writes).toHaveLength(2);
        },
    );

    it('turns the account cap OFF and ON without changing any child choice or delivery permission', async () => {
        const fixture = collectionServer(level);
        const initial = structuredClone(fixture.policies);
        const view = mountCollectionPage(level);
        await chooseCollectionValue(emailMaster);
        await waitFor(() => expect(fixture.writes).toHaveLength(1));
        expect(fixture.writes[0][emailMaster]).toMatchObject({ value: false, mode: 'SUGGESTED' });
        const user = userEvent.setup();
        await Promise.all(
            collectionFields.map(async (key) => {
                await waitFor(() => expect(policyButton(key)).toBeDisabled());
                // Neither the round button nor any lock of a capped row can write anything.
                await Promise.all(
                    within(document.querySelector<HTMLElement>(`[data-feature-policy="${key}"]`)!)
                        .getAllByRole('button')
                        .map((button) => user.click(button)),
                );
            }),
        );
        expect(fixture.writes).toHaveLength(1);
        await chooseCollectionValue(emailMaster);
        await waitFor(() => expect(fixture.writes).toHaveLength(2));
        expect(fixture.writes[1][emailMaster]).toMatchObject({ value: true, mode: 'SUGGESTED' });
        fixture.writes.forEach((write) => {
            [...collectionFields, liveDelivery].forEach((key) => expect(write[key]).toEqual(initial[key]));
        });
        view.unmount();
        mountCollectionPage(level);
        await waitFor(() => collectionFields.forEach((key) => expect(policyButton(key)).toBeEnabled()));
        expect(fixture.policies).toEqual(initial);
    });

    it('renders the server-normalized collection value and mode rather than the submitted edit', async () => {
        const fixture = collectionServer(level);
        const key = collectionFields[0];
        fixture.normalize = (policies) => ({ ...policies, [key]: { value: false, mode: 'ENFORCED', inherited: true } });
        const view = mountCollectionPage(level);
        // The stored value is "active / adjustable"; one click on the round button submits "inactive".
        await chooseCollectionValue(key);
        await waitFor(() => expect(currentCollectionRow(key).getByTestId('BlockIcon')).toBeVisible());
        expect(currentCollectionRow(key).getByTestId('LockIcon')).toBeVisible();
        expect(fixture.writes[0][key]).toMatchObject({ value: false, mode: 'SUGGESTED' });
        view.unmount();
        mountCollectionPage(level);
        await waitFor(() => expect(currentCollectionRow(key).getByTestId('BlockIcon')).toBeVisible());
        expect(currentCollectionRow(key).getByTestId('LockIcon')).toBeVisible();
        expect(fixture.policies[liveDelivery].value).toBe(false);
    });

    it('does not replay a failed collection edit in the next independent queued save', async () => {
        const fixture = collectionServer(level);
        fixture.failFirst = true;
        const first = collectionFields[0];
        const second = collectionFields[1];
        const view = mountCollectionPage(level);
        await chooseCollectionValue(first);
        await waitFor(() => expect(fixture.writes).toHaveLength(1));
        await chooseCollectionValue(second);
        expect(fixture.writes).toHaveLength(1);
        await act(async () => fixture.releaseFirst());
        await waitFor(() => expect(fixture.writes).toHaveLength(2));
        expect(fixture.writes[1][first]).toMatchObject({ value: true, mode: 'SUGGESTED' });
        // The round button only moves the value: the stored requirement of the second row stays.
        expect(fixture.writes[1][second]).toMatchObject({ value: false, mode: 'ENFORCED' });
        await waitFor(() => expect(policyButton(second)).toBeEnabled());
        view.unmount();
        mountCollectionPage(level);
        await waitFor(() => expect(currentCollectionRow(first).getByTestId('CheckIcon')).toBeVisible());
        expect(currentCollectionRow(second).getByTestId('BlockIcon')).toBeVisible();
        expect(fixture.policies[liveDelivery].value).toBe(false);
    });
});
