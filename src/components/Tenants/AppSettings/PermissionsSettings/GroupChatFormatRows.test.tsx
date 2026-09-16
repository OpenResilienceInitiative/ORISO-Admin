import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';

/**
 * ORISO-Admin#988 — "Internal group chats" and "Conversation circles" are two separately switchable
 * rows on the Functionality access page, identical on platform, Träger and Beratungsstelle level.
 *
 * Reads and writes are mocked at the request boundary (`fetchData`); the agency write goes through
 * `useAgencyUpdate`, whose PUT fans out into several agency endpoints, so it is captured there.
 */

const INTERNAL = 'featureInternalGroupChatEnabled';
const CIRCLES = 'featureSelfHelpGroupsEnabled';

type Request = { url: string; method: string; bodyData?: string };

const mocks = vi.hoisted(() => ({
    routes: new Map<string, (request: { url: string; method: string; bodyData?: string }) => unknown>(),
    requests: [] as Array<{ url: string; method: string; bodyData?: string }>,
    agencyMutate: vi.fn(),
}));

vi.mock('../../../../api/fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../api/fetchData')>();
    return {
        ...actual,
        fetchData: vi.fn(async (request: Request) => {
            mocks.requests.push(request);
            const route = Array.from(mocks.routes.entries()).find(([key]) => {
                const [method, suffix] = key.split(' ');
                return request.method === method && request.url.endsWith(suffix);
            });
            if (!route) throw new Error(`Unmocked request ${request.method} ${request.url}`);
            return route[1](request);
        }),
    };
});
vi.mock('../../../../hooks/useAgencyUpdate', () => ({
    useAgencyUpdate: () => ({ mutate: mocks.agencyMutate }),
}));

// eslint-disable-next-line import/first
import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';
// eslint-disable-next-line import/first
import { TenantPermissionsSettings } from './TenantPermissionsSettings';
// eslint-disable-next-line import/first
import { AgencyPermissionsSettings } from './AgencyPermissionsSettings';

const render = (ui: ReactElement) =>
    rtlRender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {ui}
        </QueryClientProvider>,
    );

const row = (field: string) => document.querySelector(`[data-feature-policy="${field}"]`) as HTMLElement | null;

const findRow = async (field: string) => {
    await waitFor(() => expect(row(field)).not.toBeNull());
    return row(field) as HTMLElement;
};

const switchOff = async (field: string) => {
    const user = userEvent.setup();
    const control = await findRow(field);
    await user.click(within(control).getByRole('button', { name: /Open policy choices/i }));
    await user.click(within(control).getByRole('button', { name: /Deactivation \(adjustable\)/i }));
};

const lastBody = (method: string, suffix: string) => {
    const match = mocks.requests.filter((request) => request.method === method && request.url.endsWith(suffix)).at(-1);
    return match?.bodyData ? JSON.parse(match.bodyData) : undefined;
};

const expectBothRowsInOneCard = async () => {
    const internal = await findRow(INTERNAL);
    const circles = await findRow(CIRCLES);
    expect(within(internal).getByText('Internal group chats')).toBeInTheDocument();
    expect(within(circles).getByText('Conversation circles')).toBeInTheDocument();
    // Same card, same control markup: both rows are PermissionPolicyControls under one card.
    expect(internal.closest('[data-testid="chat-type-card-group"]')).not.toBeNull();
    expect(internal.closest('[data-testid="chat-type-card-group"]')).toBe(
        circles.closest('[data-testid="chat-type-card-group"]'),
    );
    expect(internal.className).toBe(circles.className);
};

const expectReadOnly = (field: string) => {
    const control = row(field) as HTMLElement;
    expect(control).not.toBeNull();
    expect(within(control).queryByRole('button', { name: /Open policy choices/i })).toBeNull();
    expect(within(control).getByRole('button', { name: /More information/i })).toBeInTheDocument();
    expect(within(control).getByTestId('BlockIcon')).toBeInTheDocument();
};

beforeAll(async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    await i18n.changeLanguage('en');
});

beforeEach(() => {
    mocks.routes.clear();
    mocks.requests.length = 0;
    mocks.agencyMutate.mockReset();
    mocks.routes.set('GET /case-handover/reason-policies', () => []);
});

afterEach(() => vi.clearAllTimers());

describe('Group chat format rows — platform level (ORISO-Admin#988)', () => {
    const controls = {
        permissionsPageEnabled: true,
        allowedPermissionToggles: { groupChat: true },
        permissionPolicies: {
            featureGroupChatV2Enabled: { value: true, mode: 'SUGGESTED' },
            [INTERNAL]: { value: true, mode: 'SUGGESTED' },
            [CIRCLES]: { value: true, mode: 'SUGGESTED' },
        },
    };

    beforeEach(() => {
        mocks.routes.set('GET /service/tenantadmin/controls', () => controls);
        mocks.routes.set('PUT /service/tenantadmin/controls', ({ bodyData }) => JSON.parse(bodyData ?? '{}'));
        mocks.routes.set('GET /service/tenantadmin/7', () => ({ id: 7, settings: {} }));
    });

    it('shows both rows in the group chat card', async () => {
        render(<SuperAdminPermissionsSettings tenantId="7" />);
        await expectBothRowsInOneCard();
    });

    it('saves a switched row without touching the other format', async () => {
        render(<SuperAdminPermissionsSettings tenantId="7" />);
        await switchOff(CIRCLES);

        await waitFor(() => expect(lastBody('PUT', '/service/tenantadmin/controls')).toBeDefined());
        const { permissionPolicies } = lastBody('PUT', '/service/tenantadmin/controls');
        expect(permissionPolicies[CIRCLES]).toEqual({ value: false, mode: 'SUGGESTED' });
        expect(permissionPolicies[INTERNAL]).toEqual(controls.permissionPolicies[INTERNAL]);
        expect(permissionPolicies.featureGroupChatV2Enabled).toEqual(
            controls.permissionPolicies.featureGroupChatV2Enabled,
        );
    });
});

