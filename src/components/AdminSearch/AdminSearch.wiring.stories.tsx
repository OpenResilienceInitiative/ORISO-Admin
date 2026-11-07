import { useEffect, type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Layout } from 'antd';
import { http, HttpResponse } from 'msw';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { getSessionAccessToken, getSessionRefreshToken, setSessionTokens } from '../../api/auth/tokenSessionStore';
import {
    agencyAdminsSearchEndpoint,
    agencyEndpointBase,
    tenantAdminEndpoint,
    tenantAdminsSearchEndpoint,
    topicAdminEndpoint,
    usersConsultantsSearchEndpoint,
} from '../../appConfig';
import i18n from '../../i18n';
import { Card } from '../Card';
import { AdminSidebar } from '../Layout/AdminSidebar';
import { useAdminNavigation } from '../Layout/useAdminNavigation';
import layoutStyles from '../Layout/styles.module.scss';
import { AdminSearchButton } from './AdminSearchButton';
import { AdminSearchProvider } from './AdminSearchProvider';

/**
 * The search as the app wires it: the real provider, the real index builders, the real permission
 * hooks (fed by a fixture token), the real sidebar and the real top bar. Only the server is
 * replaced by story handlers. What the other stories show piece by piece happens here together:
 * Ctrl/Cmd+K and "/" open the search, a result navigates, the tile it names scrolls into view and
 * is highlighted.
 */

const claimsFor = (roles: string[], tenantId: number) => ({
    tenantId,
    exp: Math.floor(Date.now() / 1000) + 3600,
    realm_access: { roles },
});

/** An unsigned fixture token: the hooks only read the claims. */
const tokenFor = (roles: string[], tenantId: number) =>
    `${btoa('{}')}.${btoa(JSON.stringify(claimsFor(roles, tenantId)))}.fixture`;

const SUPER_ADMIN = tokenFor(['tenant-admin', 'agency-admin', 'user-admin', 'topic-admin'], 0);
const TENANT_ADMIN = tokenFor(['tenant-admin', 'user-admin'], 1);
const AGENCY_ADMIN = tokenFor(['restricted-agency-admin', 'user-admin'], 1);

const list = (rows: unknown[]) => HttpResponse.json({ _embedded: rows, total: rows.length });

/** Like the real list endpoints: the server does the matching, an empty or "*" query returns everything. */
const matching = <T extends { name: string }>(rows: T[], query: string | null) => {
    const needle = (query ?? '').toLowerCase();

    return needle && needle !== '*' ? rows.filter((row) => row.name.toLowerCase().includes(needle)) : rows;
};

const TENANTS = [{ id: 7, name: 'Springfield QA', subdomain: 'springfield', settings: {}, licensing: {} }];
const AGENCIES = [
    {
        id: 11,
        name: 'Suchtberatung Springfield',
        city: 'Springfield',
        topics: [{ id: 1, name: 'Suchtberatung' }],
    },
];

const handlers = [
    http.get(`${tenantAdminEndpoint}/search`, ({ request }) =>
        list(matching(TENANTS, new URL(request.url).searchParams.get('query'))),
    ),
    http.get(agencyEndpointBase, ({ request }) => list(matching(AGENCIES, new URL(request.url).searchParams.get('q')))),
    http.get(`${topicAdminEndpoint}/`, () => HttpResponse.json([{ id: 1, name: 'Suchtberatung', description: '' }])),
    http.get(usersConsultantsSearchEndpoint, () => list([])),
    http.get(agencyAdminsSearchEndpoint, () => list([])),
    http.get(tenantAdminsSearchEndpoint, () => list([])),
];

const WithSession = ({
    token,
    language,
    children,
}: {
    token: string;
    language: 'de' | 'en';
    children: ReactElement;
}) => {
    // Set before the first render of the children, restored on unmount.
    const previous = { access: getSessionAccessToken(), refresh: getSessionRefreshToken() };

    setSessionTokens(token, 'storybook-refresh-fixture');

    useEffect(() => {
        i18n.changeLanguage(language).catch(() => undefined);

        return () => setSessionTokens(previous.access, previous.refresh);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language]);

    return children;
};

const COPY = {
    en: {
        hint: 'Press Ctrl/Cmd+K or /, or click the search bar. A result opens its page; the tile it names scrolls into view and is highlighted for a moment.',
        tile: (key: string) => `Placeholder content of the tile “${key}”.`,
        region: 'Page content',
    },
    de: {
        hint: 'Drücken Sie Strg/Cmd+K oder /, oder klicken Sie die Suchleiste. Ein Treffer öffnet seine Seite; die genannte Kachel scrollt ins Bild und wird kurz hervorgehoben.',
        tile: (key: string) => `Platzhalter-Inhalt der Kachel „${key}“.`,
        region: 'Seiteninhalt',
    },
};

