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
    createInviteMutate,
    sendInviteEmailMutate,
    userRoles,
} = vi.hoisted(() => ({
    useDpaVersions: vi.fn(),
    publishMutate: vi.fn(),
    useTranslation: vi.fn(),
    useTenantAdminData: vi.fn(),
    useUserData: vi.fn(),
    useDpaGate: vi.fn(),
    useDpaSignatures: vi.fn(),
    createInviteMutate: vi.fn(),
    sendInviteEmailMutate: vi.fn(),
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
vi.mock('../../../../../hooks/useCreateDpaInvite.hook', () => ({
    useCreateDpaInvite: () => ({ mutate: createInviteMutate, isPending: false }),
}));
vi.mock('../../../../../hooks/useSendDpaInviteEmail.hook', () => ({
    useSendDpaInviteEmail: () => ({ mutate: sendInviteEmailMutate, isPending: false }),
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
        onSaveDraft,
        draftSavedAt,
        draftStale,
        onDiscardDraft,
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
                data-draft-saved-at={draftSavedAt ?? ''}
                data-draft-stale={draftStale ? 'true' : 'false'}
                data-has-draft-action={onSaveDraft ? 'true' : 'false'}
            >
                <span data-testid="draft">{draft}</span>
                <button type="button" onClick={() => setDraft('unsaved draft')}>
                    edit draft
                </button>
                <button type="button" onClick={() => onPublish({ ...initialContentByLanguage, en: '<p>edited</p>' })}>
                    publish
                </button>
                {onSaveDraft && (
                    <button
                        type="button"
                        onClick={() => onSaveDraft({ ...initialContentByLanguage, en: '<p>entwurf</p>' })}
                    >
                        save draft
                    </button>
                )}
                {onDiscardDraft && (
                    <button type="button" onClick={() => onDiscardDraft()}>
                        discard draft
                    </button>
                )}
            </div>
        );
    },
}));

beforeEach(() => {
    window.localStorage.clear();
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
    createInviteMutate.mockReset();
    sendInviteEmailMutate.mockReset();
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

        expect(publishMutate).toHaveBeenCalledWith(
            { de: '<p>DE</p>', en: '<p>edited</p>' },
            expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
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

    it('keeps the tenant DPA read-only and sends the one-time link to the authorised signatory', async () => {
        userRoles.isSuperAdmin = false;
        userRoles.isTenantScopedAdmin = true;
        userRoles.tenantId = 84;
        useDpaGate.mockReturnValue({ data: { dpaPublished: true, dpaSigned: false }, isError: false });
        createInviteMutate.mockImplementation((_variables, options) =>
            options.onSuccess({ signLink: 'https://app.example/dpa-sign/secret', expiresAt: '2026-07-20T12:00:00Z' }),
        );
        sendInviteEmailMutate.mockImplementation((_variables, options) => options.onSuccess());

        const user = userEvent.setup();
        render(<DataProcessingAgreementContainer tenantId={84} />);

        expect(screen.getByTestId('card')).toHaveAttribute('data-read-only', 'true');
        await user.type(
            screen.getByRole('textbox', { name: 'legal.dpa.sign.recipientEmail' }),
            'bart.simpson@oriso.org',
        );
        await user.click(screen.getByRole('button', { name: 'legal.dpa.sign.sendLink' }));
        expect(createInviteMutate).toHaveBeenCalled();
        expect(sendInviteEmailMutate).toHaveBeenCalledWith(
            {
                tenantId: 84,
                recipientEmail: 'bart.simpson@oriso.org',
                signLink: 'https://app.example/dpa-sign/secret',
                expiresAt: '2026-07-20T12:00:00Z',
            },
            expect.any(Object),
        );
        expect(screen.getByText('legal.dpa.sign.sent')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'legal.dpa.sign.openLink' })).toBeInTheDocument();
        expect(screen.queryByText(/secret/)).not.toBeInTheDocument();
    });

    it('shows a delivery failure and retains the generated one-time link for a safe retry', async () => {
        userRoles.isSuperAdmin = false;
        userRoles.isTenantScopedAdmin = true;
        userRoles.tenantId = 84;
        useDpaGate.mockReturnValue({ data: { dpaPublished: true, dpaSigned: false }, isError: false });
        createInviteMutate.mockImplementation((_variables, options) =>
            options.onSuccess({ signLink: 'https://app.example/dpa-sign/secret', expiresAt: '2026-07-20T12:00:00Z' }),
        );
        sendInviteEmailMutate.mockImplementation((_variables, options) => options.onError(new Error('SMTP failed')));

        const user = userEvent.setup();
        render(<DataProcessingAgreementContainer tenantId={84} />);

        await user.type(
            screen.getByRole('textbox', { name: 'legal.dpa.sign.recipientEmail' }),
            'bart.simpson@oriso.org',
        );
        await user.click(screen.getByRole('button', { name: 'legal.dpa.sign.sendLink' }));

        expect(screen.getByText('legal.dpa.sign.sendFailed')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'legal.dpa.sign.openLink' })).toBeInTheDocument();
        expect(screen.queryByText(/secret/)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'legal.dpa.sign.sendLink' }));
        expect(createInviteMutate).toHaveBeenCalledTimes(1);
        expect(sendInviteEmailMutate).toHaveBeenCalledTimes(2);
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

