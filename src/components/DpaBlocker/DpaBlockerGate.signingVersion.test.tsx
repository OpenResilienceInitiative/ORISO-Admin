import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import i18n from 'i18next';
import '../../i18n';
import { clearSessionTokens } from '../../api/auth/tokenSessionStore';
import { setStoryAuth } from '../../utils/storybook/adminStoryDecorators';
import { UserRole } from '../../enums/UserRole';
import { DpaBlockerGate } from './DpaBlockerGate';

const oldVersion = '2026-07-01T12:00:00';
const newVersion = '2026-09-30T12:00:00';
let currentVersion = oldVersion;
const signedVersions: unknown[] = [];
const server = setupServer(
    http.get('*/service/tenantadmin/21/dpa/status', () =>
        HttpResponse.json({ tenantId: 21, status: 'UNSIGNED', currentDpaVersion: currentVersion }),
    ),
    http.get('*/service/tenantadmin/21/dpa/versions', () =>
        HttpResponse.json([
            {
                activationDate: currentVersion,
                signingDeadlineAt: '2099-10-30T14:30:00Z',
                content: JSON.stringify({ de: `<p>Vertrag ${currentVersion}</p>` }),
            },
        ]),
    ),
    http.post('*/service/tenantadmin/21/dpa/v2/sign', async ({ request }) => {
        const body = (await request.json()) as { dpaVersion?: string };
        signedVersions.push(body.dpaVersion);
        return body.dpaVersion === currentVersion
            ? HttpResponse.json({ tenantId: 21, status: 'VALID', currentDpaVersion: currentVersion })
            : new HttpResponse(null, { status: 409 });
    }),
);
beforeAll(async () => {
    await i18n.changeLanguage('de');
    server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
    server.resetHandlers();
    clearSessionTokens();
    signedVersions.length = 0;
    currentVersion = oldVersion;
    vi.restoreAllMocks();
});
afterAll(() => server.close());

it('signs the displayed version and reloads a stale contract before accepting again', async () => {
    setStoryAuth([UserRole.TenantAdmin], 21);
    const user = userEvent.setup();
    render(
        <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
        >
            <MemoryRouter>
                <DpaBlockerGate>
                    <div>Ongoing admin work</div>
                </DpaBlockerGate>
            </MemoryRouter>
        </QueryClientProvider>,
    );
    await screen.findByText(`Vertrag ${oldVersion}`);
    expect(screen.getByText(/Unterschriftsfrist:.*Europe\/Berlin/)).toBeVisible();
    const fillSigner = async () => {
        await user.type(screen.getByLabelText(i18n.t('tenantOnboarding.dpa.signerName')), 'Toni Tenantadmin');
        await user.type(screen.getByLabelText(i18n.t('tenantOnboarding.dpa.signerPosition')), 'Geschäftsführung');
        await user.type(screen.getByLabelText(i18n.t('tenantOnboarding.dpa.signerEmail')), 'toni@example.org');
        await user.click(screen.getByRole('checkbox', { name: i18n.t('tenantOnboarding.dpa.accept') }));
    };
    await fillSigner();
    currentVersion = newVersion; // The server publishes while the old contract remains on screen.
    await user.click(screen.getByRole('button', { name: i18n.t('dpaBlocker.sign.submit') }));
    await waitFor(() => expect(signedVersions).toEqual([oldVersion]));
    expect(screen.queryByText('Ongoing admin work')).not.toBeInTheDocument();
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: i18n.t('dpaBlocker.retry') }));
    await screen.findByText(`Vertrag ${newVersion}`);
    expect(screen.getByRole('checkbox', { name: i18n.t('tenantOnboarding.dpa.accept') })).not.toBeChecked();
    await fillSigner();
    await user.click(screen.getByRole('button', { name: i18n.t('dpaBlocker.sign.submit') }));
    await screen.findByText('Ongoing admin work');
    expect(signedVersions).toEqual([oldVersion, newVersion]);
});

