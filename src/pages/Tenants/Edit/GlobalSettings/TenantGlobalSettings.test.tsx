import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import i18n from '../../../../i18n';

/**
 * ORISO-Admin#989 — `/admin/tenants/<id>/global-settings` edits THAT Träger. It shows the Träger's
 * stored feature values and saves to the Träger's own endpoints, never to the platform-wide
 * `/tenantadmin/controls`. The API is mocked at the request boundary (`fetchData`).
 */

type Request = { url: string; method: string; bodyData?: string; headersData?: Record<string, string> };

const mocks = vi.hoisted(() => ({
    routes: new Map<string, (request: Request) => unknown>(),
    requests: [] as Request[],
}));

vi.mock('../../../../api/fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../api/fetchData')>();
    return {
        ...actual,
        fetchData: vi.fn(async (request: Request) => {
            mocks.requests.push(request);
            const route = Array.from(mocks.routes.entries()).find(([key]) => {
                const [method, suffix] = key.split(' ');
                return request.method === method && request.url.split('?')[0].endsWith(suffix);
            });
            if (!route) throw new Error(`Unmocked request ${request.method} ${request.url}`);
            return route[1](request);
        }),
    };
});

// eslint-disable-next-line import/first
import { TenantGlobalSettings } from './index';

const CONVERSATION_CIRCLE = 'featureSelfHelpGroupsEnabled';
const GROUP_VIDEO = 'featureVideoCallsGroupChatsEnabled';

const renderPage = (id = '7') =>
    rtlRender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter initialEntries={[`/admin/tenants/${id}/global-settings`]}>
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
    it('shows conversation circles as off for a Träger that has them off', async () => {
        serve({
            traegerSettings: { [CONVERSATION_CIRCLE]: false },
            policies: { [CONVERSATION_CIRCLE]: policy(false) },
        });
        renderPage();

        const control = await findRow(CONVERSATION_CIRCLE);
        expect(within(control).getByTestId('BlockIcon')).toBeInTheDocument();
        expect(requestsTo('/service/tenantadmin/controls')).toHaveLength(0);
    });

    it('shows conversation circles as on after the Träger switched them on', async () => {
        serve({
            traegerSettings: { [CONVERSATION_CIRCLE]: true },
            policies: { [CONVERSATION_CIRCLE]: policy(true) },
        });
        renderPage();

        const control = await findRow(CONVERSATION_CIRCLE);
        expect(within(control).getByTestId('CheckIcon')).toBeInTheDocument();
    });

    it("saves to the Träger's own policies, never to the platform-wide controls", async () => {
        serve({
            traegerSettings: { [CONVERSATION_CIRCLE]: true },
            policies: { [CONVERSATION_CIRCLE]: policy(true) },
        });
        renderPage();
        const user = userEvent.setup();

        const control = await findRow(CONVERSATION_CIRCLE);
        await user.click(within(control).getByRole('button', { name: /: Active – Deactivate$/ }));

        await waitFor(() => expect(requestsTo('/service/tenantadmin/7/permission-policies')).toHaveLength(2));
        const put = requestsTo('/service/tenantadmin/7/permission-policies').at(-1) as Request;
        expect(put.method).toBe('PUT');
        expect(JSON.parse(put.bodyData ?? '{}')).toMatchObject({
            tenantId: 7,
            policies: { [CONVERSATION_CIRCLE]: policy(false) },
        });
        expect(requestsTo('/service/tenantadmin/controls')).toHaveLength(0);
    });

    it('takes an unset Träger field from the platform preset instead of a blanket "on"', async () => {
        // The Träger never stored a conversation-circle value; the platform preset has conversation
        // circles off. The card master must follow the preset, so its sub-features are disabled.
        serve({ traegerSettings: {}, policies: { [CONVERSATION_CIRCLE]: policy(false) } });
        renderPage();

        const control = await findRow(GROUP_VIDEO);
        // Only the round button states the value; the dependent feature has no lock while its card is off.
        expect(within(control).getByRole('button', { name: /: (Active|Inactive)$/ })).toBeDisabled();
        expect(within(control).getByText(/Available only while the card is activated/i)).toBeInTheDocument();
    });
});