describe('DataProcessingAgreementContainer — local draft', () => {
    const withOneVersion = () =>
        useDpaVersions.mockReturnValue({
            data: [{ activationDate: '2026-07-01T10:00:00', content: '{"de":"<p>DE</p>"}' }],
        });

    it('saves a draft without touching the publish endpoint', async () => {
        const user = userEvent.setup();
        withOneVersion();
        render(<DataProcessingAgreementContainer tenantId={1} />);

        await user.click(screen.getByRole('button', { name: 'save draft' }));

        expect(publishMutate).not.toHaveBeenCalled();
    });

    it('restores the saved draft into the editor on the next mount', async () => {
        const user = userEvent.setup();
        withOneVersion();
        const first = render(<DataProcessingAgreementContainer tenantId={1} />);
        await user.click(screen.getByRole('button', { name: 'save draft' }));
        first.unmount();

        render(<DataProcessingAgreementContainer tenantId={1} />);
        const card = screen.getByTestId('card');
        expect(JSON.parse(card.getAttribute('data-content') ?? '{}')).toEqual({
            de: '<p>DE</p>',
            en: '<p>entwurf</p>',
        });
        expect(card.getAttribute('data-draft-saved-at')).not.toBe('');
        expect(card).toHaveAttribute('data-draft-stale', 'false');
    });

    it('keeps drafts of different tenants apart', async () => {
        const user = userEvent.setup();
        withOneVersion();
        const first = render(<DataProcessingAgreementContainer tenantId={1} />);
        await user.click(screen.getByRole('button', { name: 'save draft' }));
        first.unmount();

        render(<DataProcessingAgreementContainer tenantId={2} />);
        expect(JSON.parse(screen.getByTestId('card').getAttribute('data-content') ?? '{}')).toEqual({
            de: '<p>DE</p>',
        });
    });

    it('warns when a newer version was published after the draft was saved', async () => {
        const user = userEvent.setup();
        withOneVersion();
        const first = render(<DataProcessingAgreementContainer tenantId={1} />);
        await user.click(screen.getByRole('button', { name: 'save draft' }));
        first.unmount();

        useDpaVersions.mockReturnValue({
            data: [{ activationDate: '2026-08-01T10:00:00', content: '{"de":"<p>neuer</p>"}' }],
        });
        render(<DataProcessingAgreementContainer tenantId={1} />);
        expect(screen.getByTestId('card')).toHaveAttribute('data-draft-stale', 'true');
    });

    it('discarding returns the editor to the published text', async () => {
        const user = userEvent.setup();
        withOneVersion();
        const first = render(<DataProcessingAgreementContainer tenantId={1} />);
        await user.click(screen.getByRole('button', { name: 'save draft' }));
        first.unmount();

        render(<DataProcessingAgreementContainer tenantId={1} />);
        await user.click(screen.getByRole('button', { name: 'discard draft' }));

        const card = screen.getByTestId('card');
        expect(JSON.parse(card.getAttribute('data-content') ?? '{}')).toEqual({ de: '<p>DE</p>' });
        expect(card).toHaveAttribute('data-draft-saved-at', '');
    });

    it('clears the draft once a publish succeeds', async () => {
        const user = userEvent.setup();
        withOneVersion();
        publishMutate.mockImplementation((_content: unknown, options?: { onSuccess?: () => void }) =>
            options?.onSuccess?.(),
        );
        const first = render(<DataProcessingAgreementContainer tenantId={1} />);
        await user.click(screen.getByRole('button', { name: 'save draft' }));
        await user.click(screen.getByRole('button', { name: 'publish' }));
        first.unmount();

        render(<DataProcessingAgreementContainer tenantId={1} />);
        expect(JSON.parse(screen.getByTestId('card').getAttribute('data-content') ?? '{}')).toEqual({
            de: '<p>DE</p>',
        });
    });

    it('gives a read-only viewer no draft action at all', () => {
        withOneVersion();
        render(<DataProcessingAgreementContainer tenantId={1} readOnly />);
        expect(screen.getByTestId('card')).toHaveAttribute('data-has-draft-action', 'false');
    });
});

