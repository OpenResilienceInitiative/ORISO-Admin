import React from 'react';
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalText } from './index';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import type {
    SaveTenantLegalDraft,
    TenantLegalDraft,
    TenantLegalDraftKind,
} from '../../../../../api/tenant/legalDrafts';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
    Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

const DEFAULT_IMPRINT: unknown = { de: '<p>Impressum DE</p>', en: '<p>Imprint EN</p>', fr: '<p>Imprint FR</p>' };

const mocks = vi.hoisted(() => ({
    updateTenant: vi.fn(),
    canEdit: true,
    can: vi.fn((): boolean => mocks.canEdit),
    imprint: undefined as unknown,
    activeLanguages: ['de', 'en'] as string[],
    userId: 'user-1' as string | undefined,
    userLoading: false,
    serverDrafts: {} as Record<string, TenantLegalDraft>,
    serverDraftLoading: false,
    serverDraftError: false,
    serverConflict: undefined as TenantLegalDraft | null | undefined,
    serverConflictOnSave: undefined as TenantLegalDraft | null | undefined,
    serverHasConflict: false,
    conflictRefreshFailed: false,
    conflictRefreshing: false,
    serverSave: vi.fn(),
    serverResponse: undefined as Partial<TenantLegalDraft> | undefined,
    serverDiscard: vi.fn(),
    serverDiscardDeferred: undefined as Promise<void> | undefined,
    serverRetry: vi.fn(),
    clearConflict: vi.fn(),
    versions: [] as unknown[],
    historyState: 'available' as 'available' | 'unsupported' | 'unavailable',
}));

// The version history is an independent react-query call; this suite has no client.
vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({
    useLegalTextVersions: () => ({ data: mocks.versions, historyState: mocks.historyState }),
}));
vi.mock('../../../../../hooks/useTenantAppearanceFormData', () => ({
    useTenantAppearanceFormData: () => ({
        data: {
            content: {
                imprint: mocks.imprint,
            },
            settings: { activeLanguages: mocks.activeLanguages },
        },
        isLoading: false,
        mutate: mocks.updateTenant,
        mutateAsync: mocks.updateTenant,
        isPending: false,
    }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: mocks.can }),
}));

vi.mock('../../../../../hooks/useUserData.hook', () => ({
    useUserData: () => ({
        data: mocks.userId ? { id: mocks.userId } : undefined,
        isLoading: mocks.userLoading,
    }),
}));

vi.mock('../../hooks/useLegalTemplateHistory', () => ({
    useLegalTemplateHistory: () => ({ versions: [], state: 'unsupported' }),
}));

vi.mock('../../hooks/useTenantLegalDraft', () => ({
    useTenantLegalDraft: (_tenantId: string | number, kind: TenantLegalDraftKind) => ({
        draft: mocks.serverDrafts[kind] ?? null,
        isLoading: mocks.serverDraftLoading,
        isError: mocks.serverDraftError,
        retry: mocks.serverRetry,
        save: async (next: SaveTenantLegalDraft) => {
            const conflict = mocks.serverConflictOnSave;
            if (conflict !== undefined) {
                mocks.serverConflictOnSave = undefined;
                mocks.serverConflict = conflict;
                mocks.serverSave(next);
                throw new Error('CONFLICT');
            }
            const saved = {
                kind,
                ...next,
                revision: 'saved:1',
                updatedAt: '2026-09-17T10:00:00Z',
                ...mocks.serverResponse,
            };
            mocks.serverDrafts[kind] = saved;
            mocks.serverSave(next);
            return saved;
        },
        discard: async (revision: string) => {
            mocks.serverDiscard(revision);
            await mocks.serverDiscardDeferred;
            delete mocks.serverDrafts[kind];
        },
        hasConflict: mocks.serverHasConflict || mocks.serverConflict !== undefined,
        conflict: mocks.serverConflict,
        conflictRefreshFailed: mocks.conflictRefreshFailed,
        conflictRefreshing: mocks.conflictRefreshing,
        retryConflict: mocks.serverRetry,
        clearConflict: () => {
            mocks.clearConflict();
            mocks.serverConflict = undefined;
        },
    }),
}));

