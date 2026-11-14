import '@ant-design/v5-patch-for-react-19';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useEffect, useState, type ReactNode } from 'react';
import i18n from '../../../i18n';
import { setSessionTokens, clearSessionTokens } from '../../../api/auth/tokenSessionStore';
import { UseAppConfigProvider, useAppConfigContext } from '../../../context/useAppConfig';
import { ChatMessageSettingsCardContainer } from '.';
import { parseChatMessageSettings } from './chatMessageSettings';
import { apiServerSettings } from '../../../api/settings/apiServerSettings';

const SAVE_FAILED = 'Die Chat-Einstellungen konnten nicht gespeichert werden.';

let savedBodies: Record<string, unknown>[] = [];
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
            savedBodies.push((await request.json()) as Record<string, unknown>);
            return new HttpResponse(null, { status });
        }),
    );

const SeedSettings = ({ children }: { children: ReactNode }) => {
    const { setManualSettings } = useAppConfigContext();
    const [ready, setReady] = useState(false);
    useEffect(() => {
        setManualSettings({ chatComposerDisabledFormats: 'bold' });
        setReady(true);
    }, [setManualSettings]);
    return ready ? children : null;
};

/** Loads settings from the server before rendering, like `AppSettingsWrapper` in the app. */
const LoadServerSettings = ({ children }: { children: ReactNode }) => {
    const { setServerSettings } = useAppConfigContext();
    const [ready, setReady] = useState(false);
    useEffect(() => {
        apiServerSettings()
            .then(setServerSettings)
            .finally(() => setReady(true));
    }, [setServerSettings]);
    return ready ? children : null;
};

const renderContainer = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <UseAppConfigProvider>
                <SeedSettings>
                    <ChatMessageSettingsCardContainer />
                </SeedSettings>
            </UseAppConfigProvider>
        </QueryClientProvider>,
    );

const reEnableBoldAndSave = async () => {
    renderContainer();
    await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Fett' }));
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
};

describe('ChatMessageSettingsCardContainer', () => {
    it('reads the stored list from settings and sends the patch under the backend field names', async () => {
        answerSaveWith(200);
        await reEnableBoldAndSave();
        await waitFor(() => expect(savedBodies).toHaveLength(1));
        expect(savedBodies[0]).toMatchObject({
            chatComposerDisabledFormats: [],
            chatMessageMaxWidthDesktop: 770,
            chatMessageCollapseThreshold: 300,
        });
    });

    it('reads back what it saved after a reload', async () => {
        // Stateful backend: PATCH stores the fields, GET serves them as strings like the real service.
        const stored: Record<string, unknown> = { chatComposerDisabledFormats: 'bold' };
        server.use(
            http.get('*/service/settings', () =>
                HttpResponse.json(
                    Object.fromEntries(
                        Object.entries(stored).map(([key, value]) => [
                            key,
                            { value: Array.isArray(value) ? value.join(',') : String(value) },
                        ]),
                    ),
                ),
            ),
            http.patch('*/service/settingsadmin', async ({ request }) => {
                Object.assign(stored, (await request.json()) as Record<string, unknown>);
                return new HttpResponse(null, { status: 200 });
            }),
        );
        const renderUnseeded = () =>
            render(
                <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                    <UseAppConfigProvider>
                        <LoadServerSettings>
                            <ChatMessageSettingsCardContainer />
                        </LoadServerSettings>
                    </UseAppConfigProvider>
                </QueryClientProvider>,
            );

        const first = renderUnseeded();
        await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
        await waitFor(() => expect(screen.getByRole('switch', { name: 'Fett' })).not.toBeChecked());
        await userEvent.click(screen.getByRole('switch', { name: 'Fett' }));
        const width = screen.getByLabelText(/Maximale Breite in Pixeln/);
        await userEvent.clear(width);
        await userEvent.type(width, '900');
        const threshold = screen.getByLabelText(/Einklappen ab so vielen Zeichen/);
        await userEvent.clear(threshold);
        await userEvent.type(threshold, '500');
        await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
        await waitFor(() => expect(stored.chatMessageMaxWidthDesktop).toBe(900));
        first.unmount();

        renderUnseeded();
        await userEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
        await waitFor(() => expect(screen.getByRole('switch', { name: 'Fett' })).toBeChecked());
        expect(screen.getByLabelText(/Maximale Breite in Pixeln/)).toHaveValue(900);
        expect(screen.getByLabelText(/Einklappen ab so vielen Zeichen/)).toHaveValue(500);
    });

    it('tells the admin when the save fails', async () => {
        answerSaveWith(500);
        await reEnableBoldAndSave();
        expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    });
});

describe('parseChatMessageSettings', () => {
    it('keeps today behaviour when the backend does not send the fields', () => {
        expect(parseChatMessageSettings({})).toEqual({ disabledFormats: [], maxWidth: 770, collapseThreshold: 300 });
    });

    it('reads the stored strings and drops keys it does not know', () => {
        expect(
            parseChatMessageSettings({
                disabledFormats: 'bold, blink,heading',
                maxWidth: '900',
                collapseThreshold: '0',
            }),
        ).toEqual({ disabledFormats: ['heading', 'bold'], maxWidth: 900, collapseThreshold: 0 });
    });

    it('accepts the array and numbers held right after a save', () => {
        expect(parseChatMessageSettings({ disabledFormats: ['link'], maxWidth: 500, collapseThreshold: 80 })).toEqual({
            disabledFormats: ['link'],
            maxWidth: 500,
            collapseThreshold: 80,
        });
    });
});
