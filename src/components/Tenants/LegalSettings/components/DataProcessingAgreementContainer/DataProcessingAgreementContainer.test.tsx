import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataProcessingAgreementContainer } from './index';

const {
    useDpaVersions,
    publishMutate,
    useTranslation,
    useTenantAdminData,
    useUserData,
    useDpaGate,
    useDpaSignatures,
    createInviteApi,
    sendInviteEmailApi,
    userRoles,
} = vi.hoisted(() => ({
    useDpaVersions: vi.fn(),
    publishMutate: vi.fn(),
    useTranslation: vi.fn(),
    useTenantAdminData: vi.fn(),
    useUserData: vi.fn(),
    useDpaGate: vi.fn(),
    useDpaSignatures: vi.fn(),
    createInviteApi: vi.fn(),
    sendInviteEmailApi: vi.fn(),
    userRoles: {
        isSuperAdmin: true,
        isTenantScopedAdmin: false,
        tenantId: 0,
    },
}));

vi.mock('react-i18next', () => ({ useTranslation }));
vi.mock('../../../../../hooks/useDpaVersions.hook', () => ({ useDpaVersions }));
vi.mock('../../../../../hooks/useTenantAdminData.hook', () => ({ useTenantAdminData }));
vi.mock('../../../../../hooks/useUserData.hook', () => ({
    useUserData,
}));
vi.mock('../../../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => userRoles,
}));
vi.mock('../../../../../hooks/useDpaGate.hook', () => ({ useDpaGate }));
vi.mock('../../../../../hooks/useDpaSignatures.hook', () => ({ useDpaSignatures }));
vi.mock('../../../../../api/tenant/createDpaSignInvite', () => ({
    createDpaSignInvite: createInviteApi,
    resolveDpaSignLink: (link: string) => link,
}));
vi.mock('../../../../../api/tenant/sendDpaInviteEmail', () => ({
    sendDpaInviteEmail: sendInviteEmailApi,
}));

// Stub the heavy shared dialog (#723) — its own behaviour is covered by
// DpaForwardDialog.test.tsx; here only the container wiring matters.
vi.mock('../../../../DpaForwardDialog/DpaForwardDialog', () => ({
    DpaForwardDialog: ({ ensureSignLink, sendEmail, onClose, onForwarded }: any) => (
        <div data-testid="forward-dialog">
            <button
                type="button"
                onClick={async () => {
                    const link = await ensureSignLink();
                    await sendEmail({ recipientEmail: 'bart.simpson@oriso.org', recipientName: '', link });
                    onForwarded({ link, recipientEmail: 'bart.simpson@oriso.org' });
                }}
            >
                complete forward
            </button>
            <button type="button" onClick={onClose}>
                close forward
            </button>
        </div>
    ),
}));
vi.mock('../../../../../hooks/usePublishDpa.hook', () => ({
    usePublishDpa: () => ({ mutate: publishMutate, isPending: false }),
}));
vi.mock('../../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate: vi.fn(), isTranslating: false }),
}));

// Stub the card to a plain node that echoes props and exposes onPublish.
vi.mock('../DataProcessingAgreementCard', () => ({
    DataProcessingAgreementCard: ({
        initialContentByLanguage,
        languages,
        defaultLanguage,
        versions,
        readOnly,
        onPublish,
        dismissalScope,
    }: any) => {
        const [draft, setDraft] = React.useState('');
        return (
            <div
                data-testid="card"
                data-content={JSON.stringify(initialContentByLanguage)}
                data-languages={(languages ?? []).join(',')}
                data-default-language={defaultLanguage}
                data-labels={(versions ?? []).map((v: any) => v.label).join('|')}
                data-contents={(versions ?? []).map((v: any) => v.content).join('|')}
                data-read-only={readOnly ? 'true' : 'false'}
                data-dismissal-scope={dismissalScope}
            >
                <span data-testid="draft">{draft}</span>
                <button type="button" onClick={() => setDraft('unsaved draft')}>
                    edit draft
                </button>
                <button type="button" onClick={() => onPublish({ ...initialContentByLanguage, en: '<p>edited</p>' })}>
                    publish
                </button>
            </div>
        );
    },
}));

beforeEach(() => {
    publishMutate.mockClear();
    useDpaVersions.mockReset();
    useDpaVersions.mockReturnValue({ data: [] });
    useTranslation.mockReturnValue({
        t: (key: string) => key,
        i18n: { language: 'de-DE' },
    });
    useTenantAdminData.mockReturnValue({ data: { settings: { activeLanguages: ['de', 'en'] } } });
    useUserData.mockReturnValue({ data: { id: 'admin-1' } });
    useDpaGate.mockReturnValue({ data: { dpaPublished: true, dpaSigned: true }, isError: false });
    useDpaSignatures.mockReturnValue({ data: [], isError: false });
    createInviteApi.mockReset();
    sendInviteEmailApi.mockReset();
    userRoles.isSuperAdmin = true;
    userRoles.isTenantScopedAdmin = false;
    userRoles.tenantId = 0;
});