vi.mock('../../../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        roles: [],
        hasRole: () => false,
        isSuperAdmin: true,
        isTechnicalAccount: false,
        isTenantScopedAdmin: false,
        tenantId: 0,
    }),
}));

// The M3 editor mock mirrors the real contract: echoes the value, renders the
// slots, emits an edit via onChange and exposes the publish action.
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        onChange,
        readOnly,
        onPublish,
        onSaveDraft,
        helpSlot,
        snackbarSlot,
        aboveEditorSlot,
        belowSlot,
        ...rest
    }: {
        value?: string;
        onChange?: (html: string) => void;
        readOnly?: boolean;
        onPublish?: () => void;
        onSaveDraft?: () => void;
        helpSlot?: React.ReactNode;
        snackbarSlot?: React.ReactNode;
        aboveEditorSlot?: React.ReactNode;
        belowSlot?: React.ReactNode;
        [prop: string]: unknown;
    }) => (
        <div
            data-testid="m3-editor"
            data-value={value}
            data-readonly={readOnly ? 'true' : 'false'}
            data-history-state={String(rest.versionHistoryState)}
            data-history-status-label={String(rest.versionHistoryStatusLabel)}
            // Everything the tenant editor passes beyond the props modelled above.
            // Read by the "consent chooser stays off this level" test below.
            data-extra-props={Object.keys(rest).sort().join(',')}
        >
            {helpSlot}
            {snackbarSlot}
            {aboveEditorSlot}
            {!readOnly && onChange && (
                <button type="button" onClick={() => onChange('<p>edited</p>')}>
                    edit
                </button>
            )}
            {!readOnly && onPublish && (
                <button type="button" onClick={() => onPublish()}>
                    legal.m3Editor.publish
                </button>
            )}
            {!readOnly && onSaveDraft && (
                <button type="button" onClick={() => onSaveDraft()}>
                    legal.m3Editor.saveDraft
                </button>
            )}
            {belowSlot}
        </div>
    ),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => originalGetComputedStyle(el));
});

beforeEach(() => {
    mocks.imprint = DEFAULT_IMPRINT;
    mocks.activeLanguages = ['de', 'en'];
    mocks.canEdit = true;
    mocks.userId = 'user-1';
    mocks.userLoading = false;
    mocks.serverDrafts = {};
    mocks.serverDraftLoading = false;
    mocks.serverDraftError = false;
    mocks.serverConflict = undefined;
    mocks.serverConflictOnSave = undefined;
    mocks.serverHasConflict = false;
    mocks.conflictRefreshFailed = false;
    mocks.conflictRefreshing = false;
    mocks.serverSave.mockClear();
    mocks.serverResponse = undefined;
    mocks.serverDiscard.mockClear();
    mocks.serverDiscardDeferred = undefined;
    mocks.serverRetry.mockClear();
    mocks.clearConflict.mockClear();
    mocks.updateTenant.mockReset();
    mocks.versions = [];
    mocks.historyState = 'available';
    window.localStorage.clear();
    window.sessionStorage.clear();
});

