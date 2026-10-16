import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
// eslint-disable-next-line import/no-unresolved -- Storybook's subpath export
import { expect, userEvent, within } from 'storybook/test';
import { orisoMuiTheme } from '../../../../../theme/orisoMuiTheme';
import {
    getSessionAccessToken,
    getSessionRefreshToken,
    setSessionTokens,
} from '../../../../../api/auth/tokenSessionStore';
import i18n from '../../../../../i18n';
import { RegistrationSettings } from '.';

/**
 * #953: the counsellor picker of a new counselling centre offers only people of the centre's own
 * Träger. A platform admin chooses the Träger in the form first; until then nobody is offered and
 * the field says why. The handler narrows by `tenantId` the way the real search does, and the
 * foreign counsellor ("Fremd Mandant") must never show up once a Träger is chosen.
 */
const person = (id: string, firstname: string, lastname: string, tenantId: number) => ({
    tenantId,
    row: {
        _embedded: { id, firstname, lastname, email: `${firstname.toLowerCase()}@example.org`, tenantId, agencies: [] },
    },
});
const everyone = [
    person('c-1', 'Erika', 'Beispiel', 7),
    person('c-2', 'Jonas', 'Muster', 7),
    person('c-3', 'Fremd', 'Mandant', 99),
];

/** Every counsellor search the page sent, so a story can prove the Träger reached the server. */
const searchRequests: string[] = [];
let searchFails = false;

const search = ({ request }: { request: Request }) => {
    searchRequests.push(request.url);
    if (searchFails) {
        return new HttpResponse(null, { status: 500 });
    }
    const tenantId = new URL(request.url).searchParams.get('tenantId');
    const rows = (tenantId ? everyone.filter((entry) => String(entry.tenantId) === tenantId) : everyone).map(
        ({ row }) => row,
    );
    return HttpResponse.json({ total: rows.length, _embedded: rows, _links: {} });
};

const asPlatformAdmin = () => {
    const claims = {
        tenantId: 0,
        exp: Math.floor(Date.now() / 1000) + 3600,
        realm_access: { roles: ['agency-admin', 'tenant-admin', 'user-admin'] },
    };
    setSessionTokens(`${btoa('{}')}.${btoa(JSON.stringify(claims))}.fixture`, 'storybook-refresh-fixture');
};

/** The card's fields inside the create form; `tenantId` is what the admin picked in the Träger field. */
const Harness = ({ tenantId }: { tenantId?: number }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider theme={orisoMuiTheme}>
            <Form layout="vertical" initialValues={{ tenantId }}>
                <RegistrationSettings asFields editing />
            </Form>
        </ThemeProvider>
    </QueryClientProvider>
);

const meta = {
    title: 'Organisms/Agency/RegistrationSettingsCounsellors',
    component: Harness,
    parameters: { msw: { handlers: [http.get('*/service/users/consultants/search*', search)] } },
    beforeEach: async () => {
        const previousAccess = getSessionAccessToken();
        const previousRefresh = getSessionRefreshToken();
        const previousLanguage = i18n.language;
        searchRequests.length = 0;
        searchFails = false;
        asPlatformAdmin();
        await i18n.changeLanguage('de');
        return async () => {
            setSessionTokens(previousAccess, previousRefresh);
            await i18n.changeLanguage(previousLanguage);
        };
    },
} satisfies Meta<typeof Harness>;
export default meta;
type Story = StoryObj<typeof meta>;

const field = (canvas: ReturnType<typeof within>) =>
    canvas.findByRole('combobox', { name: /Berater:innen hinzufügen/ });

/** A platform admin has not chosen the Träger yet: the picker is off and says what to do first. */
export const ChooseTenantFirst: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await field(canvas)).toBeDisabled();
        await expect(canvas.getByText(/Wählen Sie zuerst die Trägerzuordnung/)).toBeInTheDocument();
        // Nothing is asked of the server before the Träger is known.
        await expect(searchRequests).toEqual([]);
    },
};

/** Träger 7 is chosen: only its two counsellors are offered, never the other Träger's. */
export const OnlyCounsellorsOfTheTenant: Story = {
    args: { tenantId: 7 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await field(canvas));
        const list = within(await within(document.body).findByRole('listbox'));
        await expect(await list.findByRole('option', { name: /Erika Beispiel/ })).toBeInTheDocument();
        await expect(list.getByRole('option', { name: /Jonas Muster/ })).toBeInTheDocument();
        await expect(list.queryByRole('option', { name: /Fremd Mandant/ })).not.toBeInTheDocument();
        // The server did the narrowing too: the request itself carries the Träger.
        await expect(searchRequests.length).toBeGreaterThan(0);
        await expect(searchRequests.every((url) => new URL(url).searchParams.get('tenantId') === '7')).toBe(true);
    },
};

/** The same at 390px, the phone width the admin card stack collapses to. */
export const OnlyCounsellorsOfTheTenantMobile: Story = {
    ...OnlyCounsellorsOfTheTenant,
    globals: { viewport: { value: 'phone', isRotated: false } },
};

/** A Träger without any counsellor yet: the picker says so instead of looking broken. */
export const NoCounsellorsInTheTenant: Story = {
    args: { tenantId: 42 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText(/keine weiteren Berater:innen zur Auswahl/)).toBeInTheDocument();
    },
};

/** English copy of the empty state. */
export const NoCounsellorsInTheTenantEnglish: Story = {
    args: { tenantId: 42 },
    play: async ({ canvasElement }) => {
        await i18n.changeLanguage('en');
        const canvas = within(canvasElement);
        await expect(await canvas.findByText(/No further counsellors of this tenant/)).toBeInTheDocument();
    },
};

/** The counsellor lookup fails: an error with a retry, never "no counsellors" and never a wiped pick. */
export const CounsellorSearchFailed: Story = {
    args: { tenantId: 7 },
    beforeEach: async () => {
        searchFails = true;
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Die Berater:innen konnten nicht geladen werden.')).toBeInTheDocument();
        await expect(canvas.queryByText(/keine weiteren Berater:innen/)).not.toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Erneut laden' })).toBeInTheDocument();
    },
};
