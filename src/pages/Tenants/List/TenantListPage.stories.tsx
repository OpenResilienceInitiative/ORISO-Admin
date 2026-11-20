import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { getSessionAccessToken, getSessionRefreshToken, setSessionTokens } from '../../../api/auth/tokenSessionStore';
import i18n from '../../../i18n';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { findPopup, popupsOf } from '../../../test/storyPopups';
import { TenantsList } from './index';

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const TENANTS = [
    {
        id: 21,
        name: 'Caritas Nord',
        subdomain: 'nord',
        beraterCount: 40,
        licensing: { allowedNumberOfUsers: 40 },
        adminEmails: ['admin@nord.example', 'stellvertretung@nord.example'],
        createDate: daysAgo(500),
        updateDate: daysAgo(3),
    },
    {
        id: 34,
        name: 'Diakonisches Werk für Familien- und Lebensberatung',
        subdomain: 'diakonie',
        beraterCount: 250,
        licensing: { allowedNumberOfUsers: 250 },
        adminEmails: ['traeger@diakonie.example'],
        createDate: daysAgo(200),
        updateDate: daysAgo(40),
    },
    {
        id: 7,
        name: 'Neuer Träger',
        subdomain: 'neu',
        beraterCount: 5,
        licensing: { allowedNumberOfUsers: 5 },
        adminEmails: [],
        createDate: daysAgo(2),
        updateDate: daysAgo(1),
    },
];

const handlers = [
    http.get('*/service/tenantadmin/search', ({ request }) => {
        // The server matches by name; `*` is "all".
        const query = new URL(request.url).searchParams.get('query') ?? '*';
        const rows =
            query === '*'
                ? TENANTS
                : TENANTS.filter((tenant) => tenant.name.toLowerCase().includes(query.toLowerCase()));
        return HttpResponse.json({ _embedded: rows.map((tenant) => ({ _embedded: tenant })), total: rows.length });
    }),
];

const Route = () => {
    const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={orisoMuiTheme}>
                <TenantsList />
            </ThemeProvider>
        </QueryClientProvider>
    );
};

/** The whole Träger page for the platform admin, fed by the real search client (#1184). */
const meta = {
    title: 'Pages/Tenants/TenantListPage',
    component: Route,
    parameters: { layout: 'fullscreen', msw: { handlers } },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        const previousAccess = getSessionAccessToken();
        const previousRefresh = getSessionRefreshToken();
        const claims = {
            tenantId: 0,
            exp: Math.floor(Date.now() / 1000) + 3600,
            realm_access: { roles: ['tenant-admin', 'user-admin', 'restricted-agency-admin', 'single-tenant-admin'] },
        };
        setSessionTokens(`${btoa('{}')}.${btoa(JSON.stringify(claims))}.fixture`, 'storybook-refresh-fixture');
        await i18n.changeLanguage('de');
        return () => {
            setSessionTokens(previousAccess, previousRefresh);
            i18n.changeLanguage(previousLanguage);
        };
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Caritas Nord')).toBeVisible();
        const doc = canvasElement.ownerDocument.documentElement;
        await expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);
    },
} satisfies Meta<typeof Route>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PlatformAdmin: Story = {};

/** Only a platform admin may delete a Träger (agency-admin + tenant-admin, tenantId 0). */
const asPlatformAdmin = () => {
    const previousAccess = getSessionAccessToken();
    const previousRefresh = getSessionRefreshToken();
    const claims = {
        tenantId: 0,
        exp: Math.floor(Date.now() / 1000) + 3600,
        realm_access: { roles: ['agency-admin', 'tenant-admin', 'user-admin'] },
    };
    setSessionTokens(`${btoa('{}')}.${btoa(JSON.stringify(claims))}.fixture`, 'storybook-refresh-fixture');
    return () => setSessionTokens(previousAccess, previousRefresh);
};

/** Deletes "Caritas Nord" through the confirm dialog; the pop-up carries the result. */
const deleteCaritasNord = async (canvasElement: HTMLElement) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: /Caritas Nord löschen/ }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));
};