describe('Same tiles as the platform page (ORISO-Admin#1577)', () => {
    it('shows the Live Chat tile, with the chat links of this Träger on it', async () => {
        serve({ traegerSettings: {} });
        mocks.routes.set('GET /service/useradmin/invitelinks/topics', () => []);
        mocks.routes.set('GET /service/useradmin/invitelinks', () => ({ content: [], totalElements: 0 }));
        renderPage();

        const tile = await screen.findByTestId('chat-type-card-liveChat');
        expect(await within(tile).findByRole('region', { name: 'Live chat links' })).toBeInTheDocument();
        // The links live on the tile only, not in a card of their own above the tiles.
        expect(screen.getAllByRole('region', { name: 'Live chat links' })).toHaveLength(1);
        expect(await findRow('featureAnonymousChatEnabled')).toBeInTheDocument();
    });

    it('says in the page intro that the changes apply to this Träger only', async () => {
        serve({ traegerSettings: {} });
        renderPage();

        const intro = await screen.findByTestId('permissions-intro');
        expect(within(intro).getByText(i18n.t('tenants.globalSettings.superAdminWarning.description'))).toBeVisible();
    });
});

describe('Settings that moved here from the former Funktionalitäten tab (ORISO-Admin#1577)', () => {
    const VIDEO = 'featureVideoCallsOneOnOneChatsEnabled';
    // Only Mail Beratung video is on, so switching it off leaves no conversation type with calls.
    const lastCallOn = {
        featureCallsEnabled: policy(true),
        [VIDEO]: policy(true),
        featureAudioCallsOneOnOneChatsEnabled: policy(false),
        featureVideoCallsAnonymousChatsEnabled: policy(false),
        featureAudioCallsAnonymousChatsEnabled: policy(false),
        featureVideoCallsGroupChatsEnabled: policy(false),
        featureAudioCallsGroupChatsEnabled: policy(false),
    };
    const tenantPuts = () => requestsTo('/service/tenantadmin/7').filter(({ method }) => method === 'PUT');

    it('switches the Träger call permission off after the last call switch was saved off', async () => {
        serve({ traegerSettings: { extendedSettings: { isVideoCallAllowed: true } }, policies: lastCallOn });
        mocks.routes.set('PUT /service/tenantadmin/7', () => ({}));
        const user = userEvent.setup();
        renderPage();

        await user.click(within(await findRow(VIDEO)).getByRole('button', { name: /: Active – Deactivate$/ }));

        await waitFor(() => expect(tenantPuts()).toHaveLength(1));
        const policyPut = mocks.requests.findIndex(
            (request) => request.method === 'PUT' && request.url.endsWith('/permission-policies'),
        );
        // The tile is saved first; the call permission follows it.
        expect(policyPut).toBeGreaterThan(-1);
        expect(mocks.requests.indexOf(tenantPuts()[0])).toBeGreaterThan(policyPut);
        expect(JSON.parse(tenantPuts()[0].bodyData ?? '{}').settings.extendedSettings).toMatchObject({
            isVideoCallAllowed: false,
        });
    });

    it('leaves the call permission alone when the tile could not be saved', async () => {
        serve({ traegerSettings: { extendedSettings: { isVideoCallAllowed: true } }, policies: lastCallOn });
        mocks.routes.set('PUT /service/tenantadmin/7/permission-policies', () => {
            throw new Error('FORBIDDEN');
        });
        mocks.routes.set('PUT /service/tenantadmin/7', () => ({}));
        const user = userEvent.setup();
        renderPage();

        await user.click(within(await findRow(VIDEO)).getByRole('button', { name: /: Active – Deactivate$/ }));

        await waitFor(() =>
            expect(
                requestsTo('/service/tenantadmin/7/permission-policies').filter(({ method }) => method === 'PUT'),
            ).toHaveLength(1),
        );
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        expect(tenantPuts()).toHaveLength(0);
    });

    it('does not write the call permission when it already matches', async () => {
        serve({ traegerSettings: { extendedSettings: { isVideoCallAllowed: false } }, policies: lastCallOn });
        mocks.routes.set('PUT /service/tenantadmin/7', () => ({}));
        const user = userEvent.setup();
        renderPage();

        await user.click(within(await findRow(VIDEO)).getByRole('button', { name: /: Active – Deactivate$/ }));

        await waitFor(() =>
            expect(
                requestsTo('/service/tenantadmin/7/permission-policies').filter(({ method }) => method === 'PUT'),
            ).toHaveLength(1),
        );
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        expect(tenantPuts()).toHaveLength(0);
    });

    // ORISO-Frontend#2491: the Team-Chat is a permission policy like supervision, never a raw setting.
    it('saves the Team-Chat tile as a Träger policy (ORISO-Frontend#2491)', async () => {
        serve({
            traegerSettings: { featureTeamDiscussionEnabled: true },
            policies: { featureTeamDiscussionEnabled: policy(true) },
        });
        mocks.routes.set('PUT /service/tenantadmin/7', () => ({}));
        const user = userEvent.setup();
        renderPage();

        const tile = await screen.findByTestId('team-chat-tile');
        const teamChat = await waitFor(() => {
            const control = tile.querySelector<HTMLElement>('[data-feature-policy="featureTeamDiscussionEnabled"]');
            expect(control).not.toBeNull();
            return control as HTMLElement;
        });
        await user.click(within(teamChat).getByRole('button', { name: /: Active – Deactivate$/ }));

        const puts = () =>
            requestsTo('/service/tenantadmin/7/permission-policies').filter(({ method }) => method === 'PUT');
        await waitFor(() => expect(puts()).toHaveLength(1));
        expect(JSON.parse(puts()[0].bodyData ?? '{}')).toMatchObject({
            tenantId: 7,
            policies: { featureTeamDiscussionEnabled: policy(false) },
        });
        expect(tenantPuts()).toHaveLength(0);
    });
});