it('does not unlock another tenant when a previous tenant signature finishes late', async () => {
    let finishSign!: () => void;
    const pending = new Promise<void>((resolve) => {
        finishSign = resolve;
    });
    server.use(
        http.post('*/service/tenantadmin/21/dpa/v2/sign', async () => {
            await pending;
            return HttpResponse.json({ tenantId: 21, status: 'VALID', currentDpaVersion: oldVersion });
        }),
        http.get('*/service/tenantadmin/22/dpa/status', () =>
            HttpResponse.json({ tenantId: 22, status: 'UNSIGNED', currentDpaVersion: newVersion }),
        ),
        http.get('*/service/tenantadmin/22/dpa/versions', () =>
            HttpResponse.json([{ activationDate: newVersion, content: '{"de":"<p>Contract for tenant B</p>"}' }]),
        ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const tree = () => (
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <DpaBlockerGate>
                    <div>Ongoing admin work</div>
                </DpaBlockerGate>
            </MemoryRouter>
        </QueryClientProvider>
    );
    setStoryAuth([UserRole.TenantAdmin], 21);
    const view = render(tree());
    await screen.findByText(`Vertrag ${oldVersion}`);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(i18n.t('tenantOnboarding.dpa.signerName')), 'Toni Tenantadmin');
    await user.type(screen.getByLabelText(i18n.t('tenantOnboarding.dpa.signerPosition')), 'Geschäftsführung');
    await user.type(screen.getByLabelText(i18n.t('tenantOnboarding.dpa.signerEmail')), 'toni@example.org');
    await user.click(screen.getByRole('checkbox', { name: i18n.t('tenantOnboarding.dpa.accept') }));
    await user.click(screen.getByRole('button', { name: i18n.t('dpaBlocker.sign.submit') }));
    setStoryAuth([UserRole.TenantAdmin], 22);
    view.rerender(tree());
    await screen.findByText('Contract for tenant B');
    await act(async () => {
        finishSign();
        await pending;
    });
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(screen.queryByText('Ongoing admin work')).not.toBeInTheDocument();
    expect(screen.getByText('Contract for tenant B')).toBeVisible();
});

it.each(['fresh', 'pending'])(
    'keeps a newly published contract blocked when the previous signature response arrives late with %s status',
    async (statusRefresh) => {
        let finishSign!: () => void;
        const pending = new Promise<void>((resolve) => {
            finishSign = resolve;
        });
        let finishStatus!: () => void;
        const statusPending = new Promise<void>((resolve) => {
            finishStatus = resolve;
        });
        server.use(
            http.post('*/service/tenantadmin/21/dpa/v2/sign', async () => {
                await pending;
                return HttpResponse.json({ tenantId: 21, status: 'VALID', currentDpaVersion: oldVersion });
            }),
            http.get('*/service/tenantadmin/21/dpa/status', async () => {
                if (statusRefresh === 'pending' && currentVersion === newVersion) await statusPending;
                return HttpResponse.json({ tenantId: 21, status: 'UNSIGNED', currentDpaVersion: currentVersion });
            }),
        );
        setStoryAuth([UserRole.TenantAdmin], 21);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        render(
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <DpaBlockerGate>
                        <div>Ongoing admin work</div>
                    </DpaBlockerGate>
                </MemoryRouter>
            </QueryClientProvider>,
        );
        const user = userEvent.setup();
        try {
            await screen.findByText(`Vertrag ${oldVersion}`);
            await user.type(screen.getByLabelText(i18n.t('tenantOnboarding.dpa.signerName')), 'Toni Tenantadmin');
            await user.type(screen.getByLabelText(i18n.t('tenantOnboarding.dpa.signerPosition')), 'Geschäftsführung');
            await user.type(screen.getByLabelText(i18n.t('tenantOnboarding.dpa.signerEmail')), 'toni@example.org');
            await user.click(screen.getByRole('checkbox', { name: i18n.t('tenantOnboarding.dpa.accept') }));
            await user.click(screen.getByRole('button', { name: i18n.t('dpaBlocker.sign.submit') }));
            currentVersion = newVersion;
            vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
            const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
            fireEvent(window, new Event('visibilitychange'));
            visibility.mockReturnValue('visible');
            fireEvent(window, new Event('visibilitychange'));
            await screen.findByText(`Vertrag ${newVersion}`);
            await act(async () => {
                finishSign();
                await pending;
            });
            await waitFor(() => expect(client.isMutating()).toBe(0));
            expect(screen.queryByText('Ongoing admin work')).not.toBeInTheDocument();
            expect(screen.getByText(`Vertrag ${newVersion}`)).toBeVisible();
        } finally {
            finishSign();
            finishStatus();
        }
    },
);
