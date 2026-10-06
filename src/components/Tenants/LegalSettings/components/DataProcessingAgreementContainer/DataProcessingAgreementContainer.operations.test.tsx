import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import i18n from 'i18next';
import '../../../../../i18n';
import { UserRole } from '../../../../../enums/UserRole';
import { setStoryAuth } from '../../../../../utils/storybook/adminStoryDecorators';
import { clearSessionTokens, setSessionTokens } from '../../../../../api/auth/tokenSessionStore';
import { DataProcessingAgreementContainer } from './index';
import { DpaBlockerGate } from '../../../../DpaBlocker/DpaBlockerGate';

const version = '2026-07-01T12:00:00';
const snapshot = {
    activationDate: version,
    signingDeadlineAt: '2099-10-30T14:30:00Z',
    content: '{"de":"<p>Current contract</p>","en":"<p>English contract</p>"}',
};
const server = setupServer(
    http.get('*/service/users/data', () => HttpResponse.json({ id: 'legal-admin' })),
    http.get('*/service/tenant/public/*', () =>
        HttpResponse.json({ id: 7, settings: { activeLanguages: ['de', 'en'] } }),
    ),
    http.get('*/service/tenant', () => HttpResponse.json({ id: 7, settings: { activeLanguages: ['de', 'en'] } })),
    http.get('*/service/tenant/:id', () => HttpResponse.json({ id: 7, settings: { activeLanguages: ['de', 'en'] } })),
    http.post('*/service/useradmin/dpa-invites/preview', () =>
        HttpResponse.json({ subject: 'AVV', html: '<p>Mail preview</p>' }),
    ),
    http.get('*/service/tenantadmin/7/dpa/versions', () => HttpResponse.json([snapshot])),
    http.get('*/service/tenantadmin/7/dpa/status', () =>
        HttpResponse.json({
            tenantId: 7,
            status: 'OUTDATED',
            currentDpaVersion: version,
            signedDpaVersion: '2026-05-01T09:00:00',
            signedAt: '2026-05-02T10:00:00Z',
            signedBy: 'Erika Mustermann',
        }),
    ),
    http.get('*/service/tenantadmin/7/dpa/gate', () =>
        HttpResponse.json({
            dpaPublished: true,
            dpaSigned: false,
            dpaStatus: 'OUTDATED',
            currentDpaVersion: version,
            signingDeadlineAt: snapshot.signingDeadlineAt,
            newCounsellingAllowed: false,
            renewalGraceActive: false,
        }),
    ),
);
beforeAll(async () => {
    await i18n.changeLanguage('de');
    server.listen({ onUnhandledRequest: 'error' });
});
beforeEach(() => {
    setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0);
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: () => ({
            matches: false,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
        }),
    });
});

const renderLegal = (readOnly = false) =>
    render(
        <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
        >
            <MemoryRouter>
                <DataProcessingAgreementContainer tenantId={7} readOnly={readOnly} />
            </MemoryRouter>
        </QueryClientProvider>,
    );

it('retains the earlier signature while the governing contract still requires confirmation', async () => {
    setStoryAuth([UserRole.TenantAdmin], 7);
    renderLegal();
    await screen.findByText('Current contract');
    expect(
        await screen.findByText('Frühere Unterschrift bleibt erhalten. Die aktuelle Fassung ist noch offen.'),
    ).toBeVisible();
    expect(screen.getByText(/Erika Mustermann/)).toBeVisible();
    expect(screen.getByText(/01\.05\.2026/)).toBeVisible();
    expect(screen.getByText(/02\.05\.2026/)).toBeVisible();
    expect(screen.queryByText(i18n.t('legal.dpa.deadline.state.VALID'))).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('legal.dpa.sign.sendLink') })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Veröffentlichen' })).not.toBeInTheDocument();
});

it('shows retained evidence inside the global renewal gate without resetting the verified page', async () => {
    setStoryAuth([UserRole.TenantAdmin], 7);
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter>
                <DpaBlockerGate>
                    <DataProcessingAgreementContainer tenantId={7} />
                </DpaBlockerGate>
            </MemoryRouter>
        </QueryClientProvider>,
    );
    expect(await screen.findByText(/Erika Mustermann/)).toBeVisible();
    expect(screen.getByText('Current contract')).toBeVisible();
    expect(screen.getByRole('button', { name: i18n.t('legal.dpa.sign.sendLink') })).toBeVisible();
});