describe('LegalText (M3 editor)', () => {
    it('passes an unsupported tenant history state instead of an empty version list', () => {
        mocks.historyState = 'unsupported';
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        const editor = screen.getByTestId('m3-editor');
        expect(editor).toHaveAttribute('data-history-state', 'unsupported');
        expect(editor).toHaveAttribute('data-history-status-label', 'legal.versions.unsupported');
    });

    it('passes a failed history request with its unavailable label', () => {
        mocks.historyState = 'unavailable';
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        const editor = screen.getByTestId('m3-editor');
        expect(editor).toHaveAttribute('data-history-state', 'unavailable');
        expect(editor).toHaveAttribute('data-history-status-label', 'legal.versions.unavailable.title');
    });
    it('publishes the complete language map — untouched and unknown languages survive an edit', async () => {
        const user = userEvent.setup();
        mocks.updateTenant.mockClear();
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        // The editor shows the active (default: de) language content.
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Impressum DE</p>');

        // Edit only German, then publish.
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        expect(mocks.updateTenant).toHaveBeenCalledTimes(1);
        // en (untouched active language) and fr (stored but not even offered) are kept.
        expect(mocks.updateTenant.mock.calls[0][0]).toEqual({
            content: {
                imprint: { de: '<p>edited</p>', en: '<p>Imprint EN</p>', fr: '<p>Imprint FR</p>' },
            },
        });
    });

    it('publishes the normalized content returned by the revision-checked draft save', async () => {
        const user = userEvent.setup();
        mocks.serverResponse = {
            content: { de: '<p>sanitized</p>', en: '<p>normalized</p>' },
            revision: 'saved:normalized',
        };
        mocks.updateTenant.mockResolvedValue(undefined);
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                legalType="imprint"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        await waitFor(() =>
            expect(mocks.updateTenant).toHaveBeenCalledWith({
                content: { imprint: { de: '<p>sanitized</p>', en: '<p>normalized</p>' } },
            }),
        );
        expect(mocks.serverDiscard).toHaveBeenCalledWith('saved:normalized');
    });

    it('retains the saved server draft when publication fails', async () => {
        const user = userEvent.setup();
        mocks.updateTenant.mockRejectedValue(new Error('publication failed'));
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                legalType="imprint"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        await waitFor(() => expect(mocks.updateTenant).toHaveBeenCalledTimes(1));
        expect(mocks.serverDiscard).not.toHaveBeenCalled();
        expect(mocks.serverDrafts.IMPRINT?.content.de).toBe('<p>edited</p>');
    });

    it('routes publish through the confirmation modal and stamps the confirm field', async () => {
        const user = userEvent.setup();
        mocks.updateTenant.mockClear();
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="privacy.title"
                subTitle="privacy.subTitle"
                placeHolderKey="settings.privacy.placeholder"
                showConfirmationModal={{
                    titleKey: 'privacy.confirmation.title',
                    contentKey: 'privacy.confirmation.content',
                    cancelLabelKey: 'privacy.confirmation.confirm',
                    okLabelKey: 'privacy.confirmation.cancel',
                    field: ['content', 'confirmPrivacy'],
                }}
            />,
        );

        // Publishing is only offered once there is something new to publish.
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(await screen.findByRole('button', { name: 'legal.m3Editor.publish' }));

        // No save yet — the modal must decide first.
        await screen.findByText('privacy.confirmation.content');
        expect(mocks.updateTenant).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: 'privacy.confirmation.cancel' }));

        await vi.waitFor(() => expect(mocks.updateTenant).toHaveBeenCalledTimes(1));
        expect(mocks.updateTenant.mock.calls[0][0]).toMatchObject({
            content: {
                confirmPrivacy: false,
                // fr (stored but not even offered) must survive the modal save path too.
                imprint: { de: '<p>edited</p>', en: '<p>Imprint EN</p>', fr: '<p>Imprint FR</p>' },
            },
        });
    });

    it('renders read-only without a publish action when the permission is missing', () => {
        mocks.canEdit = false;
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        expect(screen.getByTestId('m3-editor').dataset.readonly).toBe('true');
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.publish' })).toBeNull();
        // The read-only state must come from the exact legal-text permission contract.
        expect(mocks.can).toHaveBeenCalledWith(PermissionAction.Update, Resource.LegalText);
        mocks.canEdit = true;
    });

    it('preserves legacy plain-string content on load and publish (not dropped to {})', async () => {
        const user = userEvent.setup();
        mocks.updateTenant.mockClear();
        // Stored content from before the language-map migration is a bare HTML string.
        mocks.imprint = '<p>Legacy Impressum</p>';
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        // The legacy string is shown under the first configured language, not empty.
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Legacy Impressum</p>');

        // Untouched, the legacy string counts as the live text — nothing new to publish,
        // so no action could overwrite it with {}.
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.publish' })).toBeNull();

        // An edit publishes as a language map under the same language.
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(await screen.findByRole('button', { name: 'legal.m3Editor.publish' }));

        expect(mocks.updateTenant).toHaveBeenCalledTimes(1);
        expect(mocks.updateTenant.mock.calls[0][0]).toEqual({
            content: { imprint: { de: '<p>edited</p>' } },
        });
    });

    it('falls back to German when activeLanguages is configured as an empty list', () => {
        mocks.activeLanguages = [];
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Impressum DE</p>');
    });

    it('drops unsaved edits when the tenant identity changes', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');

        rerender(
            <LegalText
                tenantId="2"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        await vi.waitFor(() =>
            expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Impressum DE</p>'),
        );
    });
});

