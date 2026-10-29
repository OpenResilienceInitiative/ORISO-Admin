import '@ant-design/v5-patch-for-react-19';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { setSessionTokens, clearSessionTokens } from '../../../api/auth/tokenSessionStore';
import type { TemporaryAccountSettings } from '../../../types/TemporaryAccountSettings';
import { TemporaryAccountSettingsCardsContainer } from '.';

const ENDPOINT = '*/users/admin/temporary-account-settings';
const defaults: TemporaryAccountSettings = {
    callDeleteAfterMinutes: 15,
    callMaxLifetimeHours: 24,
    chatInactivityDays: 30,
    hidePasswordField: false,
    messageRetention: 'GUEST_DECIDES',
    revision: 0,
};
const server = setupServer(http.get(ENDPOINT, () => HttpResponse.json(defaults)));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    clearSessionTokens();
});
const signInAs = (tenantId: number) =>
    setSessionTokens(
        `header.${btoa(
            JSON.stringify({ realm_access: { roles: ['agency-admin', 'tenant-admin'] }, tenantId }),
        )}.signature`,
        null,
    );
beforeEach(async () => {
    signInAs(0);
    await i18n.changeLanguage('de');
});
const showCards = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <TemporaryAccountSettingsCardsContainer />
        </QueryClientProvider>,
    );
const guestCard = async () =>
    within((await screen.findByText('Temporäre Gastkonten')).closest('.ant-card, section, article') as HTMLElement);
const messagesCard = async () =>
    within(
        (await screen.findByText('Nachrichten von temporären Konten')).closest(
            '.ant-card, section, article',
        ) as HTMLElement,
    );

