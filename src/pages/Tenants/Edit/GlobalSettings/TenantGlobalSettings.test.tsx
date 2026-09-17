import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';

/**
 * ORISO-Admin#989 — `/admin/tenants/<id>/global-settings` edits THAT Träger. It shows the Träger's
 * stored feature values and saves to the Träger's own endpoints, never to the platform-wide
 * `/tenantadmin/controls`. The API is mocked at the request boundary (`fetchData`).
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

// eslint-disable-next-line import/first
import { TenantGlobalSettings } from './index';

const GROUP = 'featureGroupChatV2Enabled';
const GROUP_VIDEO = 'featureVideoCallsGroupChatsEnabled';

const renderPage = () =>
    rtlRender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter initialEntries={['/admin/tenants/7/global-settings']}>
                <Routes>
                    <Route path="/admin/tenants/:id/global-settings" element={<TenantGlobalSettings />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );

const row = (field: string) => document.querySelector(`[data-feature-policy="${field}"]`) as HTMLElement | null;

const findRow = async (field: string) => {
    await waitFor(() => expect(row(field)).not.toBeNull());
    return row(field) as HTMLElement;
};

const policy = (value: boolean, mode: 'SUGGESTED' | 'ENFORCED' = 'SUGGESTED') => ({ value, mode });

const serve = ({
    traegerSettings,
    policies = {},
}: {
    traegerSettings: Record<string, unknown>;
    policies?: Record<string, { value: boolean; mode: 'SUGGESTED' | 'ENFORCED' }>;
}) => {
    mocks.routes.set('GET /service/tenantadmin/7', () => ({ id: 7, name: 'Träger Süd', settings: traegerSettings }));
    mocks.routes.set('GET /service/tenantadmin/7/permission-policies', () => ({ tenantId: 7, policies }));
    mocks.routes.set('PUT /service/tenantadmin/7/permission-policies', ({ bodyData }) => JSON.parse(bodyData ?? '{}'));
    mocks.routes.set('GET /case-handover/reason-policies', () => []);
};

const requestsTo = (suffix: string) => mocks.requests.filter((request) => request.url.endsWith(suffix));

beforeAll(async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    await i18n.changeLanguage('en');
});

beforeEach(() => {
    mocks.routes.clear();
    mocks.requests.length = 0;
});

describe('Platform admin on /admin/tenants/<id>/global-settings (ORISO-Admin#989)', () => {
    it('shows group chats as off for a Träger that has them off', async () => {
        serve({ traegerSettings: { [GROUP]: false }, policies: { [GROUP]: policy(false) } });
        renderPage();

        const control = await findRow(GROUP);
        expect(within(control).getByTestId('BlockIcon')).toBeInTheDocument();
        expect(requestsTo('/service/tenantadmin/controls')).toHaveLength(0);
    });

    it('shows group chats as on after the Träger switched them on', async () => {
        serve({ traegerSettings: { [GROUP]: true }, policies: { [GROUP]: policy(true) } });
        renderPage();

        const control = await findRow(GROUP);
        expect(within(control).getByTestId('CheckIcon')).toBeInTheDocument();
    });

    it("saves to the Träger's own policies, never to the platform-wide controls", async () => {
        serve({ traegerSettings: { [GROUP]: true }, policies: { [GROUP]: policy(true) } });
        renderPage();
        const user = userEvent.setup();

        const control = await findRow(GROUP);
        await user.click(within(control).getByRole('button', { name: /Open policy choices/i }));
        await user.click(within(control).getByRole('button', { name: /Deactivation \(adjustable\)/i }));

        await waitFor(() => expect(requestsTo('/service/tenantadmin/7/permission-policies')).toHaveLength(2));
        const put = requestsTo('/service/tenantadmin/7/permission-policies').at(-1) as Request;
        expect(put.method).toBe('PUT');
        expect(JSON.parse(put.bodyData ?? '{}')).toMatchObject({ tenantId: 7, policies: { [GROUP]: policy(false) } });
        expect(requestsTo('/service/tenantadmin/controls')).toHaveLength(0);
    });

    it('takes an unset Träger field from the platform preset instead of a blanket "on"', async () => {
        // The Träger never stored a group chat value; the platform preset has group chats off. The
        // card master must follow the preset, so its sub-features are disabled — not the old all-on.
        serve({ traegerSettings: {}, policies: { [GROUP]: policy(false) } });
        renderPage();

        const control = await findRow(GROUP_VIDEO);
        expect(within(control).getByRole('button', { name: /Open policy choices/i })).toBeDisabled();
        expect(within(control).getByText(/Available only while the card is activated/i)).toBeInTheDocument();
    });
});
