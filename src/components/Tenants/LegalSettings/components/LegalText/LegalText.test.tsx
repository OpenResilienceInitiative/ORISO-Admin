import React from 'react';
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalText } from './index';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';

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
}));

// The version history is an independent react-query call; this suite has no client.
vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({ useLegalTextVersions: () => ({ data: [] }) }));
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
    }) => (
        <div data-testid="m3-editor" data-value={value} data-readonly={readOnly ? 'true' : 'false'}>
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
    window.localStorage.clear();
    window.sessionStorage.clear();
});

describe('LegalText (M3 editor)', () => {
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

        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        // No save yet — the modal must decide first.
        await screen.findByText('privacy.confirmation.content');
        expect(mocks.updateTenant).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: 'privacy.confirmation.cancel' }));

        await vi.waitFor(() => expect(mocks.updateTenant).toHaveBeenCalledTimes(1));
        expect(mocks.updateTenant.mock.calls[0][0]).toMatchObject({
            content: {
                confirmPrivacy: false,
                // fr (stored but not even offered) must survive the modal save path too.
                imprint: { de: '<p>Impressum DE</p>', en: '<p>Imprint EN</p>', fr: '<p>Imprint FR</p>' },
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

        // Publishing without touching it keeps the content instead of overwriting with {}.
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));

        expect(mocks.updateTenant).toHaveBeenCalledTimes(1);
        expect(mocks.updateTenant.mock.calls[0][0]).toEqual({
            content: { imprint: { de: '<p>Legacy Impressum</p>' } },
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

describe('LegalText — local draft', () => {
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
        expect(screen.getByText('legal.draft.notice.title')).toBeInTheDocument();
    });

    it('discarding restores the published text and removes the notice', async () => {
        const user = userEvent.setup();
        const first = renderImprint();
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        first.unmount();

        renderImprint();
        await user.click(screen.getByRole('button', { name: 'legal.draft.discard' }));

        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>Impressum DE</p>');
        expect(screen.queryByText('legal.draft.notice.title')).not.toBeInTheDocument();
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
        expect(screen.queryByText('legal.draft.notice.title')).not.toBeInTheDocument();
    });

    it('publishes the draft text and drops the draft once the tenant write succeeds', async () => {
        const user = userEvent.setup();
        mocks.updateTenant.mockClear();
        mocks.updateTenant.mockImplementation((_data: unknown, options?: { onSuccess?: () => void }) =>
            options?.onSuccess?.(),
        );
        const first = renderImprint();
        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.saveDraft' }));
        await user.click(screen.getByRole('button', { name: 'legal.m3Editor.publish' }));
        first.unmount();

        expect(mocks.updateTenant.mock.calls[0][0]).toEqual({
            content: { imprint: { de: '<p>edited</p>', en: '<p>Imprint EN</p>', fr: '<p>Imprint FR</p>' } },
        });

        renderImprint();
        expect(screen.queryByText('legal.draft.notice.title')).not.toBeInTheDocument();
        mocks.updateTenant.mockReset();
    });

    it('gives a viewer without edit permission no draft action', () => {
        mocks.canEdit = false;
        renderImprint();
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.saveDraft' })).not.toBeInTheDocument();
    });

    it('keeps unsaved edits when the draft could not be discarded', async () => {
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
        await user.click(screen.getByRole('button', { name: 'legal.draft.discard' }));

        expect(screen.getByTestId('m3-editor')).toHaveAttribute('data-value', '<p>edited</p>');
        expect(screen.getByText('legal.draft.notice.title')).toBeInTheDocument();
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

    it('offers no draft action when the user id could not be loaded at all', () => {
        mocks.userId = undefined;
        renderImprint();
        // The editor still works — only the draft action is withheld, because without a
        // scope it would silently store nothing.
        expect(screen.getByTestId('m3-editor')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'legal.m3Editor.saveDraft' })).not.toBeInTheDocument();
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
        expect(screen.queryByText('legal.draft.notice.title')).not.toBeInTheDocument();
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
        expect(screen.queryByText('legal.draft.notice.title')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'legal.draft.discard' })).not.toBeInTheDocument();
    });
});
