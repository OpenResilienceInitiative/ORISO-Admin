import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { AgencySetupPage } from './AgencySetupPage';
import { getSessionAccessToken, getSessionRefreshToken, setSessionTokens } from '../../api/auth/tokenSessionStore';
import {
    ACCESS_TOKEN_VALID_UNTIL_KEY,
    REFRESH_TOKEN_VALID_UNTIL_KEY,
    setTokenExpiryInLocalStorage,
} from '../../api/auth/accessSessionLocalStorage';
import i18n from '../../i18n';

/** Real authenticated route + real shared form/update mutation. Only HTTP is mocked.
 * Fixtures are not deployed registration/Keycloak acceptance or real permissions. */
const centre = {
    id: '5',
    name: 'Beratung Mitte',
    postcode: '10115',
    city: 'Berlin',
    street: 'Beispielstraße',
    houseNumber: '12',
    floorBuilding: '',
    country: 'Deutschland',
    phone: '',
    phoneSecondary: '',
    email: '',
    openingHours: '',
    description: '',
    consultingType: '0',
    offline: true,
    teamAgency: false,
    topics: [{ id: 12, name: 'Familienberatung' }],
    content: { impressum: { de: 'Existing legal text' } },
};
const requests: { reads: number; writes: Record<string, unknown>[]; recoveryDenied: boolean } = {
    reads: 0,
    writes: [],
    recoveryDenied: false,
};
const handlers = (saveFails = false, unavailable = false, denyRecoveryOnce = false) => [
    http.get('*/service/users/data', () =>
        HttpResponse.json({ agencies: [{ id: 5 }], twoFactorAuth: { isActive: true } }),
    ),
    http.get('*/service/agencyadmin/agencies/:id', () => {
        requests.reads += 1;
        if (unavailable || (denyRecoveryOnce && requests.writes.length > 0 && !requests.recoveryDenied)) {
            requests.recoveryDenied = true;
            return new HttpResponse(null, { status: 403 });
        }
        return HttpResponse.json({ _embedded: centre });
    }),
    http.put('*/service/agencyadmin/agencies/:id', async ({ request }) => {
        const patch = (await request.json()) as Record<string, unknown>;
        requests.writes.push(patch);
        return saveFails
            ? new HttpResponse(null, { status: 503 })
            : HttpResponse.json({ _embedded: { ...centre, ...patch } });
    }),
];

const SetupRoute = ({ id = '5' }: { id?: string }) => {
    const navigate = useNavigate();
    const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    useEffect(() => {
        navigate(`/admin/agency/${id}/setup`, { replace: true });
    }, [id, navigate]);
    return (
        <QueryClientProvider client={queryClient}>
            <Routes>
                <Route path="/admin/agency/:id/setup" element={<AgencySetupPage />} />
                <Route path="/admin/agency/5/general" element={<h1>{i18n.t<string>('agency.setup.saved')}</h1>} />
                <Route path="/admin/agency" element={<h1>{i18n.t<string>('agency.setup.myAgencies')}</h1>} />
            </Routes>
        </QueryClientProvider>
    );
};

const meta = {
    title: 'Pages/Agency/FirstCentreSetup',
    component: SetupRoute,
    parameters: { layout: 'fullscreen', msw: { handlers: handlers() } },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        const previousAccess = getSessionAccessToken();
        const previousRefresh = getSessionRefreshToken();
        const previousAccessExpiry = localStorage.getItem(ACCESS_TOKEN_VALID_UNTIL_KEY);
        const previousRefreshExpiry = localStorage.getItem(REFRESH_TOKEN_VALID_UNTIL_KEY);
        const claims = {
            tenantId: 21,
            exp: Math.floor(Date.now() / 1000) + 3600,
            realm_access: { roles: ['restricted-agency-admin', 'user-admin'] },
        };
        setSessionTokens(`${btoa('{}')}.${btoa(JSON.stringify(claims))}.fixture`, 'storybook-refresh-fixture');
        setTokenExpiryInLocalStorage(ACCESS_TOKEN_VALID_UNTIL_KEY, 3600);
        setTokenExpiryInLocalStorage(REFRESH_TOKEN_VALID_UNTIL_KEY, 3600);
        requests.reads = 0;
        requests.writes = [];
        requests.recoveryDenied = false;
        await i18n.changeLanguage('de');
        return () => {
            setSessionTokens(previousAccess, previousRefresh);
            if (previousAccessExpiry == null) localStorage.removeItem(ACCESS_TOKEN_VALID_UNTIL_KEY);
            else localStorage.setItem(ACCESS_TOKEN_VALID_UNTIL_KEY, previousAccessExpiry);
            if (previousRefreshExpiry == null) localStorage.removeItem(REFRESH_TOKEN_VALID_UNTIL_KEY);
            else localStorage.setItem(REFRESH_TOKEN_VALID_UNTIL_KEY, previousRefreshExpiry);
            i18n.changeLanguage(previousLanguage);
        };
    },
} satisfies Meta<typeof SetupRoute>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FirstCentre: Story = {
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByDisplayValue('Beratung Mitte');
    },
};
export const Mobile: Story = { globals: { viewport: { value: 'phone', isRotated: false } }, ...FirstCentre };
export const NarrowMobile: Story = { globals: { viewport: { value: 'phoneSmall', isRotated: false } }, ...FirstCentre };
export const English: Story = {
    play: async ({ canvasElement }) => {
        await i18n.changeLanguage('en');
        await within(canvasElement).findByRole('button', { name: 'Save and finish setup' });
    },
};
export const SaveAndFinish: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const city = await canvas.findByLabelText('Stadt');
        await userEvent.clear(city);
        await userEvent.type(city, 'Potsdam');
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern und Einrichtung abschließen' }));
        await canvas.findByRole('heading', { name: 'Die Angaben Ihrer Beratungsstelle wurden gespeichert.' });
        await expect(requests.writes).toHaveLength(1);
        await expect(requests.writes[0]).toMatchObject({ city: 'Potsdam', topicIds: ['12'], content: centre.content });
    },
};
export const SaveFailure: Story = {
    parameters: { msw: { handlers: handlers(true) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const phone = await canvas.findByLabelText('Telefon');
        await userEvent.type(phone, '03012345');
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern und Einrichtung abschließen' }));
        await waitFor(() => expect(canvas.getByRole('alert')).toHaveTextContent('Ihre Eingaben bleiben erhalten'));
        await expect(phone).toHaveValue('03012345');
    },
};
export const UnassignedCentre: Story = {
    args: { id: '6' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByRole('alert');
        await expect(requests.reads).toBe(0);
        await expect(canvas.queryByDisplayValue('Beratung Mitte')).not.toBeInTheDocument();
    },
};
export const RevokedCentre: Story = {
    parameters: { msw: { handlers: handlers(false, true) } },
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByRole('alert');
    },
};

export const DeniedThenRestored: Story = {
    parameters: { msw: { handlers: handlers(true, false, true) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByLabelText('Telefon'), '03012345');
        await userEvent.click(canvas.getByRole('button', { name: 'Speichern und Einrichtung abschließen' }));
        await waitFor(() =>
            expect(canvas.getByRole('alert')).toHaveTextContent(
                'Diese Beratungsstelle ist derzeit nicht für Sie verfügbar',
            ),
        );
        await expect(canvas.queryByLabelText('Telefon')).not.toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Erneut versuchen' }));
        await expect(await canvas.findByLabelText('Telefon')).toHaveValue('03012345');
    },
};