describe('LegalText — consent template chooser (deliberately absent)', () => {
    /**
     * The owner settled the consent split button on the AGENCY level ONLY
     * (2026-08-19). `M3RichTextEditor.consentSlot` exists for every host, but the
     * tenant/platform editor must keep the footer it had. This asserts the
     * restriction so it reads as a decision, not as an oversight — do not "finish"
     * the job by wiring it here.
     */
    it('passes no consentSlot to the editor', () => {
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                subTitle="imprint.subTitle"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        const extraProps = screen.getByTestId('m3-editor').getAttribute('data-extra-props') ?? '';
        expect(extraProps.split(',')).not.toContain('consentSlot');
    });
});

describe('LegalText hint snackbar (imprint / privacy)', () => {
    it('shows the imprint hint as a dismissible snackbar (not duplicated inline)', () => {
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                legalType="imprint"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        expect(screen.getByText('legal.help.imprint.platform.published.text')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('legal.help.imprint.platform.published.hint');
        expect(screen.getAllByText('legal.help.imprint.platform.published.hint')).toHaveLength(1);
    });

    it('shows the privacy hint as a dismissible snackbar (not duplicated inline)', () => {
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="privacy.title"
                legalType="privacy"
                placeHolderKey="settings.privacy.placeholder"
            />,
        );

        expect(screen.getByText('legal.help.privacy.platform.published.text')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('legal.help.privacy.platform.published.hint');
        expect(screen.getAllByText('legal.help.privacy.platform.published.hint')).toHaveLength(1);
    });

    it('"nicht mehr anzeigen" hides the snackbar and persists across remounts', async () => {
        const user = userEvent.setup();
        const { unmount } = render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                legalType="imprint"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

        await user.click(screen.getByRole('button', { name: 'legal.help.snackbar.dismiss' }));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(window.localStorage.getItem('oriso-admin.legal.imprint.hint.dismissed.1:user-1')).toBe('true');

        unmount();
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                legalType="imprint"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        // Hint falls back to the inline help row once the snackbar is dismissed.
        expect(screen.getByText('legal.help.imprint.platform.published.hint')).toBeInTheDocument();
    });

    it('"X" hides the snackbar for the session only', async () => {
        const user = userEvent.setup();
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="privacy.title"
                legalType="privacy"
                placeHolderKey="settings.privacy.placeholder"
            />,
        );

        await user.click(screen.getByRole('button', { name: 'legal.help.snackbar.close' }));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(window.localStorage.getItem('oriso-admin.legal.privacy.hint.dismissed.1:user-1')).toBeNull();
        expect(window.sessionStorage.getItem('oriso-admin.legal.privacy.hint.closed.1:user-1')).toBe('true');
    });
});