const CurrentPage = () => {
    const { pathname, hash } = useLocation();
    const { i18n: i18nInstance } = useTranslation();
    const copy = COPY[i18nInstance.language?.startsWith('de') ? 'de' : 'en'];

    return (
        <div style={{ padding: '24px 32px' }}>
            <p data-testid="current-route" style={{ margin: 0, fontWeight: 600 }}>
                {pathname}
                {hash}
            </p>
            <p style={{ margin: '8px 0 24px', color: '#444748' }}>{copy.hint}</p>
            {/* The keys are the real tile titles the search hands over (see searchRegistry.ts). */}
            {['imprint.title', 'privacy.title', 'tenants.appSettings.smtp.title'].map((titleKey) => (
                <div key={titleKey} style={{ marginBottom: 360 }}>
                    <Card titleKey={titleKey}>
                        <p style={{ margin: 0 }}>{copy.tile(titleKey)}</p>
                    </Card>
                </div>
            ))}
        </div>
    );
};

const Shell = () => {
    const { navItems, accountItem, tree, logoutLabel, navLanguage } = useAdminNavigation({ restricted: false });
    const { pathname } = useLocation();

    return (
        <AdminSearchProvider navItems={navItems} account={accountItem} tree={tree}>
            <Layout className="protectedLayout" style={{ height: 760 }}>
                <AdminSidebar
                    items={navItems}
                    account={accountItem}
                    logout={{ label: logoutLabel, onLogout: () => undefined }}
                    lang={navLanguage}
                    currentPath={pathname}
                />
                <Layout className={layoutStyles.mainContent}>
                    <div className={layoutStyles.topBar}>
                        <AdminSearchButton variant="bar" />
                    </div>
                    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (axe: scrollable-region-focusable) */}
                    <div
                        role="region"
                        aria-label={COPY[i18n.language?.startsWith('de') ? 'de' : 'en'].region}
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                        tabIndex={0}
                        style={{ height: 'calc(760px - 56px)', overflow: 'auto' }}
                    >
                        <CurrentPage />
                    </div>
                </Layout>
            </Layout>
        </AdminSearchProvider>
    );
};

interface WiringProps {
    token: string;
    language: 'de' | 'en';
}

// The preview already provides the router (a MemoryRouter), so the story only adds the session.
const Wiring = ({ token, language }: WiringProps) => (
    <WithSession token={token} language={language}>
        <Shell />
    </WithSession>
);

const meta: Meta<typeof Wiring> = {
    title: 'Admin/Global search/Wired into the layout',
    component: Wiring,
    parameters: {
        layout: 'fullscreen',
        msw: { handlers },
        // The antd Layout and the sidebar are the app's own; axe on the fixture page is not the point here.
        a11y: { test: 'todo' },
    },
    args: { token: SUPER_ADMIN, language: 'en' },
};

export default meta;
type Story = StoryObj<typeof Wiring>;

/** Platform admin, English: the keyboard shortcut opens the search, a typed word finds a tile, Enter opens it. */
export const ShortcutOpensSearchAndResultNavigates: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitFor(() => expect(canvas.getByRole('button', { name: /search/i })).toBeInTheDocument());
        await userEvent.keyboard('{Control>}k{/Control}');

        const dialog = await within(document.body).findByRole('dialog');
        const field = within(dialog).getByRole('combobox');

        await expect(field).toHaveFocus();
        await userEvent.type(field, 'imprint');
        await waitFor(() => expect(within(dialog).getAllByRole('option').length).toBeGreaterThan(0));
        await userEvent.keyboard('{Enter}');

        await waitFor(() => expect(canvas.getByTestId('current-route').textContent).toContain('#tile='));
    },
};

/** Same wiring in German: the labels, the placeholder and the groups follow the UI language. */
export const GermanPlatformAdmin: Story = {
    args: { language: 'de' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitFor(() => expect(canvas.getByRole('button', { name: /such/i })).toBeInTheDocument());
        await userEvent.keyboard('{Control>}k{/Control}');

        const dialog = await within(document.body).findByRole('dialog');

        await userEvent.type(within(dialog).getByRole('combobox'), 'Datenschutz');
        await waitFor(() => expect(within(dialog).getAllByRole('option').length).toBeGreaterThan(0));
    },
};

/** "/" opens it too, unless someone is typing in a field. */
export const SlashOpensSearch: Story = {
    play: async ({ canvasElement }) => {
        await waitFor(() => expect(within(canvasElement).getByRole('button', { name: /search/i })).toBeInTheDocument());
        await userEvent.keyboard('/');

        await expect(await within(document.body).findByRole('dialog')).toBeInTheDocument();
    },
};

/** A Träger admin sees fewer results than the platform admin (roles and permissions are respected). */
export const TraegerAdmin: Story = {
    args: { token: TENANT_ADMIN },
};

/** A Beratungsstellen admin: only what that role may open. */
export const AgencyAdmin: Story = {
    args: { token: AGENCY_ADMIN, language: 'de' },
};
