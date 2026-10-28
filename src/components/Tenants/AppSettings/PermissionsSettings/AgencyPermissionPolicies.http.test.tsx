import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import { AgencyPermissionsSettings } from './AgencyPermissionsSettings';

vi.mock('./CaseHandoverCard', () => ({ CaseHandoverCard: () => null }));

const field = 'featureVideoCallsOneOnOneChatsEnabled';

beforeAll(async () => {
    await i18n.changeLanguage('en');
});
beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

describe('agency resolved permission policies at the HTTP boundary', () => {
    it.each([false, true])(
        'shows inherited enforced %s as locked despite an opposite dormant override',
        async (value) => {
            const parent = { value, mode: 'ENFORCED', inherited: true };
            vi.stubGlobal(
                'fetch',
                vi.fn(async (request: Request) => {
                    const { pathname } = new URL(request.url);
                    if (pathname.endsWith('/agencyadmin/agencies/55')) {
                        return Response.json({
                            _embedded: {
                                id: '55',
                                tenantId: 7,
                                name: 'Synthetic policy test centre',
                                settings: {
                                    [field]: !value,
                                    permissionPolicies: { [field]: parent },
                                },
                            },
                        });
                    }
                    return Response.json({ tenantId: 7, policies: { [field]: parent } });
                }),
            );
            render(
                <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                    <AgencyPermissionsSettings agencyId="55" />
                </QueryClientProvider>,
            );

            const card = await screen.findByTestId('chat-type-card-oneOnOne');
            const control = card.querySelector<HTMLElement>(`[data-feature-policy="${field}"]`)!;
            expect(within(control).getByRole('button', { name: /more information/i })).toBeInTheDocument();
            expect(within(control).queryByRole('button', { name: /open policy choices/i })).not.toBeInTheDocument();
            expect(within(control).getByTestId(value ? 'CheckIcon' : 'BlockIcon')).toBeInTheDocument();
        },
    );

    it('shows tenant-owned account settings without offering or sending an agency override', async () => {
        const puts = vi.fn();
        const accountPolicies = {
            featureDisplayNameEditable: { value: false, mode: 'SUGGESTED', inherited: true },
            featureAskerEmailEnabled: { value: true, mode: 'SUGGESTED', inherited: true },
        };
        vi.stubGlobal(
            'fetch',
            vi.fn(async (request: Request) => {
                if (request.method === 'PUT') puts();
                if (new URL(request.url).pathname.endsWith('/agencyadmin/agencies/55')) {
                    return Response.json({
                        _embedded: {
                            id: '55',
                            tenantId: 7,
                            name: 'Synthetic policy centre',
                            settings: { permissionPolicies: accountPolicies },
                        },
                    });
                }
                return Response.json({ tenantId: 7, policies: accountPolicies });
            }),
        );
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <AgencyPermissionsSettings agencyId="55" />
            </QueryClientProvider>,
        );
        const user = userEvent.setup();
        await Promise.all(
            [
                ['featureDisplayNameEditable', 'deactivationSuggested', 'BlockIcon'],
                ['featureAskerEmailEnabled', 'activationSuggested', 'CheckIcon'],
            ].map(async ([key, action, icon]) => {
                await waitFor(() => expect(document.querySelector(`[data-feature-policy="${key}"]`)).not.toBeNull());
                const row = within(document.querySelector<HTMLElement>(`[data-feature-policy="${key}"]`)!);
                const button = row.getByRole('button', { name: /open policy choices/i });
                expect(button).toBeDisabled();
                expect(button.getAttribute('aria-label')).toContain(i18n.t(`tenants.permissions.policy.${action}`));
                expect(row.getByTestId(icon)).toBeInTheDocument();
                expect(
                    row.getByText(i18n.t('tenants.permissions.card.notifications.setOnTraeger')),
                ).toBeInTheDocument();
                await user.click(button);
            }),
        );
        expect(puts).not.toHaveBeenCalled();
        expect(
            screen.queryByRole('button', { name: i18n.t('tenants.permissions.policy.activationSuggested') }),
        ).not.toBeInTheDocument();
    });

    it('rolls back a failed feature without replaying it in the next queued save, then reloads confirmed values', async () => {
        const sibling = 'featureVoiceMessagesOneOnOneChatsEnabled';
        const stored = { [field]: true, [sibling]: true };
        const writes: Array<Record<string, boolean>> = [];
        let failFirst: () => void = () => undefined;
        const snapshot = () => ({
            id: '55',
            tenantId: 7,
            name: 'Synthetic policy centre',
            consultingType: '4',
            teamAgency: false,
            settings: {
                ...stored,
                permissionPolicies: Object.fromEntries(
                    Object.entries(stored).map(([key, value]) => [key, { value, mode: 'SUGGESTED', inherited: false }]),
                ),
            },
        });
        vi.stubGlobal(
            'fetch',
            vi.fn(async (request: Request) => {
                if (new URL(request.url).pathname.endsWith('/agencyadmin/agencies/55')) {
                    if (request.method === 'PUT') {
                        const body: { settings: Record<string, boolean> } = await request.json();
                        writes.push(body.settings);
                        if (writes.length === 1)
                            return new Promise<Response>((resolve) => {
                                failFirst = () => resolve(Response.json({}, { status: 503 }));
                            });
                        stored[field] = body.settings[field];
                        stored[sibling] = body.settings[sibling];
                    }
                    return Response.json({ _embedded: snapshot() });
                }
                return Response.json({ tenantId: 7, policies: {} });
            }),
        );
        const mount = () =>
            render(
                <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                    <AgencyPermissionsSettings agencyId="55" />
                </QueryClientProvider>,
            );
        const view = mount();
        const user = userEvent.setup();
        const trigger = async (key: string) => {
            const card = await screen.findByTestId('chat-type-card-oneOnOne');
            const row = card.querySelector<HTMLElement>(`[data-feature-policy="${key}"]`);
            if (!row) throw new Error('Permission row missing');
            return within(row).getByRole('button', { name: /open policy choices/i });
        };
        const switchOff = async (key: string) => {
            await user.click(await trigger(key));
            expect(
                screen.queryByRole('button', { name: i18n.t('tenants.permissions.policy.deactivationEnforced') }),
            ).not.toBeInTheDocument();
            await user.click(
                screen.getByRole('button', { name: i18n.t('tenants.permissions.policy.deactivationSuggested') }),
            );
        };

        await switchOff(field);
        await waitFor(() => expect(writes).toHaveLength(1));
        await switchOff(sibling);
        expect(await trigger(field)).toBeDisabled();
        expect(await trigger(sibling)).toBeDisabled();
        await act(async () => {
            failFirst();
        });
        await waitFor(() => expect(writes).toHaveLength(2));
        expect(writes[1][field]).toBe(true);
        expect(writes[1][sibling]).toBe(false);
        expect(writes[1]).not.toHaveProperty('permissionPolicies');
        expect(writes[1]).not.toHaveProperty('agencyAdminControls');
        await waitFor(async () => expect(await trigger(sibling)).toBeEnabled());
        view.unmount();
        mount();
        await waitFor(async () => {
            expect((await trigger(field)).getAttribute('aria-label')).toContain(
                i18n.t('tenants.permissions.policy.activationSuggested'),
            );
            expect((await trigger(sibling)).getAttribute('aria-label')).toContain(
                i18n.t('tenants.permissions.policy.deactivationSuggested'),
            );
        });
    });
});