/** T1: the delete succeeded - one success pop-up titled "Träger", nothing in the page. */
export const DeleteSucceeded: Story = {
    beforeEach: asPlatformAdmin,
    parameters: {
        msw: {
            handlers: [http.delete('*/service/tenant/21', () => new HttpResponse(null, { status: 200 })), ...handlers],
        },
    },
    play: async ({ canvasElement }) => {
        await deleteCaritasNord(canvasElement);
        const popup = await findPopup(canvasElement, 'Träger wurde erfolgreich gelöscht.', 'success');
        await expect(popup).toHaveTextContent('Träger');
    },
};

/** T1: the delete was refused (open chats) - one error pop-up that stays until it is closed. */
export const DeleteRefused: Story = {
    beforeEach: asPlatformAdmin,
    parameters: {
        msw: {
            handlers: [http.delete('*/service/tenant/21', () => new HttpResponse(null, { status: 409 })), ...handlers],
        },
    },
    play: async ({ canvasElement }) => {
        await deleteCaritasNord(canvasElement);
        const popup = await findPopup(canvasElement, 'Träger konnte nicht gelöscht werden.', 'error');
        await expect(popup).toHaveTextContent('aktive Chats');
        await expect(popupsOf(canvasElement)).toHaveLength(1);
    },
};

let listRequests = 0;
let listRecovered = false;
/** N5: the list cannot be loaded - error pop-up with retry; "Erneut versuchen" asks again and the list appears. */
export const ListLoadErrorRetry: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/tenantadmin/search', () => {
                    listRequests += 1;
                    return listRecovered
                        ? HttpResponse.json({
                              _embedded: TENANTS.map((tenant) => ({ _embedded: tenant })),
                              total: TENANTS.length,
                          })
                        : new HttpResponse(null, { status: 500 });
                }),
            ],
        },
    },
    beforeEach: () => {
        listRequests = 0;
        listRecovered = false;
    },
    play: async ({ canvasElement }) => {
        const popup = await findPopup(canvasElement, 'Fehler beim Laden der Daten.', 'error');
        await expect(popup).toHaveTextContent('Träger');
        const before = listRequests;
        listRecovered = true;
        await userEvent.click(within(popup).getByRole('button', { name: 'Erneut versuchen' }));
        await waitFor(() => expect(listRequests).toBeGreaterThan(before));
        await expect(await within(canvasElement).findByText('Caritas Nord')).toBeVisible();
        await waitFor(() => expect(popupsOf(canvasElement)).toHaveLength(0));
    },
};

/**
 * One search for the whole admin: the list has no search field of its own any more (it used to sit
 * beside the ⌘K search). ⌘K → "Alle Treffer in der Liste zeigen" opens the list with `?q=`; the bar
 * says so and brings the whole list back.
 */
const narrowedPlay: Story['play'] = async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Caritas Nord')).toBeVisible();
    await expect(canvas.queryByText('Neuer Träger')).toBeNull();
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Suche ausklappen' })).toBeNull();
    const bar = canvas.getByTestId('list-search-bar');
    await expect(bar).toHaveTextContent('„Caritas“');
    await userEvent.click(within(bar).getByRole('button', { name: 'Ganze Liste zeigen' }));
    await expect(await canvas.findByText('Neuer Träger')).toBeVisible();
    await expect(canvas.queryByTestId('list-search-bar')).toBeNull();
};

export const NarrowedBySearch: Story = {
    parameters: { route: '/admin/tenants?q=Caritas' },
    play: narrowedPlay,
};

export const NarrowedBySearchPhone: Story = {
    parameters: { route: '/admin/tenants?q=Caritas' },
    globals: { viewport: { value: 'phone', isRotated: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Caritas Nord')).toBeVisible();
        await expect(canvas.getByTestId('list-search-bar')).toHaveTextContent('„Caritas“');
        await expect(canvas.queryByRole('textbox')).toBeNull();
    },
};
