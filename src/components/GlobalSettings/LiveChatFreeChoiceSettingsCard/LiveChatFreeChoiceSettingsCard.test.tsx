import '@ant-design/v5-patch-for-react-19';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vite-plus/test';
import { SnackbarHost } from '../../Snackbar';
import i18n from '../../../i18n';
import { setSessionTokens, clearSessionTokens } from '../../../api/auth/tokenSessionStore';
import { LiveChatFreeChoiceSettingsCard, LiveChatFreeChoiceSettingsCardContainer } from '.';

const SAVED = 'Einstellungen wurden aktualisiert.';
const SAVE_FAILED =
    'Die Einstellung „Beratende dürfen alle wartenden Ratsuchenden annehmen“ konnte nicht gespeichert werden.';

let savedBodies: unknown[] = [];
const server = setupServer(http.get('*/service/settings', () => HttpResponse.json({})));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    clearSessionTokens();
});
beforeEach(async () => {
    // Saved/failed feedback is a snackbar: mount the host the app mounts once.
    render(<SnackbarHost />);
    savedBodies = [];
    setSessionTokens(
        `header.${btoa(
            JSON.stringify({ realm_access: { roles: ['agency-admin', 'tenant-admin'] }, tenantId: 0 }),
        )}.signature`,
        null,
    );
    await i18n.changeLanguage('de');
});

const answerSaveWith = (status: number) =>
    server.use(
        http.patch('*/service/settingsadmin', async ({ request }) => {
            savedBodies.push(await request.json());
            return new HttpResponse(null, { status });
        }),
    );

const freeChoiceSwitch = () => screen.getByRole('switch', { name: /alle wartenden Ratsuchenden/ });

const switchOnAndSave = async () => {
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <LiveChatFreeChoiceSettingsCardContainer />
        </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(freeChoiceSwitch());
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
};

/** ORISO rule: superadmin-only settings stay visible for everyone, they just cannot be edited. */
it('renders visible-but-not-editable when disabled', () => {
    render(<LiveChatFreeChoiceSettingsCard enabled isLoading={false} onSave={() => undefined} disabled />);

    expect(freeChoiceSwitch()).toBeChecked();
    expect(freeChoiceSwitch()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).not.toBeInTheDocument();
});

it('saves the switch and confirms the change', async () => {
    answerSaveWith(204);
    await switchOnAndSave();
    expect(await screen.findByText(SAVED)).toBeVisible();
    expect(savedBodies).toEqual([expect.objectContaining({ liveChatFreeChoiceEnabled: true })]);
    expect(screen.queryByText(SAVE_FAILED)).not.toBeInTheDocument();
});

it.each([400, 404, 409, 500, 503])(
    'tells the admin that saving failed with HTTP %i and reopens the form with the attempted value',
    async (status) => {
        answerSaveWith(status);
        await switchOnAndSave();
        expect(await screen.findByText(SAVE_FAILED)).toBeVisible();
        await waitFor(() => expect(freeChoiceSwitch()).toBeEnabled());
        expect(freeChoiceSwitch()).toBeChecked();
        expect(screen.getByRole('button', { name: 'Speichern' })).toBeVisible();
        expect(screen.queryByText(SAVED)).not.toBeInTheDocument();
        expect(savedBodies).toHaveLength(1);
    },
);

/** ORISO-Admin#1497 (Frank 2026-11-18): default is the strict queue order. */
it('starts with the strict order when the platform setting is missing', () => {
    render(<LiveChatFreeChoiceSettingsCard isLoading={false} onSave={() => undefined} />);

    expect(freeChoiceSwitch()).not.toBeChecked();
    expect(screen.getByText(/am längsten wartet/)).toBeVisible();
});