describe('LegalText — tenant server draft', () => {
    const renderImprint = () =>
        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                legalType="imprint"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );

    it('offers a draft action that does not write to the tenant', async () => {
        const user = userEvent.setup();
        mocks.updateTenant.mockClear();
        renderImprint();

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));

        expect(mocks.updateTenant).not.toHaveBeenCalled();
    });

    it('restores the draft and announces it on the next mount', async () => {
        const user = userEvent.setup();
        const first = renderImprint();
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        first.unmount();

        renderImprint();
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');
        expect(screen.getByText('legal.draftSnackbar.saved')).toBeInTheDocument();
    });

    it('discarding restores the published text and removes the notice', async () => {
        const user = userEvent.setup();
        const first = renderImprint();
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        first.unmount();

        renderImprint();
        await user.click(screen.getByRole('button', { name: 'legal.draftSnackbar.discard' }));

        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Impressum DE</p>');
        expect(screen.queryByText('legal.draftSnackbar.saved')).not.toBeInTheDocument();
    });

    it('keeps the imprint and privacy drafts apart', async () => {
        const user = userEvent.setup();
        const first = renderImprint();
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        first.unmount();

        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="privacy.title"
                legalType="privacy"
                placeHolderKey="settings.privacy.placeholder"
            />,
        );
        expect(screen.queryByText('legal.draftSnackbar.saved')).not.toBeInTheDocument();
    });

    it('publishes the draft text and drops the draft once the tenant write succeeds', async () => {
        const user = userEvent.setup();
        mocks.updateTenant.mockClear();
        mocks.updateTenant.mockResolvedValue(undefined);
        const first = renderImprint();
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));
        first.unmount();

        expect(mocks.updateTenant.mock.calls[0][0]).toEqual({
            content: { imprint: { de: '<p>edited</p>', en: '<p>Imprint EN</p>', fr: '<p>Imprint FR</p>' } },
        });

        renderImprint();
        expect(screen.queryByText('legal.draftSnackbar.saved')).not.toBeInTheDocument();
        mocks.updateTenant.mockReset();
    });

    it('gives a viewer without edit permission no draft action', () => {
        mocks.canEdit = false;
        renderImprint();
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.saveDraft' })).not.toBeInTheDocument();
    });

    it('keeps unsaved edits visible when local migration cleanup fails', async () => {
        const user = userEvent.setup();
        // Draft holds the PUBLISHED text, so a later edit is distinguishable from it.
        const first = renderImprint();
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        first.unmount();

        renderImprint();
        await user.click(screen.getByRole('button', { name: 'edit' }));
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');

        // Storage refuses the removal — the notice says the draft is still there, so the
        // text typed since the last save must not silently disappear either.
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('denied');
        });
        await user.click(screen.getByRole('button', { name: 'legal.draftSnackbar.discard' }));

        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');
        vi.restoreAllMocks();
    });

    it('offers no draft action while the opaque user id is still loading', () => {
        mocks.userLoading = true;
        renderImprint();
        // The whole editor waits: mounting it now and remounting it when the draft
        // arrives would throw away whatever was typed in between.
        expect(screen.queryByTestId('m3-editor')).not.toBeInTheDocument();
    });

    it('shows the published text to a viewer without edit permission while the user id loads', () => {
        mocks.canEdit = false;
        mocks.userLoading = true;
        renderImprint();
        // No edit permission means no draft, so the published text must not wait on a
        // query it does not need.
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Impressum DE</p>');
    });

    it('still offers the server draft action when the user id could not be loaded', () => {
        mocks.userId = undefined;
        renderImprint();
        // Server drafts are tenant-scoped and do not depend on a browser-storage scope.
        expect(screen.getByTestId('m3-editor')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' })).toBeInTheDocument();
    });

    it('never hands one account’s unsaved edits or draft to the next', async () => {
        const user = userEvent.setup();
        // A fresh element each time: React bails out of an update when the element is
        // referentially identical, so reusing one would silently skip the re-render.
        const imprint = () => (
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                legalType="imprint"
                placeHolderKey="settings.imprint.placeholder"
            />
        );
        const { rerender } = render(imprint());
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        await user.click(screen.getByRole('button', { name: 'edit' }));
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');

        // The account changes while the editor stays mounted — no unmount to save us.
        mocks.userId = 'user-2';
        rerender(imprint());

        await waitFor(() =>
            expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Impressum DE</p>'),
        );
        expect(screen.getByText('legal.draftSnackbar.saved')).toBeInTheDocument();
    });

    it('never shows a stored draft to a viewer who may not edit', async () => {
        const user = userEvent.setup();
        const first = renderImprint();
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        first.unmount();

        // The permission is gone by the next visit: the unpublished text must not
        // surface, and without the notice the viewer could not discard it anyway.
        mocks.canEdit = false;
        renderImprint();

        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Impressum DE</p>');
        expect(screen.queryByText('legal.draftSnackbar.saved')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'legal.draftSnackbar.discard' })).not.toBeInTheDocument();
    });

    it('requires an explicit choice when a browser draft and server draft both exist', async () => {
        const user = userEvent.setup();
        const localKey = 'oriso-admin.legal.draft.imprint.1:user-1';
        window.localStorage.setItem(
            localKey,
            JSON.stringify({ content: { de: '<p>local</p>' }, savedAt: '2026-09-16T10:00:00Z' }),
        );
        mocks.serverDrafts.IMPRINT = {
            kind: 'IMPRINT',
            content: { de: '<p>server</p>' },
            revision: 'server:2',
            updatedAt: '2026-09-17T10:00:00Z',
        };

        renderImprint();
        expect(screen.getByTestId('tenant-draft-source-choice')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.saveDraft' })).not.toBeInTheDocument();
        expect(window.localStorage.getItem(localKey)).not.toBeNull();

        await user.click(screen.getByRole('button', { name: 'legal.serverDraft.collision.local' }));
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>local</p>');
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));

        expect(mocks.serverSave).toHaveBeenCalledWith(expect.objectContaining({ revision: 'server:2' }));
        expect(window.localStorage.getItem(localKey)).toBeNull();
    });

    it('disables save and publish after a GET failure and offers retry', async () => {
        const user = userEvent.setup();
        mocks.serverDraftError = true;
        renderImprint();

        expect(screen.getByTestId('tenant-draft-unavailable')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.saveDraft' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.publish' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'legal.serverDraft.retry' }));
        expect(mocks.serverRetry).toHaveBeenCalledTimes(1);
    });

    it('preserves editor content during a conflict and requires an explicit resolution', async () => {
        const user = userEvent.setup();
        mocks.serverDrafts.IMPRINT = {
            kind: 'IMPRINT',
            content: { de: '<p>mine</p>' },
            revision: 'server:1',
            updatedAt: '2026-09-17T09:00:00Z',
        };
        mocks.serverConflict = {
            kind: 'IMPRINT',
            content: { de: '<p>theirs</p>' },
            revision: 'server:2',
            updatedAt: '2026-09-17T10:00:00Z',
        };
        renderImprint();
        await user.click(screen.getByRole('button', { name: 'edit' }));

        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.saveDraft' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'legal.serverDraft.conflict.keepEditing' }));
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        expect(mocks.serverSave).toHaveBeenCalledWith(expect.objectContaining({ revision: 'server:2' }));
    });

    it('reloads the exact remote snapshot after a local draft conflicts with a newer server draft', async () => {
        const user = userEvent.setup();
        window.localStorage.setItem(
            'oriso-admin.legal.draft.privacy.1:user-1',
            JSON.stringify({
                content: { de: '<p>local</p>', localOnly: '<p>must disappear</p>' },
                consent: { de: 'local {{legal_links}}', localOnly: 'must disappear {{legal_links}}' },
                savedAt: '2026-09-16T10:00:00Z',
            }),
        );
        mocks.serverDrafts.PRIVACY = {
            kind: 'PRIVACY',
            content: { de: '<p>old server</p>' },
            privacyConsent: { de: 'old server {{legal_links}}' },
            revision: 'server:1',
            updatedAt: '2026-09-17T09:00:00Z',
        };
        mocks.serverConflictOnSave = {
            kind: 'PRIVACY',
            content: { de: '<p>current server</p>' },
            privacyConsent: { de: 'current server {{legal_links}}' },
            revision: 'server:2',
            updatedAt: '2026-09-17T10:00:00Z',
        };

        render(
            <LegalText
                tenantId="1"
                fieldName={['content', 'privacy']}
                titleKey="privacy.title"
                legalType="privacy"
                placeHolderKey="settings.privacy.placeholder"
            />,
        );
        await user.click(screen.getByRole('button', { name: 'legal.serverDraft.collision.local' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        await user.click(screen.getByRole('button', { name: 'legal.serverDraft.conflict.reload' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));

        expect(mocks.serverSave).toHaveBeenLastCalledWith({
            content: { de: '<p>current server</p>' },
            privacyConsent: { de: 'current server {{legal_links}}' },
            revision: 'server:2',
        });
    });

    it('reloads the published baseline when a conflicting server draft was concurrently deleted', async () => {
        const user = userEvent.setup();
        const localKey = 'oriso-admin.legal.draft.imprint.1:user-1';
        window.localStorage.setItem(
            localKey,
            JSON.stringify({
                content: { de: '<p>local</p>', localOnly: '<p>must disappear</p>' },
                savedAt: '2026-09-16T10:00:00Z',
            }),
        );
        mocks.serverDrafts.IMPRINT = {
            kind: 'IMPRINT',
            content: { de: '<p>old server</p>' },
            revision: 'server:1',
            updatedAt: '2026-09-17T09:00:00Z',
        };
        mocks.serverConflictOnSave = null;

        renderImprint();
        await user.click(screen.getByRole('button', { name: 'legal.serverDraft.collision.local' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        await user.click(screen.getByRole('button', { name: 'legal.serverDraft.conflict.reload' }));

        expect(window.localStorage.getItem(localKey)).not.toBeNull();
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Impressum DE</p>');

        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        expect(mocks.serverSave).toHaveBeenLastCalledWith({
            content: DEFAULT_IMPRINT,
            revision: 'new',
        });
        expect(window.localStorage.getItem(localKey)).toBeNull();
    });

    it('keeps the editing base revision pinned across a background query refresh', async () => {
        const user = userEvent.setup();
        mocks.serverDrafts.IMPRINT = {
            kind: 'IMPRINT',
            content: { de: '<p>base</p>' },
            revision: 'server:1',
            updatedAt: '2026-09-17T09:00:00Z',
        };
        const view = renderImprint();
        await user.click(screen.getByRole('button', { name: 'edit' }));

        mocks.serverDrafts.IMPRINT = {
            kind: 'IMPRINT',
            content: { de: '<p>background refresh</p>' },
            revision: 'server:2',
            updatedAt: '2026-09-17T10:00:00Z',
        };
        view.rerender(
            <LegalText
                tenantId="1"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                legalType="imprint"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));

        expect(mocks.serverSave).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.objectContaining({ de: '<p>edited</p>' }),
                revision: 'server:1',
            }),
        );
    });

    it('does not offer a conflict decision before the current server revision arrives', () => {
        mocks.serverHasConflict = true;
        mocks.conflictRefreshing = true;
        renderImprint();

        expect(screen.getByTestId('tenant-draft-conflict')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'legal.serverDraft.conflict.reload' })).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'legal.serverDraft.conflict.keepEditing' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.saveDraft' })).not.toBeInTheDocument();
    });

    it('does not clear the new editor when an old-context discard finishes late', async () => {
        const user = userEvent.setup();
        let finishDiscard = () => undefined;
        mocks.serverDiscardDeferred = new Promise<void>((resolve) => {
            finishDiscard = resolve;
        });
        mocks.serverDrafts.IMPRINT = {
            kind: 'IMPRINT',
            content: { de: '<p>tenant one</p>' },
            revision: 'server:1',
            updatedAt: '2026-09-17T09:00:00Z',
        };
        const view = renderImprint();
        await user.click(screen.getByRole('button', { name: 'legal.draftSnackbar.discard' }));

        mocks.userId = 'user-2';
        view.rerender(
            <LegalText
                tenantId="2"
                fieldName={['content', 'imprint']}
                titleKey="imprint.title"
                legalType="imprint"
                placeHolderKey="settings.imprint.placeholder"
            />,
        );
        await user.click(screen.getByRole('button', { name: 'edit' }));
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');

        finishDiscard();
        await waitFor(() => expect(mocks.serverDiscard).toHaveBeenCalledWith('server:1'));
        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');
    });
});
