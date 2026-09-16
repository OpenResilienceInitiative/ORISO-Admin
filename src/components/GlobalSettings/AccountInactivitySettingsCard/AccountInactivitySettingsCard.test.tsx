import '@ant-design/v5-patch-for-react-19';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { setSessionTokens, clearSessionTokens } from '../../../api/auth/tokenSessionStore';
import { AccountInactivitySettingsCardContainer } from '.';

const initial = { askerMonths: 24, consultantMonths: 24, otherMonths: 24, revision: 0 };
const server = setupServer(http.get('*/controls/account-inactivity', () => HttpResponse.json(initial)));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    clearSessionTokens();
});
beforeEach(async () => {
    setSessionTokens(
        `header.${btoa(
            JSON.stringify({ realm_access: { roles: ['agency-admin', 'tenant-admin'] }, tenantId: 0 }),
        )}.signature`,
        null,
    );
    await i18n.changeLanguage('de');
});
const showSettings = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <AccountInactivitySettingsCardContainer />
        </QueryClientProvider>,
    );

it('loads the three confirmed periods and explains deletion, suspension and new-person scope', async () => {
    showSettings();
    expect(await screen.findByLabelText('Ratsuchende (Monate)')).toHaveValue(24);
    expect(screen.getByLabelText('Berater (Monate)')).toHaveValue(24);
    expect(screen.getByLabelText('Sonstige Personen (Monate)')).toHaveValue(24);
    expect(screen.getByText(/einschließlich Admins und Support/)).toBeVisible();
    expect(
        screen.getByText(
            'Änderungen gelten nur für neu angelegte Personen. Bestehende Personen behalten ihre bisherige Frist.',
        ),
    ).toBeVisible();
    expect(screen.getByText(/Ratsuchende werden gelöscht/)).toBeVisible();
});

it('saves all three periods with revision zero and reads the confirmed values after remounting', async () => {
    let stored = initial;
    server.use(
        http.get('*/controls/account-inactivity', () => HttpResponse.json(stored)),
        http.put('*/controls/account-inactivity', async ({ request }) => {
            expect(await request.json()).toEqual({
                askerMonths: 12,
                consultantMonths: 24,
                otherMonths: 36,
                revision: stored.revision,
            });
            stored = { askerMonths: 12, consultantMonths: 24, otherMonths: 36, revision: stored.revision + 1 };
            return HttpResponse.json(stored);
        }),
    );
    const view = showSettings();
    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.clear(screen.getByLabelText('Ratsuchende (Monate)'));
    await userEvent.type(screen.getByLabelText('Ratsuchende (Monate)'), '12');
    await userEvent.clear(screen.getByLabelText('Sonstige Personen (Monate)'));
    await userEvent.type(screen.getByLabelText('Sonstige Personen (Monate)'), '36');
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(stored.revision).toBe(1));
    view.unmount();
    showSettings();
    await waitFor(() => expect(screen.getByLabelText('Ratsuchende (Monate)')).toHaveValue(12));
    expect(screen.getByLabelText('Sonstige Personen (Monate)')).toHaveValue(36);
    await userEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(stored.revision).toBe(2));
});

it.each(['0', '-1', '1.5', '2147483648', ''])(
    'rejects invalid month value %s without sending it to the server',
    async (value) => {
        let saved = false;
        server.use(
            http.put('*/controls/account-inactivity', () => {
                saved = true;
                return HttpResponse.json(initial);
            }),
        );
        showSettings();
        await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
        await userEvent.clear(screen.getByLabelText('Ratsuchende (Monate)'));
        if (value) await userEvent.type(screen.getByLabelText('Ratsuchende (Monate)'), value);
        await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
        expect(await screen.findByText('Geben Sie eine ganze Zahl ab 1 ein.')).toBeVisible();
        expect(saved).toBe(false);
    },
);

it('does not expose platform settings to a tenant administrator', () => {
    setSessionTokens(
        `header.${btoa(
            JSON.stringify({ realm_access: { roles: ['agency-admin', 'tenant-admin'] }, tenantId: 7 }),
        )}.signature`,
        null,
    );
    showSettings();
    expect(screen.queryByText('Inaktive Konten')).not.toBeInTheDocument();
});

it.each([
    [403, 'Sie dürfen die plattformweiten Einstellungen für inaktive Konten nicht ändern.'],
    [400, 'Geben Sie für jede Personengruppe eine gültige Anzahl Monate ein.'],
    [500, 'Die Einstellungen für inaktive Konten konnten nicht gespeichert werden.'],
])('shows HTTP %s failure and keeps the attempted period editable', async (status, errorMessage) => {
    server.use(http.put('*/controls/account-inactivity', () => new HttpResponse(null, { status: Number(status) })));
    showSettings();
    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.clear(screen.getByLabelText('Ratsuchende (Monate)'));
    await userEvent.type(screen.getByLabelText('Ratsuchende (Monate)'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByText(String(errorMessage))).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText('Ratsuchende (Monate)')).toBeEnabled());
    expect(screen.getByLabelText('Ratsuchende (Monate)')).toHaveValue(12);
    expect(screen.queryByText('Die Einstellungen für inaktive Konten wurden gespeichert.')).not.toBeInTheDocument();
});

it('shows a load failure without making unconfirmed defaults editable', async () => {
    server.use(http.get('*/controls/account-inactivity', () => new HttpResponse(null, { status: 503 })));
    showSettings();
    expect(
        await screen.findByText('Die Einstellungen für inaktive Konten konnten nicht geladen werden.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).not.toBeInTheDocument();
});

it('refreshes confirmed settings after conflict and sends their revision on the next save', async () => {
    let stored = initial;
    const payloads: unknown[] = [];
    server.use(
        http.get('*/controls/account-inactivity', () => HttpResponse.json(stored)),
        http.put('*/controls/account-inactivity', async ({ request }) => {
            payloads.push(await request.json());
            if (payloads.length === 1) {
                stored = { askerMonths: 30, consultantMonths: 36, otherMonths: 48, revision: 1 };
                return new HttpResponse(null, { status: 409 });
            }
            return HttpResponse.json({ ...stored, askerMonths: 18, revision: 2 });
        }),
    );
    showSettings();
    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByText(/Die Einstellungen wurden zwischenzeitlich geändert/)).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText('Ratsuchende (Monate)')).toHaveValue(30));
    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.clear(screen.getByLabelText('Ratsuchende (Monate)'));
    await userEvent.type(screen.getByLabelText('Ratsuchende (Monate)'), '18');
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(payloads).toHaveLength(2));
    expect(payloads[1]).toEqual({ askerMonths: 18, consultantMonths: 36, otherMonths: 48, revision: 1 });
});

it('blocks further saves when refreshing a conflicting policy fails', async () => {
    let conflicted = false;
    server.use(
        http.get('*/controls/account-inactivity', () =>
            conflicted ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(initial),
        ),
        http.put('*/controls/account-inactivity', () => {
            conflicted = true;
            return new HttpResponse(null, { status: 409 });
        }),
    );
    showSettings();
    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(
        await screen.findByText('Die Einstellungen für inaktive Konten konnten nicht geladen werden.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Speichern' })).not.toBeInTheDocument();
});
