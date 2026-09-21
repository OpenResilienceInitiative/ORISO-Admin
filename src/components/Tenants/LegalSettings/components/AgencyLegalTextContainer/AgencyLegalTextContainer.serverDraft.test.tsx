import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    card: vi.fn(),
    notice: vi.fn(),
    canEdit: vi.fn(() => true),
    onSaveAgencyWide: vi.fn(),
    localDiscard: vi.fn(() => true),
    serverSave: vi.fn(),
    serverDiscard: vi.fn(),
    clearConflict: vi.fn(),
    retry: vi.fn(),
    retryConflict: vi.fn(),
    departmentDpp: {} as any,
    tenantData: {
        content: {
            privacy: { de: '<p>tenant de</p>', en: '<p>tenant en</p>' },
            privacyConsent: { de: 'tenant consent', en: 'tenant consent en' },
        },
    } as any,
    localDraft: undefined as any,
    localSavedAt: undefined as string | undefined,
    server: {} as any,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));
vi.mock('../../../../../hooks/useDepartmentDpp.hook', () => ({
    useDepartmentDpp: () => h.departmentDpp,
}));
vi.mock('../../../../../hooks/useDepartmentImprint.hook', () => ({
    useDepartmentImprint: () => ({ data: undefined, isLoading: false, isError: false, isSuccess: true }),
}));
vi.mock('../../../../../hooks/usePublishDepartmentDpp.hook', () => ({
    usePublishDepartmentDpp: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../../../hooks/usePublishDepartmentImprint.hook', () => ({
    usePublishDepartmentImprint: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({ data: h.tenantData, isLoading: false }),
}));
vi.mock('../../../../../hooks/useTenantAdminData.hook', () => ({
    useTenantAdminData: () => ({ data: { settings: { activeLanguages: ['de', 'en'] } } }),
}));
vi.mock('../../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate: vi.fn() }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: h.canEdit, permissions: {} }),
}));
vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({
    useLegalTextVersions: () => ({ data: [], isError: false }),
}));
vi.mock('../../../../../hooks/useUserData.hook', () => ({
    useUserData: () => ({ data: { id: 'user-7' }, isLoading: false }),
}));
vi.mock('../../hooks/useLegalDraft', () => ({
    useLegalDraft: () => ({
        draft: h.localDraft,
        savedAt: h.localSavedAt,
        saveDraft: vi.fn(),
        discardDraft: h.localDiscard,
    }),
}));
vi.mock('../../hooks/useAgencyLegalDraft', () => ({
    useAgencyLegalDraft: (agencyId: number, kind: string, enabled: boolean) => {
        h.server.hookArgs = { agencyId, kind, enabled };
        return h.server;
    },
}));
vi.mock('../TenantLegalDraftNotice', () => ({
    TenantLegalDraftNotice: (props: any) => {
        h.notice(props);
        return (
            <div data-testid="server-draft-notice">
                <button type="button" onClick={props.loadServer}>
                    load-server
                </button>
                <button type="button" onClick={props.keepLocal}>
                    keep-local
                </button>
                <button type="button" onClick={props.reloadConflict}>
                    reload-conflict
                </button>
                <button type="button" onClick={props.keepEditing}>
                    keep-editing
                </button>
            </div>
        );
    },
}));
vi.mock('../DepartmentDataProtectionCard', () => ({
    DepartmentDataProtectionCard: (props: any) => {
        h.card(props);
        return <div data-testid="legal-editor">{props.departmentSlot}</div>;
    },
}));

import { AgencyLegalTextContainer } from '.';

const agencyData: any = {
    id: 0,
    tenantId: 0,
    topics: [],
    content: {
        privacy: { de: '<p>agency de</p>' },
        privacyConsent: { de: 'agency consent' },
    },
};

const defaultServer = () => ({
    draft: null,
    isLoading: false,
    isError: false,
    retry: h.retry,
    save: h.serverSave,
    discard: h.serverDiscard,
    hasConflict: false,
    conflict: undefined,
    conflictRefreshFailed: false,
    conflictRefreshing: false,
    retryConflict: h.retryConflict,
    clearConflict: h.clearConflict,
});

const renderContainer = (props: Record<string, unknown> = {}) =>
    render(
        <AgencyLegalTextContainer
            agencyData={agencyData}
            field="privacy"
            onSaveAgencyWide={h.onSaveAgencyWide}
            {...(props as any)}
        />,
    );

const cardProps = () => h.card.mock.calls.at(-1)?.[0];
const noticeProps = () => h.notice.mock.calls.at(-1)?.[0];