describe('Group chat format rows — Träger level (ORISO-Admin#988)', () => {
    const policies = (overrides: Record<string, unknown> = {}) => ({
        tenantId: 7,
        policies: {
            featureGroupChatV2Enabled: { value: true, mode: 'SUGGESTED' },
            [INTERNAL]: { value: true, mode: 'SUGGESTED' },
            [CIRCLES]: { value: true, mode: 'SUGGESTED' },
            ...overrides,
        },
    });

    const serve = (tenantSettings: Record<string, unknown>, policyData = policies()) => {
        mocks.routes.set('GET /service/tenantadmin/7', () => ({ id: 7, settings: tenantSettings }));
        mocks.routes.set('GET /service/tenantadmin/7/permission-policies', () => policyData);
        mocks.routes.set('PUT /service/tenantadmin/7/permission-policies', ({ bodyData }) =>
            JSON.parse(bodyData ?? '{}'),
        );
    };

    it('shows both rows in the group chat card', async () => {
        serve({ featureGroupChatV2Enabled: true });
        render(<TenantPermissionsSettings tenantId="7" />);
        await expectBothRowsInOneCard();
    });

    it('saves a switched row without touching the other format', async () => {
        serve({ featureGroupChatV2Enabled: true });
        render(<TenantPermissionsSettings tenantId="7" />);
        await switchOff(INTERNAL);

        await waitFor(() => expect(lastBody('PUT', '/7/permission-policies')).toBeDefined());
        const body = lastBody('PUT', '/7/permission-policies');
        expect(body.policies[INTERNAL]).toEqual({ value: false, mode: 'SUGGESTED' });
        expect(body.policies[CIRCLES]).toEqual({ value: true, mode: 'SUGGESTED' });
    });

    it('shows a format the platform forced off as disabled, not hidden', async () => {
        serve(
            { featureGroupChatV2Enabled: true },
            policies({ [CIRCLES]: { value: false, mode: 'ENFORCED', inherited: true } }),
        );
        render(<TenantPermissionsSettings tenantId="7" />);

        await findRow(CIRCLES);
        expectReadOnly(CIRCLES);
        expect(
            within(row(INTERNAL) as HTMLElement).getByRole('button', { name: /Open policy choices/i }),
        ).toBeEnabled();
    });

    it('falls back to the group chat value while a format has never been stored', async () => {
        serve({ featureGroupChatV2Enabled: false }, { tenantId: 7, policies: {} } as unknown as ReturnType<
            typeof policies
        >);
        render(<TenantPermissionsSettings tenantId="7" />);

        const internal = await findRow(INTERNAL);
        expect(within(internal).getByTestId('BlockIcon')).toBeInTheDocument();
    });
});

describe('Group chat format rows — Beratungsstelle level (ORISO-Admin#988)', () => {
    const serve = (settings: Record<string, unknown>) => {
        mocks.routes.set('GET /agencies/55', () => ({
            _embedded: { id: '55', name: 'Beratungsstelle Nord', tenantId: 2, settings },
        }));
    };

    it('shows both rows in the group chat card', async () => {
        serve({ featureGroupChatV2Enabled: true });
        render(<AgencyPermissionsSettings agencyId="55" />);
        await expectBothRowsInOneCard();
    });

    it('saves a switched row without touching the other format', async () => {
        serve({ featureGroupChatV2Enabled: true, [INTERNAL]: true, [CIRCLES]: true });
        render(<AgencyPermissionsSettings agencyId="55" />);
        await switchOff(CIRCLES);

        expect(mocks.agencyMutate).toHaveBeenCalledTimes(1);
        const payload = mocks.agencyMutate.mock.calls[0][0] as { settings: Record<string, unknown> };
        expect(payload.settings[CIRCLES]).toBe(false);
        expect(payload.settings[INTERNAL]).toBe(true);
        expect(payload.settings.featureGroupChatV2Enabled).toBe(true);
    });

    it('shows both formats disabled when the Träger forced group chats off', async () => {
        serve({
            featureGroupChatV2Enabled: true,
            [INTERNAL]: true,
            [CIRCLES]: true,
            agencyAdminControls: { allowedPermissionToggles: { groupChat: false } },
        });
        render(<AgencyPermissionsSettings agencyId="55" />);

        await findRow(INTERNAL);
        expectReadOnly(INTERNAL);
        expectReadOnly(CIRCLES);
    });
});