describe('DataProcessingAgreementContainer', () => {
    it('passes the complete latest content map and the editable languages to the card', () => {
        useDpaVersions.mockReturnValue({
            data: [
                {
                    activationDate: '2026-07-01T10:00:00',
                    content: '{"de":"<p>DE</p>","fr":"<p>FR</p>","de__meta":"m"}',
                },
            ],
        });
        render(<DataProcessingAgreementContainer tenantId={1} />);
        const card = screen.getByTestId('card');
        expect(JSON.parse(card.getAttribute('data-content') ?? '{}')).toEqual({
            de: '<p>DE</p>',
            fr: '<p>FR</p>',
            de__meta: 'm',
        });
        // active languages + stored fr, but never the metadata key
        expect(card).toHaveAttribute('data-languages', 'de,en,fr');
        // The container no longer forces the admin's UI language on the editor — the card
        // opens on the legal source language itself (#718).
        expect(card).not.toHaveAttribute('data-default-language');
    });

    it('marks the newest version as current and passes each version content through untouched', () => {
        useDpaVersions.mockReturnValue({
            data: [
                { activationDate: '2026-07-01T10:00:00', content: '{"de":"<p>neu</p>","en":"<p>new</p>"}' },
                { activationDate: '2026-05-01T09:00:00', content: '{"de":"<p>alt</p>"}' },
            ],
        });
        render(<DataProcessingAgreementContainer tenantId={1} />);
        const card = screen.getByTestId('card');
        const labels = (card.getAttribute('data-labels') ?? '').split('|');
        expect(labels[0]).toContain('tenants.legal.version.current');
        expect(labels[1]).not.toContain('tenants.legal.version.current');
        // The card picks the ACTIVE language per version itself (the container does not
        // know it), so it must receive the complete stored map of every version.
        expect(card).toHaveAttribute('data-contents', '{"de":"<p>neu</p>","en":"<p>new</p>"}|{"de":"<p>alt</p>"}');
    });

    it('publishes the complete merged map the card emits — other languages are kept', async () => {
        const user = userEvent.setup();
        useDpaVersions.mockReturnValue({
            data: [{ activationDate: '2026-07-01T10:00:00', content: '{"de":"<p>DE</p>"}' }],
        });
        render(<DataProcessingAgreementContainer tenantId={1} />);

        await user.click(screen.getByRole('button', { name: 'publish' }));

        expect(publishMutate).toHaveBeenCalledWith({ de: '<p>DE</p>', en: '<p>edited</p>' });
    });

    it('forwards read-only mode to the card', () => {
        render(<DataProcessingAgreementContainer tenantId={1} readOnly />);
        expect(screen.getByTestId('card')).toHaveAttribute('data-read-only', 'true');
    });

    it('disables the versions query when there is no usable tenant id', () => {
        render(<DataProcessingAgreementContainer tenantId="" />);
        expect(useDpaVersions).toHaveBeenCalledWith(0, false);
    });

    it('surfaces a load failure as an error alert with retry instead of an empty editor', async () => {
        const refetch = vi.fn();
        useDpaVersions.mockReturnValue({ data: undefined, isError: true, refetch });
        render(<DataProcessingAgreementContainer tenantId={1} />);

        // The editor card is withheld — editing a legal text on an unknown
        // current state could silently overwrite it.
        expect(screen.queryByTestId('card')).not.toBeInTheDocument();
        expect(screen.getByText('tenants.legal.version.loadError')).toBeInTheDocument();

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'tenants.legal.version.retry' }));
        expect(refetch).toHaveBeenCalled();
    });

    it('still renders the card when the versions load succeeds (no error alert)', () => {
        useDpaVersions.mockReturnValue({ data: [], isError: false, refetch: vi.fn() });
        render(<DataProcessingAgreementContainer tenantId={1} />);
        expect(screen.getByTestId('card')).toBeInTheDocument();
        expect(screen.queryByText('tenants.legal.version.loadError')).not.toBeInTheDocument();
    });

    it('keeps an unsaved draft when the opaque user identity resolves asynchronously', async () => {
        const user = userEvent.setup();
        useUserData.mockReturnValue({ data: undefined });
        const { rerender } = render(<DataProcessingAgreementContainer tenantId={1} />);

        await user.click(screen.getByRole('button', { name: 'edit draft' }));
        expect(screen.getByTestId('draft')).toHaveTextContent('unsaved draft');
        expect(screen.getByTestId('card')).not.toHaveAttribute('data-dismissal-scope');

        useUserData.mockReturnValue({ data: { id: 'resolved-admin' } });
        rerender(<DataProcessingAgreementContainer tenantId={1} />);

        expect(screen.getByTestId('draft')).toHaveTextContent('unsaved draft');
        expect(screen.getByTestId('card')).toHaveAttribute('data-dismissal-scope', '1:resolved-admin');
    });

    it('keeps the tenant DPA read-only and forwards through the shared dialog (#723)', async () => {
        userRoles.isSuperAdmin = false;
        userRoles.isTenantScopedAdmin = true;
        userRoles.tenantId = 84;
        useDpaGate.mockReturnValue({ data: { dpaPublished: true, dpaSigned: false }, isError: false });
        createInviteApi.mockResolvedValue({
            signLink: 'https://app.example/dpa-sign/secret',
            expiresAt: '2026-07-20T12:00:00Z',
        });
        sendInviteEmailApi.mockResolvedValue(undefined);

        const user = userEvent.setup();
        render(<DataProcessingAgreementContainer tenantId={84} />);

        expect(screen.getByTestId('card')).toHaveAttribute('data-read-only', 'true');
        expect(screen.queryByTestId('forward-dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'legal.dpa.sign.sendLink' }));
        expect(screen.getByTestId('forward-dialog')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'complete forward' }));

        expect(createInviteApi).toHaveBeenCalledWith(84);
        expect(sendInviteEmailApi).toHaveBeenCalledWith({
            tenantId: 84,
            recipientEmail: 'bart.simpson@oriso.org',
            signLink: 'https://app.example/dpa-sign/secret',
            expiresAt: '2026-07-20T12:00:00Z',
        });
        expect(await screen.findByText('legal.dpa.sign.sent')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'legal.dpa.sign.openLink' })).toBeInTheDocument();
        expect(screen.queryByTestId('forward-dialog')).not.toBeInTheDocument();
        expect(screen.queryByText(/secret/)).not.toBeInTheDocument();
    });

    it('reuses the created one-time link instead of minting a new token per open', async () => {
        userRoles.isSuperAdmin = false;
        userRoles.isTenantScopedAdmin = true;
        userRoles.tenantId = 84;
        useDpaGate.mockReturnValue({ data: { dpaPublished: true, dpaSigned: false }, isError: false });
        createInviteApi.mockResolvedValue({
            signLink: 'https://app.example/dpa-sign/secret',
            expiresAt: '2026-07-20T12:00:00Z',
        });
        sendInviteEmailApi.mockResolvedValue(undefined);

        const user = userEvent.setup();
        render(<DataProcessingAgreementContainer tenantId={84} />);

        await user.click(screen.getByRole('button', { name: 'legal.dpa.sign.sendLink' }));
        await user.click(screen.getByRole('button', { name: 'complete forward' }));
        await user.click(screen.getByRole('button', { name: 'legal.dpa.sign.sendLink' }));
        await user.click(screen.getByRole('button', { name: 'complete forward' }));

        expect(createInviteApi).toHaveBeenCalledTimes(1);
        expect(sendInviteEmailApi).toHaveBeenCalledTimes(2);
    });

    it('shows the confirmed signer identity and date to the tenant admin', () => {
        userRoles.isSuperAdmin = false;
        userRoles.isTenantScopedAdmin = true;
        userRoles.tenantId = 84;
        useDpaGate.mockReturnValue({ data: { dpaPublished: true, dpaSigned: true }, isError: false });
        useDpaSignatures.mockReturnValue({
            data: [
                {
                    status: 'SIGNED',
                    signerName: 'Erika E2E Mustermann',
                    signerPosition: 'Geschäftsführung',
                    signerEmail: 'erika.e2e.mustermann@oriso.org',
                    signerOrganisation: 'E2E Full Gate 202607191747',
                    signedAt: '2026-07-19T18:49:00Z',
                },
            ],
            isError: false,
        });

        render(<DataProcessingAgreementContainer tenantId={84} />);

        expect(screen.getByText('Erika E2E Mustermann')).toBeInTheDocument();
        expect(screen.getByText('Geschäftsführung')).toBeInTheDocument();
        expect(screen.getByText('erika.e2e.mustermann@oriso.org')).toBeInTheDocument();
        expect(screen.getByText('E2E Full Gate 202607191747')).toBeInTheDocument();
        expect(screen.getByText(/19\.07\.2026/)).toBeInTheDocument();
    });
});
