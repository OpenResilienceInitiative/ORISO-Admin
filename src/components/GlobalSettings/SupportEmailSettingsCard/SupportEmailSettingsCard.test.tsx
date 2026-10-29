import '@ant-design/v5-patch-for-react-19';
import { useEffect, useState, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { setSessionTokens, clearSessionTokens } from '../../../api/auth/tokenSessionStore';
import { UseAppConfigProvider, useAppConfigContext } from '../../../context/useAppConfig';
import { SupportEmailSettingsCard, SupportEmailSettingsCardContainer } from '.';

const SAVED = 'Einstellungen wurden aktualisiert.';
const SAVE_FAILED = 'Die Support-E-Mail-Adresse konnte nicht gespeichert werden.';

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

const emailInput = () => screen.getByLabelText('Support-E-Mail-Adresse');

const renderContainer = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <SupportEmailSettingsCardContainer />
        </QueryClientProvider>,
    );

const typeAndSave = async (value: string) => {
    renderContainer();
    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.clear(emailInput());
    if (value) await userEvent.type(emailInput(), value);
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
};

it('shows the stored address and renders read-only for non-superadmins', () => {
    render(<SupportEmailSettingsCard value="hilfe@example.org" isLoading={false} onSave={vi.fn()} disabled />);

    expect(emailInput()).toHaveValue('hilfe@example.org');
    expect(emailInput()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).not.toBeInTheDocument();
});

/** Mirrors AppSettingsWrapper: children mount only after the settings are seeded. */
const SeedSupportEmail = ({ value, children }: { value: string; children: ReactNode }) => {
    const { setManualSettings } = useAppConfigContext();
    const [seeded, setSeeded] = useState(false);
    useEffect(() => {
        setManualSettings({ supportEmail: value });
        setSeeded(true);
    }, [setManualSettings, value]);
    return seeded ? children : null;
};

it('maps settings.supportEmail from the app config onto the card', async () => {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <UseAppConfigProvider>
                <SeedSupportEmail value="konfiguriert@example.org">
                    <SupportEmailSettingsCardContainer />
                </SeedSupportEmail>
            </UseAppConfigProvider>
        </QueryClientProvider>,
    );
    expect(await screen.findByLabelText('Support-E-Mail-Adresse')).toHaveValue('konfiguriert@example.org');
});

it('renders an empty field when nothing is configured', () => {
    render(<SupportEmailSettingsCard isLoading={false} onSave={vi.fn()} />);
    expect(emailInput()).toHaveValue('');
});

it('saves the trimmed address through PATCH /settingsadmin', async () => {
    answerSaveWith(204);
    await typeAndSave('  hilfe@example.org ');
    expect(await screen.findByText(SAVED)).toBeVisible();
    expect(savedBodies).toEqual([expect.objectContaining({ supportEmail: 'hilfe@example.org' })]);
});

it('clears the address by saving an empty value', async () => {
    answerSaveWith(204);
    await typeAndSave('');
    expect(await screen.findByText(SAVED)).toBeVisible();
    expect(savedBodies).toEqual([expect.objectContaining({ supportEmail: '' })]);
});

it('rejects an invalid address without calling the server', async () => {
    answerSaveWith(204);
    await typeAndSave('kein-email');
    expect(await screen.findByText('Die E-Mail-Adresse ist nicht gültig.')).toBeVisible();
    expect(savedBodies).toHaveLength(0);
});

it('limits the field to 254 characters', async () => {
    render(<SupportEmailSettingsCard isLoading={false} onSave={vi.fn()} />);
    expect(emailInput()).toHaveAttribute('maxlength', '254');
});

it.each([400, 500])('tells the admin that saving failed with HTTP %i and keeps the form open', async (status) => {
    answerSaveWith(status);
    await typeAndSave('hilfe@example.org');
    expect(await screen.findByText(SAVE_FAILED)).toBeVisible();
    await waitFor(() => expect(emailInput()).toBeEnabled());
    expect(emailInput()).toHaveValue('hilfe@example.org');
    expect(screen.queryByText(SAVED)).not.toBeInTheDocument();
});