describe('DataProcessingAgreementContainer — draft scope readiness', () => {
    it('withholds the card until the opaque user id has loaded', () => {
        useDpaVersions.mockReturnValue({
            data: [{ activationDate: '2026-07-01T10:00:00', content: '{"de":"<p>DE</p>"}' }],
        });
        useUserData.mockReturnValue({ data: undefined, isLoading: true });
        render(<DataProcessingAgreementContainer tenantId={1} />);
        // Mounting now and remounting when the draft hydrates would discard edits
        // typed during identity loading.
        expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('shows the published contract to a read-only viewer while the user id loads', () => {
        useDpaVersions.mockReturnValue({
            data: [{ activationDate: '2026-07-01T10:00:00', content: '{"de":"<p>DE</p>"}' }],
        });
        useUserData.mockReturnValue({ data: undefined, isLoading: true });
        render(<DataProcessingAgreementContainer tenantId={1} readOnly />);
        const card = screen.getByTestId('card');
        // A read-only viewer never gets a draft, so nothing about it should make them
        // wait on /users/data before seeing the published contract — and the point is
        // the CONTENT, not merely that the shell mounted.
        expect(card).toHaveAttribute('data-read-only', 'true');
        expect(JSON.parse(card.getAttribute('data-content') ?? '{}')).toEqual({ de: '<p>DE</p>' });
    });

    it('withholds the card until the published versions have loaded', () => {
        useDpaVersions.mockReturnValue({ data: undefined, isLoading: true });
        render(<DataProcessingAgreementContainer tenantId={1} />);
        // Mounting on an empty version list would show an empty contract, then remount
        // when the real one lands — losing edits and stamping a draft with no base version.
        expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('does not treat a disabled versions query as loading', () => {
        useDpaVersions.mockReturnValue({ data: undefined, isLoading: true });
        render(<DataProcessingAgreementContainer tenantId="" />);
        // No usable tenant id: the query never runs, so the card must not hang on it.
        expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('shows the card without a draft action when the user id never arrives', () => {
        useDpaVersions.mockReturnValue({
            data: [{ activationDate: '2026-07-01T10:00:00', content: '{"de":"<p>DE</p>"}' }],
        });
        useUserData.mockReturnValue({ data: undefined, isLoading: false });
        render(<DataProcessingAgreementContainer tenantId={1} />);
        const card = screen.getByTestId('card');
        // Reading and publishing still work; only the draft action is withheld,
        // because without a scope it would store nothing and say nothing.
        expect(card).toHaveAttribute('data-has-draft-action', 'false');
    });
});