it('shows both cards with the defaults and says changes apply to people who join later', async () => {
    showCards();
    expect(await screen.findByLabelText(/Löschen nach dem Auflegen \(Minuten\)/)).toHaveValue(15);
    expect(screen.getByLabelText(/Spätestens löschen nach \(Stunden\)/)).toHaveValue(24);
    expect(screen.getByLabelText(/Spätestens nach Tagen ohne Aktivität/)).toHaveValue(30);
    expect(screen.getByRole('switch', { name: /Passwortfeld für temporäre Konten ausblenden/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Warnen und die Person entscheiden lassen' })).toBeChecked();
    expect(screen.getAllByText('Änderungen gelten für Personen, die nach dem Speichern beitreten.')).toHaveLength(2);
});

it('saves the lifetimes with the confirmed revision and keeps the retention mode untouched', async () => {
    let stored = defaults;
    const payloads: unknown[] = [];
    server.use(
        http.get(ENDPOINT, () => HttpResponse.json(stored)),
        http.put(ENDPOINT, async ({ request }) => {
            const body = (await request.json()) as TemporaryAccountSettings;
            payloads.push(body);
            stored = { ...body, revision: stored.revision + 1 };
            return HttpResponse.json(stored);
        }),
    );
    showCards();
    const card = await guestCard();
    await userEvent.click(await card.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.clear(screen.getByLabelText(/Spätestens nach Tagen ohne Aktivität/));
    await userEvent.type(screen.getByLabelText(/Spätestens nach Tagen ohne Aktivität/), '1');
    await userEvent.click(screen.getByRole('switch', { name: /Passwortfeld für temporäre Konten ausblenden/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(payloads).toHaveLength(1));
    expect(payloads[0]).toEqual({ ...defaults, chatInactivityDays: 1, hidePasswordField: true, revision: 0 });
    await waitFor(() => expect(screen.getByLabelText(/Spätestens nach Tagen ohne Aktivität/)).toHaveValue(1));
});

it('saves the retention mode with the lifetimes the server confirmed', async () => {
    let stored = { ...defaults, chatInactivityDays: 7, revision: 4 };
    const payloads: unknown[] = [];
    server.use(
        http.get(ENDPOINT, () => HttpResponse.json(stored)),
        http.put(ENDPOINT, async ({ request }) => {
            const body = (await request.json()) as TemporaryAccountSettings;
            payloads.push(body);
            stored = { ...body, revision: stored.revision + 1 };
            return HttpResponse.json(stored);
        }),
    );
    showCards();
    const card = await messagesCard();
    await userEvent.click(await card.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Immer behalten' }));
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(payloads).toHaveLength(1));
    expect(payloads[0]).toEqual({
        ...defaults,
        chatInactivityDays: 7,
        messageRetention: 'ALWAYS_PERSISTENT',
        revision: 4,
    });
});

it.each([
    ['Löschen nach dem Auflegen', '0', 'Geben Sie eine ganze Zahl von 1 bis 1440 ein.'],
    ['Spätestens löschen nach', '25', 'Geben Sie eine ganze Zahl von 1 bis 24 ein.'],
    ['Spätestens nach Tagen ohne Aktivität', '366', 'Geben Sie eine ganze Zahl von 1 bis 365 ein.'],
])('rejects %s = %s without sending it', async (label, value, errorMessage) => {
    let saved = false;
    server.use(
        http.put(ENDPOINT, () => {
            saved = true;
            return HttpResponse.json(defaults);
        }),
    );
    showCards();
    const card = await guestCard();
    await userEvent.click(await card.findByRole('button', { name: 'Bearbeiten' }));
    const field = screen.getByLabelText(new RegExp(label));
    await userEvent.clear(field);
    await userEvent.type(field, value);
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByText(errorMessage)).toBeVisible();
    expect(saved).toBe(false);
});

it('is not shown to a Träger admin and asks the server nothing', async () => {
    const requests: string[] = [];
    server.events.on('request:start', ({ request }) => {
        if (request.url.includes('temporary-account-settings')) requests.push(request.url);
    });
    signInAs(7);
    showCards();
    // Settle on a later render tick: a GET would already have started by then.
    await new Promise((resolve) => {
        setTimeout(resolve, 50);
    });
    server.events.removeAllListeners();
    expect(screen.queryByText('Temporäre Gastkonten')).not.toBeInTheDocument();
    expect(screen.queryByText('Nachrichten von temporären Konten')).not.toBeInTheDocument();
    expect(requests).toEqual([]);
});

it('shows a load failure in both cards without making defaults editable', async () => {
    server.use(http.get(ENDPOINT, () => new HttpResponse(null, { status: 503 })));
    showCards();
    expect(
        await screen.findAllByText('Die Einstellungen für temporäre Konten konnten nicht geladen werden.'),
    ).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).not.toBeInTheDocument();
});

it('reloads the confirmed settings after a conflict', async () => {
    let stored = defaults;
    server.use(
        http.get(ENDPOINT, () => HttpResponse.json(stored)),
        http.put(ENDPOINT, () => {
            stored = { ...defaults, callDeleteAfterMinutes: 45, revision: 1 };
            return new HttpResponse(null, { status: 409 });
        }),
    );
    showCards();
    const card = await guestCard();
    await userEvent.click(await card.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(await screen.findByText(/Die Einstellungen wurden zwischenzeitlich geändert/)).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText(/Löschen nach dem Auflegen/)).toHaveValue(45));
});

it('sends the revision an open card was loaded with, so a sibling conflict cannot overwrite newer values', async () => {
    let stored = defaults;
    let reads = 0;
    const payloads: TemporaryAccountSettings[] = [];
    server.use(
        http.get(ENDPOINT, () => {
            reads += 1;
            return HttpResponse.json(stored);
        }),
        http.put(ENDPOINT, async ({ request }) => {
            const body = (await request.json()) as TemporaryAccountSettings;
            payloads.push(body);
            if (body.revision !== stored.revision) return new HttpResponse(null, { status: 409 });
            stored = { ...body, revision: stored.revision + 1 };
            return HttpResponse.json(stored);
        }),
    );
    showCards();
    const guest = await guestCard();
    await userEvent.click(await guest.findByRole('button', { name: 'Bearbeiten' }));
    const messages = await messagesCard();
    await userEvent.click(await messages.findByRole('button', { name: 'Bearbeiten' }));
    // Another admin changes the lifetimes meanwhile; the messages card hits the conflict first.
    stored = { ...defaults, callDeleteAfterMinutes: 45, revision: 1 };
    await userEvent.click(messages.getByRole('radio', { name: 'Immer behalten' }));
    await userEvent.click(messages.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(payloads).toHaveLength(1));
    expect(await screen.findByText(/Die Einstellungen wurden zwischenzeitlich geändert/)).toBeVisible();
    // The conflict refetch has brought revision 1 into the shared query.
    await waitFor(() => expect(reads).toBeGreaterThanOrEqual(2));
    await userEvent.click(guest.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(payloads).toHaveLength(2));
    expect(payloads[1].revision).toBe(0);
    expect(stored.callDeleteAfterMinutes).toBe(45);
});
