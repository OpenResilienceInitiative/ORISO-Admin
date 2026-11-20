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
import { AgencyList } from './index';

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const CENTRES = [
    {
        id: 12,
        name: 'Caritas Beratungsstelle Mitte',
        street: 'Musterstraße',
        houseNumber: '12a',
        postcode: '10115',
        city: 'Berlin',
        phone: '+49 30 123456',
        email: 'mitte@caritas.example',
        teamAgency: false,
        offline: false,
        active: true,
        topics: [
            { id: 1, name: 'Schuldnerberatung' },
            { id: 2, name: 'Schwangerschaftsberatung' },
            { id: 3, name: 'Suchtberatung' },
        ],
        createDate: daysAgo(400),
        updateDate: daysAgo(3),
    },
    {
        id: 42,
        name: 'Beratungsstelle für Familien-, Paar- und Lebensfragen Wismar',
        street: 'Lange Straße',
        houseNumber: '144',
        postcode: '23966',
        city: 'Wismar',
        teamAgency: true,
        offline: false,
        active: true,
        topics: [{ id: 4, name: 'Familienberatung' }],
        createDate: daysAgo(200),
        updateDate: daysAgo(40),
    },
    {
        id: 7,
        name: 'Online-Beratung Süd',
        postcode: '80331',
        city: 'München',
        email: 'sued@caritas.example',
        teamAgency: false,
        offline: true,
        active: false,
        topics: [],
        createDate: daysAgo(30),
        updateDate: daysAgo(1),
    },
];

const handlers = [
    http.get('*/service/agencyadmin/agencies', ({ request }) => {
        // The server matches by name; `*` is "all".
        const query = new URL(request.url).searchParams.get('q') ?? '*';
        const rows =
            query === '*'
                ? CENTRES
                : CENTRES.filter((centre) => centre.name.toLowerCase().includes(query.toLowerCase()));
        return HttpResponse.json({
            _embedded: rows.map((centre) => ({ _embedded: { ...centre, tenantId: 21, deleteDate: null } })),
            total: rows.length,
        });
    }),
    http.get('*/service/tenantadmin/*/dpa/gate', () => HttpResponse.json({ dpaPublished: true, dpaSigned: true })),
];

const Route = () => {
    const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={orisoMuiTheme}>
                <AgencyList />
            </ThemeProvider>
        </QueryClientProvider>
    );
};

/** The whole Beratungsstellen page for a Träger admin, fed by the real list client (#1184). */
const meta = {
    title: 'Pages/Agency/AgencyListPage',
    component: Route,
    parameters: { layout: 'fullscreen', msw: { handlers } },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        const previousAccess = getSessionAccessToken();
        const previousRefresh = getSessionRefreshToken();
        const claims = {
            tenantId: 21,
            exp: Math.floor(Date.now() / 1000) + 3600,
            realm_access: { roles: ['tenant-admin', 'user-admin', 'restricted-agency-admin', 'topic-admin'] },
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
        await expect(await canvas.findByText('Caritas Beratungsstelle Mitte')).toBeVisible();
        const doc = canvasElement.ownerDocument.documentElement;
        await expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);
    },
} satisfies Meta<typeof Route>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TraegerAdmin: Story = {};

let listRequests = 0;
let listRecovered = false;
/** N5: the list cannot be loaded - error pop-up with "Erneut versuchen"; the second request brings the list back. */
export const ListLoadErrorRetry: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/agencyadmin/agencies', () => {
                    listRequests += 1;
                    return listRecovered
                        ? HttpResponse.json({
                              _embedded: CENTRES.map((centre) => ({
                                  _embedded: { ...centre, tenantId: 21, deleteDate: null },
                              })),
                              total: CENTRES.length,
                          })
                        : new HttpResponse(null, { status: 500 });
                }),
                handlers[1],
            ],
        },
    },
    beforeEach: () => {
        listRequests = 0;
        listRecovered = false;
    },
    play: async ({ canvasElement }) => {
        const popup = await findPopup(canvasElement, 'Fehler beim Laden der Daten.', 'error');
        await expect(popup).toHaveTextContent('Beratungsstelle');
        const before = listRequests;
        listRecovered = true;
        await userEvent.click(within(popup).getByRole('button', { name: 'Erneut versuchen' }));
        await waitFor(() => expect(listRequests).toBeGreaterThan(before));
        await expect(await within(canvasElement).findByText('Caritas Beratungsstelle Mitte')).toBeVisible();
        await waitFor(() => expect(popupsOf(canvasElement)).toHaveLength(0));
    },
};

/**
 * One search for the whole admin: the list has no search field of its own any more (it used to sit
 * beside the ⌘K search). ⌘K → "Alle Treffer in der Liste zeigen" opens the list with `?q=`.
 */
export const NarrowedBySearch: Story = {
    parameters: { route: '/admin/agency?q=Mitte' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Caritas Beratungsstelle Mitte')).toBeVisible();
        // the search reaches the list: a centre that does not match is not shown
        await expect(canvas.queryByText('Online-Beratung Süd')).toBeNull();
        await expect(canvas.queryByRole('textbox')).toBeNull();
        const bar = canvas.getByTestId('list-search-bar');
        await expect(bar).toHaveTextContent('„Mitte“');
        await userEvent.click(within(bar).getByRole('button', { name: 'Ganze Liste zeigen' }));
        await waitFor(() => expect(canvas.queryByTestId('list-search-bar')).toBeNull());
        // the whole list is back
        await expect(await canvas.findByText('Online-Beratung Süd')).toBeVisible();
    },
};

export const NarrowedBySearchPhone: Story = {
    parameters: { route: '/admin/agency?q=Mitte' },
    globals: { viewport: { value: 'phone', isRotated: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Caritas Beratungsstelle Mitte')).toBeVisible();
        await expect(canvas.getByTestId('list-search-bar')).toHaveTextContent('„Mitte“');
        await expect(canvas.queryByRole('textbox')).toBeNull();
    },
};