it('shows the authoritative current confirmation instead of an earlier forwarded signature', async () => {
    setStoryAuth([UserRole.SingleTenantAdmin], 7);
    server.use(
        http.get('*/service/tenantadmin/7/dpa/status', () =>
            HttpResponse.json({
                tenantId: 7,
                status: 'VALID',
                currentDpaVersion: version,
                signedDpaVersion: version,
                signedAt: '2026-07-02T10:00:00Z',
                signedBy: 'Current authorised signatory',
            }),
        ),
        http.get('*/service/tenantadmin/7/dpa/gate', () =>
            HttpResponse.json({ dpaPublished: true, dpaSigned: true, dpaStatus: 'VALID', currentDpaVersion: version }),
        ),
        http.get('*/service/tenantadmin/7/dpa/signatures', () =>
            HttpResponse.json([
                { status: 'SIGNED', signerName: 'Earlier forwarded signatory', signedAt: '2026-05-02T10:00:00Z' },
            ]),
        ),
    );
    renderLegal();
    expect(await screen.findByText(/Current authorised signatory/)).toBeVisible();
    expect(screen.getByText(/Unterschriebene Fassung vom 01\.07\.2026/)).toBeVisible();
    expect(screen.queryByText(/Earlier forwarded signatory/)).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('legal.dpa.sign.previousRetained'))).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('legal.dpa.sign.sendLink') })).not.toBeInTheDocument();
});

it.each([
    { tenantId: 7, status: 'UNSIGNED', currentDpaVersion: version },
    { tenantId: 8, status: 'OUTDATED', currentDpaVersion: version },
    { tenantId: 7, status: 'VALID', currentDpaVersion: '2026-05-01T09:00:00' },
])('withholds signature evidence that does not belong to this tenant and governing confirmation: %j', async (state) => {
    setStoryAuth([UserRole.TenantAdmin], 7);
    server.use(
        http.get('*/service/tenantadmin/7/dpa/status', () =>
            HttpResponse.json({
                ...state,
                signedDpaVersion: '2026-05-01T09:00:00',
                signedAt: '2026-05-02T10:00:00Z',
                signedBy: 'Unrelated confirmation',
            }),
        ),
    );
    renderLegal();
    await screen.findByText('Current contract');
    expect(screen.queryByText(/Unrelated confirmation/)).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('legal.dpa.sign.previousRetained'))).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('legal.dpa.sign.sendLink') })).toBeVisible();
});

it('keeps contract recovery available when signature details fail and displays them after retry', async () => {
    setStoryAuth([UserRole.TenantAdmin], 7);
    let unavailable = true;
    server.use(
        http.get('*/service/tenantadmin/7/dpa/status', () =>
            unavailable
                ? new HttpResponse(null, { status: 503 })
                : HttpResponse.json({
                      tenantId: 7,
                      status: 'OUTDATED',
                      currentDpaVersion: version,
                      signedDpaVersion: '2026-05-01T09:00:00',
                      signedAt: '2026-05-02T10:00:00Z',
                      signedBy: 'Recovered signatory',
                  }),
        ),
    );
    renderLegal();
    expect(await screen.findByText(i18n.t('legal.dpa.sign.detailsLoadError'))).toBeVisible();
    expect(screen.getByRole('button', { name: i18n.t('legal.dpa.sign.sendLink') })).toBeVisible();
    expect(screen.queryByText(i18n.t('legal.dpa.sign.previousRetained'))).not.toBeInTheDocument();
    unavailable = false;
    await userEvent.click(screen.getByRole('button', { name: i18n.t('tenants.legal.version.retry') }));
    expect(await screen.findByText(/Recovered signatory/)).toBeVisible();
    expect(screen.queryByText(i18n.t('legal.dpa.sign.detailsLoadError'))).not.toBeInTheDocument();
});

