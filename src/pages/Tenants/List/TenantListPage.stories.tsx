import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, within } from 'storybook/test';
import { getSessionAccessToken, getSessionRefreshToken, setSessionTokens } from '../../../api/auth/tokenSessionStore';
import i18n from '../../../i18n';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
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
    http.get('*/service/tenantadmin/search', () =>
        HttpResponse.json({ _embedded: TENANTS.map((tenant) => ({ _embedded: tenant })), total: TENANTS.length }),
    ),
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