describe('AgencyLegalTextContainer server drafts', () => {
    beforeEach(() => {
        h.card.mockReset();
        h.notice.mockReset();
        h.canEdit.mockReset().mockReturnValue(true);
        h.onSaveAgencyWide.mockReset().mockResolvedValue(undefined);
        h.localDiscard.mockReset().mockReturnValue(true);
        h.serverSave.mockReset();
        h.serverDiscard.mockReset().mockResolvedValue(undefined);
        h.clearConflict.mockReset();
        h.retry.mockReset();
        h.retryConflict.mockReset();
        h.localDraft = undefined;
        h.localSavedAt = undefined;
        h.server = defaultServer();
        h.departmentDpp = { data: undefined, isLoading: false, isError: false, isSuccess: true };
    });

    it('enables the agency draft query for a loaded finite id including zero', async () => {
        renderContainer();

        expect(h.server.hookArgs).toEqual({ agencyId: 0, kind: 'DPP', enabled: true });
        expect(cardProps().initialContentByLanguage).toEqual({
            de: '<p>agency de</p>',
            en: '<p>tenant en</p>',
        });
    });

    it('creates a complete effective DPP snapshot without inventing a revision', async () => {
        h.serverSave.mockResolvedValue({
            kind: 'DPP',
            content: { de: '<p>normalized</p>', en: '<p>normalized en</p>' },
            consentText: { de: 'agency consent', en: 'tenant consent en' },
            revision: 'draft-id:0',
            savedAt: '2026-09-17T14:00:00',
        });
        renderContainer();

        await act(async () => cardProps().onSave({ de: '<p>edited</p>', en: '<p>edited en</p>' }, false));

        expect(h.serverSave).toHaveBeenCalledWith({
            content: { de: '<p>edited</p>', en: '<p>edited en</p>' },
            consentText: { de: 'agency consent', en: 'tenant consent en' },
        });
        expect(h.onSaveAgencyWide).not.toHaveBeenCalled();
    });

    it('saves and publishes IMPRINT without a consent field', async () => {
        const saved = {
            kind: 'IMPRINT' as const,
            content: { de: '<p>normalized imprint</p>' },
            consentText: {},
            revision: 'imprint-id:0',
            savedAt: '2026-09-17T14:05:00',
        };
        h.serverSave.mockResolvedValue(saved);
        renderContainer({
            field: 'imprint',
            agencyData: { ...agencyData, content: { impressum: { de: '<p>published imprint</p>' } } },
        });

        expect(h.server.hookArgs).toEqual({ agencyId: 0, kind: 'IMPRINT', enabled: true });
        await act(async () => cardProps().onSave({ de: '<p>edited imprint</p>' }, true));

        expect(h.serverSave).toHaveBeenCalledWith({ content: { de: '<p>edited imprint</p>' } });
        expect(h.onSaveAgencyWide).toHaveBeenCalledWith({
            content: { impressum: saved.content },
        });
        expect(h.serverDiscard).toHaveBeenCalledWith(saved.revision);
    });

    it('treats a selected server snapshot as authoritative, including removed languages and empty consent', async () => {
        h.server.draft = {
            kind: 'DPP',
            content: { de: '<p>server only</p>' },
            consentText: {},
            revision: 'draft-id:2',
            savedAt: '2026-09-17T14:10:00',
        };
        h.serverSave.mockResolvedValue({ ...h.server.draft, revision: 'draft-id:3' });
        renderContainer();

        expect(cardProps().initialContentByLanguage).toEqual({ de: '<p>server only</p>' });
        await act(async () => cardProps().onSave({ de: '<p>edited server</p>' }, false));

        expect(h.serverSave).toHaveBeenCalledWith({
            content: { de: '<p>edited server</p>' },
            consentText: {},
            revision: 'draft-id:2',
        });
    });

    it('requires an explicit source choice when local and server drafts collide', async () => {
        h.localDraft = {
            content: { de: '<p>local</p>' },
            consent: { de: 'local consent' },
            savedAt: '2026-09-17T13:00:00Z',
        };
        h.localSavedAt = h.localDraft.savedAt;
        h.server.draft = {
            kind: 'DPP',
            content: { de: '<p>server</p>' },
            consentText: { de: 'server consent' },
            revision: 'draft-id:1',
            savedAt: '2026-09-17T14:00:00',
        };
        renderContainer();

        expect(noticeProps().collision).toBe(true);
        expect(cardProps().initialContentByLanguage).toEqual({ de: '<p>agency de</p>', en: '<p>tenant en</p>' });
        expect(cardProps().readOnly).toBe(true);
        expect(h.localDiscard).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('button', { name: 'load-server' }));
        expect(cardProps().initialContentByLanguage).toEqual({ de: '<p>server</p>' });
        expect(h.localDiscard).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('button', { name: 'keep-local' }));
        expect(cardProps().initialContentByLanguage).toEqual({ de: '<p>local</p>' });
        expect(h.localDiscard).not.toHaveBeenCalled();
    });

    it('publishes the normalized saved snapshot, then deletes its exact revision', async () => {
        const saved = {
            kind: 'DPP' as const,
            content: { de: '<p>normalized</p>' },
            consentText: { de: 'normalized consent' },
            revision: 'draft-id:4',
            savedAt: '2026-09-17T14:20:00',
        };
        const order: string[] = [];
        h.serverSave.mockImplementation(async () => {
            order.push('save');
            return saved;
        });
        h.onSaveAgencyWide.mockImplementation(async () => {
            order.push('publish');
        });
        h.serverDiscard.mockImplementation(async () => {
            order.push('delete');
        });
        renderContainer();

        await act(async () => cardProps().onSave({ de: '<script>x</script><p>raw</p>' }, true));

        expect(order).toEqual(['save', 'publish', 'delete']);
        // #862: the agency-wide publish carries the body only; consent keeps inheriting.
        expect(h.onSaveAgencyWide).toHaveBeenCalledWith({ content: { privacy: saved.content } });
        expect(h.serverDiscard).toHaveBeenCalledWith('draft-id:4');
    });

    it('retains the saved draft when publication fails and does not delete it', async () => {
        const saved = {
            kind: 'DPP' as const,
            content: { de: '<p>normalized</p>' },
            consentText: {},
            revision: 'draft-id:5',
            savedAt: '2026-09-17T14:30:00',
        };
        h.serverSave.mockResolvedValue(saved);
        h.onSaveAgencyWide.mockRejectedValue(new Error('publication failed'));
        renderContainer();

        await act(async () => cardProps().onSave({ de: '<p>raw</p>' }, true));

        expect(h.serverDiscard).not.toHaveBeenCalled();
        expect(noticeProps().savedAt).toBe(saved.savedAt);
    });

    it('retains the saved draft when post-publication DELETE returns 404', async () => {
        const saved = {
            kind: 'DPP' as const,
            content: { de: '<p>normalized</p>' },
            consentText: {},
            revision: 'draft-id:6',
            savedAt: '2026-09-17T14:40:00',
        };
        h.serverSave.mockResolvedValue(saved);
        h.serverDiscard.mockRejectedValue(new Error('NO_MATCH'));
        renderContainer();

        await act(async () => cardProps().onSave({ de: '<p>raw</p>' }, true));

        expect(h.onSaveAgencyWide).toHaveBeenCalledTimes(1);
        expect(h.serverDiscard).toHaveBeenCalledWith(saved.revision);
        expect(noticeProps().savedAt).toBe(saved.savedAt);
    });

    it('keeps unpublished local work until a server save succeeds', async () => {
        h.localDraft = { content: { de: '<p>local</p>' }, consent: {}, savedAt: '2026-09-17T13:00:00Z' };
        h.localSavedAt = h.localDraft.savedAt;
        h.serverSave.mockRejectedValue(new Error('offline'));
        renderContainer();

        await act(async () => cardProps().onSave({ de: '<p>local edited</p>' }, false));

        expect(h.localDiscard).not.toHaveBeenCalled();
    });

    it('disables server access and editing without legal-text permission', () => {
        h.canEdit.mockReturnValue(false);
        renderContainer();

        expect(h.server.hookArgs.enabled).toBe(false);
        expect(cardProps().readOnly).toBe(true);
        expect(screen.queryByTestId('server-draft-notice')).not.toBeInTheDocument();
    });

    it('never seeds a department from an unpublished agency draft', async () => {
        h.server.draft = {
            kind: 'DPP',
            content: { de: '<p>unpublished agency draft</p>' },
            consentText: {},
            revision: 'draft-id:7',
            savedAt: '2026-09-17T14:50:00',
        };
        h.departmentDpp = {
            data: { content: '{}', publicationStatus: 'DRAFT', consentText: '{}' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        };
        renderContainer({ agencyData: { ...agencyData, topics: [{ id: 3, name: 'Debt advice' }] } });

        await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
        await userEvent.click(await screen.findByText('Debt advice'));

        await waitFor(() => expect(cardProps().departmentName).toBe('Debt advice'));
        expect(cardProps().initialContentByLanguage).toEqual({
            de: '<p>agency de</p>',
            en: '<p>tenant en</p>',
        });
    });

    it('keeps a late agency save across an A-to-department-to-A switch, without touching local work', async () => {
        let finishOldSave: (draft: any) => void = () => undefined;
        h.serverSave.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishOldSave = resolve;
                }),
        );
        h.departmentDpp = {
            data: { content: '{}', publicationStatus: 'DRAFT', consentText: '{}' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        };
        renderContainer({ agencyData: { ...agencyData, topics: [{ id: 3, name: 'Debt advice' }] } });
        const oldSave = cardProps().onSave({ de: '<p>old A edit</p>' }, false);
        await waitFor(() => expect(cardProps().saving).toBe(true));

        await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
        await userEvent.click(await screen.findByText('Debt advice'));
        await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
        await userEvent.click(await screen.findByText('agency.legal.department.all'));
        await waitFor(() => expect(cardProps().saving).toBe(false));

        finishOldSave({
            kind: 'DPP',
            content: { de: '<p>late old A</p>' },
            consentText: {},
            revision: 'draft-id:8',
            savedAt: '2026-09-17T15:00:00',
        });
        await act(async () => oldSave);

        // The save succeeded on the server: returning to "Alle Fachbereiche" shows it, and the next
        // save builds on its revision instead of running into a 409 against a stale base.
        await waitFor(() => expect(cardProps().initialContentByLanguage).toEqual({ de: '<p>late old A</p>' }));
        expect(h.localDiscard).not.toHaveBeenCalled();
    });

    it('does not clear local work when a late discard finishes in another context', async () => {
        let finishDiscard: () => void = () => undefined;
        h.server.draft = {
            kind: 'DPP',
            content: { de: '<p>server</p>' },
            consentText: {},
            revision: 'draft-id:9',
            savedAt: '2026-09-17T15:10:00',
        };
        h.serverDiscard.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    finishDiscard = resolve;
                }),
        );
        h.departmentDpp = {
            data: { content: '{}', publicationStatus: 'DRAFT', consentText: '{}' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        };
        renderContainer({ agencyData: { ...agencyData, topics: [{ id: 3, name: 'Debt advice' }] } });
        const oldDiscard = noticeProps().onDiscard();

        await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
        await userEvent.click(await screen.findByText('Debt advice'));
        finishDiscard();
        await act(async () => oldDiscard);

        expect(h.localDiscard).not.toHaveBeenCalled();
    });

    it('blocks notice actions while a draft operation is pending', async () => {
        let finishSave: (draft: any) => void = () => undefined;
        h.server.draft = {
            kind: 'DPP',
            content: { de: '<p>server</p>' },
            consentText: {},
            revision: 'draft-id:10',
            savedAt: '2026-09-17T15:20:00',
        };
        h.serverSave.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishSave = resolve;
                }),
        );
        renderContainer();
        const save = cardProps().onSave({ de: '<p>edited</p>' }, false);
        await waitFor(() => expect(noticeProps().pending).toBe(true));

        await act(async () => noticeProps().onDiscard());
        expect(h.serverDiscard).not.toHaveBeenCalled();

        finishSave({
            ...h.server.draft,
            content: { de: '<p>edited</p>' },
            revision: 'draft-id:11',
        });
        await act(async () => save);
    });

    it('preserves the edited snapshot and adopts the remote revision after a 409', async () => {
        h.server.draft = {
            kind: 'DPP',
            content: { de: '<p>my edit base</p>' },
            consentText: {},
            revision: 'draft-id:12',
            savedAt: '2026-09-17T15:30:00',
        };
        h.server.hasConflict = true;
        h.server.conflict = {
            ...h.server.draft,
            content: { de: '<p>remote edit</p>' },
            revision: 'draft-id:13',
        };
        h.clearConflict.mockImplementation(() => {
            h.server.hasConflict = false;
        });
        h.serverSave.mockResolvedValue({ ...h.server.draft, revision: 'draft-id:14' });
        renderContainer();
        expect(cardProps().readOnly).toBe(true);

        await userEvent.click(screen.getByRole('button', { name: 'keep-editing' }));
        await act(async () => cardProps().onSave({ de: '<p>my preserved edit</p>' }, false));

        expect(h.serverSave).toHaveBeenCalledWith({
            content: { de: '<p>my preserved edit</p>' },
            consentText: {},
            revision: 'draft-id:13',
        });
    });
});