it('keeps a late signature response from the previous tenant out of the new tenant view', async () => {
    setStoryAuth([UserRole.TenantAdmin], 7);
    let finishFirst!: () => void;
    const pending = new Promise<void>((resolve) => {
        finishFirst = resolve;
    });
    let responseDelivered!: () => void;
    const delivered = new Promise<void>((resolve) => {
        responseDelivered = resolve;
    });
    server.use(
        http.get('*/service/tenantadmin/7/dpa/status', async () => {
            await pending;
            responseDelivered();
            return HttpResponse.json({
                tenantId: 7,
                status: 'OUTDATED',
                currentDpaVersion: version,
                signedDpaVersion: '2026-05-01T09:00:00',
                signedAt: '2026-05-02T10:00:00Z',
                signedBy: 'Previous tenant signatory',
            });
        }),
        http.get('*/service/tenantadmin/8/dpa/versions', () =>
            HttpResponse.json([{ ...snapshot, content: '{"de":"<p>Other tenant contract</p>"}' }]),
        ),
        http.get('*/service/tenantadmin/8/dpa/gate', () =>
            HttpResponse.json({
                dpaPublished: true,
                dpaSigned: false,
                dpaStatus: 'OUTDATED',
                currentDpaVersion: version,
            }),
        ),
        http.get('*/service/tenantadmin/8/dpa/status', () =>
            HttpResponse.json({
                tenantId: 8,
                status: 'OUTDATED',
                currentDpaVersion: version,
                signedDpaVersion: '2026-05-01T09:00:00',
                signedAt: '2026-05-02T10:00:00Z',
                signedBy: 'New tenant signatory',
            }),
        ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = (tenantId: number) => (
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <DataProcessingAgreementContainer tenantId={tenantId} />
            </MemoryRouter>
        </QueryClientProvider>
    );
    const rendered = render(view(7));
    try {
        await screen.findByText('Current contract');
        setStoryAuth([UserRole.TenantAdmin], 8);
        rendered.rerender(view(8));
        expect(await screen.findByText(/New tenant signatory/)).toBeVisible();
        await act(async () => {
            finishFirst();
            await delivered;
        });
        expect(screen.queryByText(/Previous tenant signatory/)).not.toBeInTheDocument();
        expect(screen.getByText('Other tenant contract')).toBeVisible();
    } finally {
        finishFirst();
    }
});

it.each([UserRole.TenantAdmin, UserRole.SingleTenantAdmin])(
    'keeps %s renewal read-only with a fresh signing invitation after expiry or publication change',
    async (recipientRole) => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-01T10:00:00Z'));
        setStoryAuth([recipientRole], 7);
        let invitation = 0;
        let renewed = false;
        server.use(
            http.post('*/service/tenantadmin/7/dpa/invite', () => {
                invitation += 1;
                return HttpResponse.json({
                    signLink: `https://example.org/dpa?token=invite-${invitation}`,
                    expiresAt: new Date(Date.now() + 86_400_000).toISOString().slice(0, 19),
                });
            }),
            http.get('*/service/tenantadmin/7/dpa/versions', () =>
                HttpResponse.json([
                    {
                        ...snapshot,
                        activationDate: renewed ? '2026-09-30T12:00:00' : version,
                        content: renewed ? '{"de":"<p>Renewed contract</p>"}' : snapshot.content,
                    },
                ]),
            ),
            http.get('*/service/tenantadmin/7/dpa/gate', () =>
                HttpResponse.json({
                    dpaPublished: true,
                    dpaSigned: false,
                    dpaStatus: 'OUTDATED',
                    currentDpaVersion: renewed ? '2026-09-30T12:00:00' : version,
                    signingDeadlineAt: '2020-01-01T12:00:00Z',
                    newCounsellingAllowed: false,
                    renewalGraceActive: false,
                }),
            ),
        );
        renderLegal();
        const user = userEvent.setup();
        const requestLink = async (expected: number) => {
            await user.click(await screen.findByRole('button', { name: i18n.t('legal.dpa.sign.sendLink') }));
            const dialog = await screen.findByRole('dialog');
            await waitFor(() => expect(dialog).toBeVisible());
            const dialogView = within(dialog);
            const linkSection = within(dialogView.getByTestId('dpa-forward-link-section'));
            await user.click(linkSection.getByRole('button', { name: i18n.t('dpaForward.dialog.linkCreate') }));
            const field = await dialogView.findByDisplayValue(`https://example.org/dpa?token=invite-${expected}`);
            await waitFor(() => expect(field).toBeVisible());
            await user.click(dialogView.getByRole('button', { name: i18n.t('dpaForward.dialog.confirm') }));
            await waitFor(() => expect(dialog).not.toBeInTheDocument());
        };
        await screen.findByText('Current contract');
        expect(await screen.findByText(i18n.t('legal.dpa.deadline.blockedRenewal'))).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Veröffentlichen' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^(Bearbeiten|Entwurf bearbeiten)$/ })).not.toBeInTheDocument();
        expect(document.querySelector('[contenteditable="true"]')).not.toBeInTheDocument();
        await requestLink(1);
        expect(screen.getByRole('button', { name: i18n.t('legal.dpa.sign.openLink') })).toBeVisible();
        await requestLink(1);
        now.mockReturnValue(Date.parse('2026-10-03T10:00:00Z'));
        await requestLink(2);
        renewed = true;
        const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        fireEvent(window, new Event('visibilitychange'));
        visibility.mockReturnValue('visible');
        fireEvent(window, new Event('visibilitychange'));
        await screen.findByText('Renewed contract');
        await requestLink(3);
    },
);
afterEach(() => {
    server.resetHandlers();
    clearSessionTokens();
    localStorage.clear();
    vi.restoreAllMocks();
});
afterAll(() => server.close());

it('shows the authoritative renewal state in the platform remote tenant view', async () => {
    renderLegal();
    await screen.findByText('Current contract');
    expect(await screen.findByText(i18n.t('legal.dpa.deadline.state.OUTDATED'))).toBeVisible();
    expect(screen.getByText(i18n.t('legal.dpa.deadline.blockedRenewal'))).toBeVisible();
});

it('reloads a changed governing version before showing its deadline beside the contract', async () => {
    let versionsRead = 0;
    let finishReload!: () => void;
    const pending = new Promise<void>((resolve) => {
        finishReload = resolve;
    });
    const nextVersion = '2026-09-30T12:00:00';
    server.use(
        http.get('*/service/tenantadmin/7/dpa/versions', async () => {
            versionsRead += 1;
            if (versionsRead === 1) return HttpResponse.json([{ ...snapshot, signingDeadlineAt: undefined }]);
            await pending;
            return HttpResponse.json([
                {
                    activationDate: nextVersion,
                    signingDeadlineAt: '2099-11-15T14:30:00Z',
                    content: '{"de":"<p>Renewed contract</p>"}',
                },
            ]);
        }),
        http.get('*/service/tenantadmin/7/dpa/gate', () =>
            HttpResponse.json({
                dpaPublished: true,
                dpaSigned: false,
                dpaStatus: 'OUTDATED',
                currentDpaVersion: nextVersion,
                signingDeadlineAt: '2099-11-15T14:30:00Z',
                newCounsellingAllowed: false,
            }),
        ),
    );
    renderLegal(true);
    try {
        await screen.findByText('Current contract');
        expect(screen.queryByText(/15\.11\.2099/)).not.toBeInTheDocument();
        finishReload();
        expect(await screen.findByText('Renewed contract')).toBeVisible();
        expect(screen.getByText(/15\.11\.2099/)).toBeVisible();
    } finally {
        finishReload();
    }
});

it('does not show a previous signature-load error beside a different governing publication', async () => {
    const initialTime = Date.parse('2026-10-01T10:00:00Z');
    const now = vi.spyOn(Date, 'now').mockReturnValue(initialTime);
    setStoryAuth([UserRole.SingleTenantAdmin], 7);
    let renewed = false;
    let reloadStarted = false;
    let finishReload!: () => void;
    const pending = new Promise<void>((resolve) => {
        finishReload = resolve;
    });
    const nextVersion = '2026-09-30T12:00:00';
    server.use(
        http.get('*/service/tenantadmin/7/dpa/status', () =>
            HttpResponse.json({ message: 'Unavailable' }, { status: 503 }),
        ),
        http.get('*/service/tenantadmin/7/dpa/gate', () =>
            HttpResponse.json({
                dpaPublished: true,
                dpaSigned: true,
                dpaStatus: 'VALID',
                currentDpaVersion: renewed ? nextVersion : version,
            }),
        ),
        http.get('*/service/tenantadmin/7/dpa/versions', async () => {
            if (!renewed) return HttpResponse.json([snapshot]);
            reloadStarted = true;
            await pending;
            return HttpResponse.json([{ ...snapshot, activationDate: nextVersion }]);
        }),
    );
    renderLegal();
    try {
        expect(await screen.findByText(i18n.t('legal.dpa.sign.detailsLoadError'))).toBeVisible();
        renewed = true;
        now.mockReturnValue(initialTime + 31_000);
        const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        fireEvent(window, new Event('visibilitychange'));
        visibility.mockReturnValue('visible');
        fireEvent(window, new Event('visibilitychange'));
        await waitFor(() => expect(reloadStarted).toBe(true));
        expect(screen.getByText('Current contract')).toBeVisible();
        expect(screen.queryByText(i18n.t('legal.dpa.sign.detailsLoadError'))).not.toBeInTheDocument();
    } finally {
        finishReload();
    }
});

it('keeps a late invitation from the previous account out of the current forwarding dialog', async () => {
    const authenticate = (sub: string) => {
        const claims = btoa(
            JSON.stringify({ sub, realm_access: { roles: [UserRole.TenantAdmin] }, tenantId: 7, exp: 9_999_999_999 }),
        );
        setSessionTokens(`${btoa('{"alg":"none"}')}.${claims}.fixture`, 'fixture-refresh');
    };
    authenticate('first-admin');
    let finishFirst!: () => void;
    const pending = new Promise<void>((resolve) => {
        finishFirst = resolve;
    });
    let invites = 0;
    server.use(
        http.post('*/service/tenantadmin/7/dpa/invite', async () => {
            invites += 1;
            const number = invites;
            if (number === 1) await pending;
            return HttpResponse.json({
                signLink: `https://example.org/dpa?token=account-${number}`,
                expiresAt: '2099-11-01T12:00:00',
            });
        }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const view = () => (
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <DataProcessingAgreementContainer tenantId={7} />
            </MemoryRouter>
        </QueryClientProvider>
    );
    const rendered = render(view());
    const user = userEvent.setup();
    const openLink = async () => {
        await user.click(await screen.findByRole('button', { name: i18n.t('legal.dpa.sign.sendLink') }));
        await user.click(await screen.findByRole('button', { name: i18n.t('dpaForward.dialog.linkCreate') }));
    };
    try {
        await screen.findByText('Current contract');
        await openLink();
        await waitFor(() => expect(invites).toBe(1));
        authenticate('second-admin');
        rendered.rerender(view());
        await openLink();
        expect(await screen.findByDisplayValue('https://example.org/dpa?token=account-2')).toBeVisible();
        finishFirst();
        await waitFor(() =>
            expect(screen.queryByDisplayValue('https://example.org/dpa?token=account-1')).not.toBeInTheDocument(),
        );
        expect(screen.getByDisplayValue('https://example.org/dpa?token=account-2')).toBeVisible();
    } finally {
        finishFirst();
    }
});

it.each(['cancel', 'failure'])('retains generated translations in the editor after deadline %s', async (outcome) => {
    server.use(
        http.post('*/service/tenantadmin/translate', () =>
            HttpResponse.json({
                translations: { en: { content: '<p>Generated English contract</p>' } },
                provider: 'fixture',
                model: 'fixture',
            }),
        ),
        http.put('*/service/tenantadmin/7/dpa/v2', () =>
            HttpResponse.json({ message: 'Unavailable' }, { status: 503 }),
        ),
    );
    renderLegal();
    const user = userEvent.setup();
    await screen.findByText('Current contract');
    await user.click(screen.getByRole('button', { name: 'Veröffentlichen' }));
    const translation = await screen.findByRole('dialog', { name: 'Automatisch übersetzen & veröffentlichen' });
    await user.click(within(translation).getByRole('button', { name: 'Übersetzen & veröffentlichen' }));
    const deadline = await screen.findByRole('dialog', { name: /AVV veröffentlichen/ });
    if (outcome === 'cancel') {
        await user.click(within(deadline).getByRole('button', { name: 'Abbrechen' }));
    } else {
        fireEvent.change(within(deadline).getByLabelText('Unterschriftsfrist (Europe/Berlin)'), {
            target: { value: '2099-11-01T12:00' },
        });
        await user.click(within(deadline).getByRole('button', { name: 'Veröffentlichen' }));
        expect(await screen.findByText(i18n.t('tenants.legal.version.publishError'))).toBeVisible();
    }
    await user.click(screen.getByRole('button', { name: /Sprachen: Deutsch/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Englisch/ }));
    expect(await screen.findByText('Generated English contract')).toBeVisible();
});
