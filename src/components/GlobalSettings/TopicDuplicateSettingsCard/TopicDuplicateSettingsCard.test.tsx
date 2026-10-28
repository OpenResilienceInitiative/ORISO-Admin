import '@ant-design/v5-patch-for-react-19';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { message } from 'antd';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { setSessionTokens, clearSessionTokens } from '../../../api/auth/tokenSessionStore';
import { TopicDuplicateSettingsCard, TopicDuplicateSettingsCardContainer } from '.';

const SAVED = 'Einstellungen wurden aktualisiert.';

let savedBodies: unknown[] = [];
const server = setupServer(http.get('*/service/settings', () => HttpResponse.json({})));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(async () => {
    server.resetHandlers();
    clearSessionTokens();
    // The save test ends this file with the success toast still open: antd's static
    // message API has its own React root and an auto-dismiss timer. Tear it down and
    // drain the scheduler here, or react-dom runs after this file's jsdom is gone and
    // crashes with "window is not defined" (same as InviteCsvImportModal.test.tsx).
    message.destroy();
    for (let i = 0; i < 20; i += 1) {
        // eslint-disable-next-line no-await-in-loop -- sequential drain, not parallelizable
        await new Promise((resolve) => {
            setImmediate(resolve);
        });
    }
});
beforeEach(async () => {
    savedBodies = [];
    setSessionTokens(
        `header.${btoa(
            JSON.stringify({ realm_access: { roles: ['agency-admin', 'tenant-admin'] }, tenantId: 0 }),
        )}.signature`,
        null,
    );
    await i18n.changeLanguage('de');
});

const options = () => screen.getAllByRole('radio');
const informExisting = () => screen.getByRole('radio', { name: 'Bisherige Berater:in einmal informieren' });

it('lists the four modes in order, only the first one selectable', async () => {
    render(<TopicDuplicateSettingsCard isLoading={false} onSave={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));

    expect(options().map((option) => option.closest('label')?.textContent)).toEqual([
        'Bisherige Berater:in einmal informieren',
        'Beide Beratungsstellen einmal informieren (soon)',
        'Beide Beratungsstellen bei jeder Nachricht informieren (soon)',
        'Themengleiche Beratung verbieten (soon)',
    ]);
    expect(informExisting()).toBeChecked();
    expect(informExisting()).toBeEnabled();
    options()
        .slice(1)
        .forEach((option) => expect(option).toBeDisabled());
});

/** ORISO rule: superadmin-only settings stay visible for everyone, they just cannot be edited. */
it('renders visible-but-not-editable when disabled', () => {
    render(<TopicDuplicateSettingsCard isLoading={false} onSave={() => undefined} disabled />);

    expect(informExisting()).toBeChecked();
    expect(informExisting()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).not.toBeInTheDocument();
});

it('sends the only available mode when saved', async () => {
    server.use(
        http.patch('*/service/settingsadmin', async ({ request }) => {
            savedBodies.push(await request.json());
            return new HttpResponse(null, { status: 204 });
        }),
    );
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <TopicDuplicateSettingsCardContainer />
        </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(await screen.findByText(SAVED)).toBeVisible();
    expect(savedBodies).toEqual([expect.objectContaining({ topicDuplicateMode: 'INFORM_EXISTING_COUNSELLOR_ONCE' })]);
});
