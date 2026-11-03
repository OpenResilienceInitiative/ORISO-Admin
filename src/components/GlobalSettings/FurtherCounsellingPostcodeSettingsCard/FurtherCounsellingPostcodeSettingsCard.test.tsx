import '@ant-design/v5-patch-for-react-19';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { setSessionTokens, clearSessionTokens } from '../../../api/auth/tokenSessionStore';
import { FurtherCounsellingPostcodeSettingsCard, FurtherCounsellingPostcodeSettingsCardContainer } from '.';

const SAVED = 'Einstellungen wurden aktualisiert.';
const SAVE_FAILED = 'Die Einstellung „PLZ bei weiterer Beratung“ konnte nicht gespeichert werden.';

let savedBodies: unknown[] = [];
const server = setupServer(http.get('*/service/settings', () => HttpResponse.json({})));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    clearSessionTokens();
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

const answerSaveWith = (status: number) =>
    server.use(
        http.patch('*/service/settingsadmin', async ({ request }) => {
            savedBodies.push(await request.json());
            return new HttpResponse(null, { status });
        }),
    );

const smartOption = () => screen.getByRole('radio', { name: /zuletzt eingegebene PLZ/ });
const alwaysEmptyOption = () => screen.getByRole('radio', { name: 'PLZ immer neu eingeben' });

const chooseAlwaysEmptyAndSave = async () => {
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <FurtherCounsellingPostcodeSettingsCardContainer />
        </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(alwaysEmptyOption());
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
};

it('selects Smart when the server has no value yet', () => {
    render(<FurtherCounsellingPostcodeSettingsCard isLoading={false} onSave={() => undefined} />);

    expect(smartOption()).toBeChecked();
    expect(alwaysEmptyOption()).not.toBeChecked();
});

/** ORISO rule: superadmin-only settings stay visible for everyone, they just cannot be edited. */
it('renders visible-but-not-editable when disabled', () => {
    render(
        <FurtherCounsellingPostcodeSettingsCard
            mode="ALWAYS_EMPTY"
            isLoading={false}
            onSave={() => undefined}
            disabled
        />,
    );

    expect(alwaysEmptyOption()).toBeChecked();
    expect(alwaysEmptyOption()).toBeDisabled();
    expect(smartOption()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).not.toBeInTheDocument();
});

it('sends the chosen mode and confirms the change', async () => {
    answerSaveWith(204);
    await chooseAlwaysEmptyAndSave();
    expect(await screen.findByText(SAVED)).toBeVisible();
    expect(savedBodies).toEqual([expect.objectContaining({ furtherCounsellingPostcodeMode: 'ALWAYS_EMPTY' })]);
    expect(screen.queryByText(SAVE_FAILED)).not.toBeInTheDocument();
});

it('tells the admin that saving failed and keeps the attempted value', async () => {
    answerSaveWith(500);
    await chooseAlwaysEmptyAndSave();
    expect(await screen.findByText(SAVE_FAILED)).toBeVisible();
    await waitFor(() => expect(alwaysEmptyOption()).toBeEnabled());
    expect(alwaysEmptyOption()).toBeChecked();
    expect(screen.queryByText(SAVED)).not.toBeInTheDocument();
});
