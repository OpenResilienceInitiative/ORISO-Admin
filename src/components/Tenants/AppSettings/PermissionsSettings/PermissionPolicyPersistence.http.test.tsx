import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';
import type { PolicyValue } from '../../../../types/permissionPolicy';

vi.mock('./CaseHandoverCard', () => ({ CaseHandoverCard: () => null }));

const field = 'featureVideoCallsOneOnOneChatsEnabled';
const states: Array<{ value: boolean; mode: 'ENFORCED' | 'SUGGESTED'; action: string }> = [
    { value: true, mode: 'ENFORCED', action: 'activationEnforced' },
    { value: false, mode: 'ENFORCED', action: 'deactivationEnforced' },
    { value: true, mode: 'SUGGESTED', action: 'activationSuggested' },
    { value: false, mode: 'SUGGESTED', action: 'deactivationSuggested' },
];

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
        'keeps $value / $mode selected after the save response and a fresh page mount',
        async ({ value, mode, action }) => {
            let policies: Record<string, PolicyValue<boolean>> = {
                [field]: { value: !value, mode: mode === 'ENFORCED' ? 'SUGGESTED' : 'ENFORCED', inherited: false },
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
            const view = mount();
            const user = userEvent.setup();
            await user.click((await control()).getByRole('button', { name: /open policy choices/i }));
            await user.click(screen.getByRole('button', { name: i18n.t(`tenants.permissions.policy.${action}`) }));

            await waitFor(() => expect(puts.at(-1)?.[field]).toMatchObject({ value, mode }));
            await waitFor(async () =>
                expect((await control()).getByRole('button', { name: /open policy choices/i })).toHaveAccessibleName(
                    `${i18n.t('tenants.permissions.feature.videoCalls')}: ${i18n.t(
                        'tenants.permissions.policy.openMenu',
                    )} – ${i18n.t(`tenants.permissions.policy.${action}`)}`,
                ),
            );
            view.unmount();
            mount();
            await waitFor(async () =>
                expect((await control()).getByRole('button', { name: /open policy choices/i })).toHaveAccessibleName(
                    `${i18n.t('tenants.permissions.feature.videoCalls')}: ${i18n.t(
                        'tenants.permissions.policy.openMenu',
                    )} – ${i18n.t(`tenants.permissions.policy.${action}`)}`,
                ),
            );
        },
    );
});