describe('Live-chat links for the selected Träger (ORISO-Admin#1321)', () => {
    it.each(['abc', '0'])('does not mount or request live-chat links for invalid tenant ID %s', (id) => {
        renderPage(id);

        expect(screen.queryByRole('region', { name: 'Live chat links' })).not.toBeInTheDocument();
        expect(
            mocks.requests.filter(({ url }) => /\/service\/useradmin\/invitelinks(?:[/?]|$)/.test(url)),
        ).toHaveLength(0);
    });

    it('uses the selected Träger for both topics and live-chat links', async () => {
        serve({ traegerSettings: {} });
        mocks.routes.set('GET /service/useradmin/invitelinks/topics', () => [
            { id: 5, name: 'Träger Süd topic', status: 'ACTIVE' },
        ]);
        mocks.routes.set('GET /service/useradmin/invitelinks', () => ({ content: [], totalElements: 0 }));
        const user = userEvent.setup();
        renderPage();

        const manager = within(await screen.findByRole('region', { name: 'Live chat links' }));
        await user.click(manager.getByRole('combobox'));
        expect(await screen.findByTitle('Träger Süd topic')).toBeInTheDocument();
        expect(requestsTo('/service/useradmin/invitelinks/topics')).toEqual([
            expect.objectContaining({ headersData: { 'X-Tenant-Id': '7' } }),
        ]);
        expect(mocks.requests).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    url: expect.stringContaining('/service/useradmin/invitelinks?'),
                    headersData: { 'X-Tenant-Id': '7' },
                }),
            ]),
        );
    });
});
