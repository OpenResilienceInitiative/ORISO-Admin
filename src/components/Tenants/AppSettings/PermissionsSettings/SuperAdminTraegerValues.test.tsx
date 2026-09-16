import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';

/**
 * ORISO-Admin#989 — on /admin/tenants/<id>/global-settings the platform admin sees whether a feature is
 * *allowed* (platform preset) and, separately, what the Träger actually has switched on. The API is
 * mocked at the request boundary (`fetchData`).
 */

type Request = { url: string; method: string; bodyData?: string };

const mocks = vi.hoisted(() => ({
    routes: new Map<string, (request: { url: string; method: string; bodyData?: string }) => unknown>(),
    requests: [] as Array<{ url: string; method: string; bodyData?: string }>,
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

const render = (ui: ReactElement) =>
    rtlRender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            {ui}
        </QueryClientProvider>,
    );

const GROUP = 'featureGroupChatV2Enabled';

const findRow = async (field: string) => {
    let control: HTMLElement | null = null;
    await waitFor(() => {
        control = document.querySelector(`[data-feature-policy="${field}"]`);
        expect(control).not.toBeNull();
    });
    return control as unknown as HTMLElement;
};

const serve = ({
    controls,
    traegerSettings,
}: {
    controls: Record<string, unknown>;
    traegerSettings: Record<string, unknown>;
}) => {
    mocks.routes.set('GET /service/tenantadmin/controls', () => controls);
    mocks.routes.set('GET /service/tenantadmin/7', () => ({ id: 7, name: 'Träger Süd', settings: traegerSettings }));
    mocks.routes.set('GET /case-handover/reason-policies', () => []);
};

beforeAll(async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    await i18n.changeLanguage('en');
});

beforeEach(() => {
    mocks.routes.clear();
    mocks.requests.length = 0;
});

describe('Platform global settings of a Träger (ORISO-Admin#989)', () => {
    it('shows group chats as allowed but switched off when the Träger has them off', async () => {
        serve({
            controls: { permissionsPageEnabled: true, allowedPermissionToggles: null },
            traegerSettings: { [GROUP]: false },
        });
        render(<SuperAdminPermissionsSettings tenantId="7" showTraegerValues />);

        const row = await findRow(GROUP);
        await waitFor(() => expect(within(row).getByText(/Allowed, but switched off for this Träger/i)).toBeVisible());
        // The permission itself still reads "allowed".
        expect(within(row).getByTestId('CheckIcon')).toBeInTheDocument();
    });

    it('shows the Träger value as on when the Träger has the feature on', async () => {
        serve({
            controls: { permissionsPageEnabled: true, allowedPermissionToggles: null },
            traegerSettings: { [GROUP]: true },
        });
        render(<SuperAdminPermissionsSettings tenantId="7" showTraegerValues />);

        const row = await findRow(GROUP);
        await waitFor(() => expect(within(row).getByText(/This Träger: on/i)).toBeVisible());
    });

    it('derives the form values from the platform preset instead of an all-on default', async () => {
        serve({
            controls: {
                permissionsPageEnabled: true,
                allowedPermissionToggles: null,
                permissionPolicies: { [GROUP]: { value: false, mode: 'SUGGESTED' } },
            },
            traegerSettings: { [GROUP]: false, featureVideoCallsGroupChatsEnabled: true },
        });
        render(<SuperAdminPermissionsSettings tenantId="7" showTraegerValues />);

        // The preset switches group chats off, so the group sub-features depend on a master that is off.
        const master = await findRow(GROUP);
        expect(within(master).getByTestId('BlockIcon')).toBeInTheDocument();
        const video = await findRow('featureVideoCallsGroupChatsEnabled');
        expect(within(video).getByRole('button', { name: /Open policy choices/i })).toBeDisabled();
        await waitFor(() => expect(within(video).getByText(/This Träger: on/i)).toBeVisible());
    });

    it('leaves the platform settings page (no Träger) without Träger values', async () => {
        serve({
            controls: { permissionsPageEnabled: true, allowedPermissionToggles: null },
            traegerSettings: { [GROUP]: false },
        });
        render(<SuperAdminPermissionsSettings tenantId="7" />);

        const row = await findRow(GROUP);
        expect(within(row).queryByText(/Träger/i)).toBeNull();
        expect(mocks.requests.some((request) => request.url.endsWith('/service/tenantadmin/7'))).toBe(false);
    });
});
