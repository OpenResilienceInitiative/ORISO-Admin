import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    cardMounts: 0,
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
    readOnlyReason: { key: 'tenants.legal.readOnly.managedByTraeger', platformLock: false },
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: unknown) =>
            options && typeof options === 'object' && 'count' in options ? `${key} ${JSON.stringify(options)}` : key,
        i18n: { language: 'de' },
    }),
}));
vi.mock('../../hooks/useLegalTextReadOnlyReason', () => ({
    useLegalTextReadOnlyReason: () => h.readOnlyReason,
}));
vi.mock('../../../../DpaLegalForm/DpaLegalReader', () => ({
    DpaLegalReader: ({ html, testId }: { html: string; testId?: string }) => (
        <div data-testid={testId}>{html.replace(/<[^>]+>/g, '')}</div>
    ),
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
vi.mock('../DepartmentDataProtectionCard', async () => {
    const { useEffect } = await import('react');
    return {
        DepartmentDataProtectionCard: (props: any) => {
            h.card(props);
            // Counts mounts: a remount would replace the uncontrolled editor and its typing.
            useEffect(() => {
                h.cardMounts += 1;
            }, []);
            return <div data-testid="legal-editor">{props.departmentSlot}</div>;
        },
    };
});

import { AgencyLegalTextContainer } from '.';
import type { AgencyTemplateInbox } from '../../hooks/useLegalProposalInbox';

/** One Fachbereich: normally preselected, so adopting must bring the agency-wide draft into view. */
const agencyData: any = {
    id: 101,
    tenantId: 7,
    topics: [{ id: 3, name: 'Schuldnerberatung' }],
    departments: [{ topicId: 3, hasPublishedDpp: false }],
    content: { privacy: { de: '<p>agency de</p>' } },
};

const proposal = {
    id: 5001,
    status: 'PENDING' as const,
    revision: '5001:0',
    createdAt: '2026-09-25T14:31:07',
    content: { de: '<p>Träger-Fassung</p>' },
    departmentImpact: { affected: 3, notAffected: 1, notAffectedTopicIds: [12] },
};

const adoptedDraft = {
    kind: 'DPP' as const,
    content: { de: '<p>Träger-Fassung</p>' },
    consentText: {},
    revision: '8c65:4',
    savedAt: '2026-09-25T14:40:00',
};

const inbox = (overrides: Partial<AgencyTemplateInbox> = {}): AgencyTemplateInbox => ({
    state: 'available',
    current: proposal,
    archives: [],
    dismiss: vi.fn().mockResolvedValue(undefined),
    adopt: vi.fn().mockResolvedValue(adoptedDraft),
    ...overrides,
});

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

const renderContainer = (templateInbox: AgencyTemplateInbox) =>
    render(
        <AgencyLegalTextContainer
            agencyData={agencyData}
            field="privacy"
            onSaveAgencyWide={h.onSaveAgencyWide}
            templateInbox={templateInbox}
        />,
    );

const cardProps = () => h.card.mock.calls.at(-1)?.[0];

describe('AgencyLegalTextContainer — templates forwarded by the Träger (#1070)', () => {
    beforeEach(() => {
        h.card.mockReset();
        h.notice.mockReset();
        h.canEdit.mockReset().mockReturnValue(true);
        h.onSaveAgencyWide.mockReset().mockResolvedValue(undefined);
        h.localDiscard.mockReset().mockReturnValue(true);
        h.serverSave.mockReset();
        h.serverDiscard.mockReset().mockResolvedValue(undefined);
        h.retry.mockReset();
        h.localDraft = undefined;
        h.localSavedAt = undefined;
        h.server = defaultServer();
        h.departmentDpp = {
            data: { content: '{}', publicationStatus: 'DRAFT' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        };
        h.readOnlyReason = { key: 'tenants.legal.readOnly.managedByTraeger', platformLock: false };
    });

    it('shows the template beside the card, with the Fachbereich impact, and reads the agency draft even for one Fachbereich', () => {
        renderContainer(inbox());
        expect(screen.getByTestId('legal-template-reader')).toHaveTextContent('Träger-Fassung');
        expect(screen.getByTestId('legal-editor')).toBeInTheDocument();
        expect(screen.getByText(/legal.proposal.departmentImpact/)).toHaveTextContent('"count":3');
        // The single Fachbereich is preselected, yet adopting needs the agency-wide draft's revision.
        expect(h.server.hookArgs).toEqual({ agencyId: 101, kind: 'DPP', enabled: true });
    });

    it('adopts into an empty agency draft and then shows the agency-wide text, publishing nothing', async () => {
        const templateInbox = inbox();
        renderContainer(templateInbox);
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.adopt' }));
        await waitFor(() => expect(templateInbox.adopt).toHaveBeenCalledWith(proposal, 'CREATE_IF_EMPTY', undefined));
        await waitFor(() => expect(cardProps().documentScope).toBe('agency'));
        expect(cardProps().initialContentByLanguage).toEqual({ de: '<p>Träger-Fassung</p>' });
        expect(h.onSaveAgencyWide).not.toHaveBeenCalled();
    });

    it('over an existing draft it confirms, then archives and replaces with that revision', async () => {
        h.server = {
            ...defaultServer(),
            draft: { ...adoptedDraft, content: { de: '<p>eigen</p>' }, revision: '8c65:3' },
        };
        const templateInbox = inbox();
        renderContainer(templateInbox);
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.adopt' }));
        const dialog = await screen.findByRole('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: 'legal.proposal.replace.confirm' }));
        await waitFor(() =>
            expect(templateInbox.adopt).toHaveBeenCalledWith(proposal, 'ARCHIVE_AND_REPLACE', '8c65:3'),
        );
    });

    it('a browser-only draft is saved to the server first, so replacing archives it instead of losing it', async () => {
        h.localDraft = { content: { de: '<p>nur im Browser</p>' }, consent: { de: 'Satz {{legal_links}}' } };
        h.localSavedAt = '2026-09-25T10:00:00Z';
        h.serverSave.mockResolvedValue({ ...adoptedDraft, revision: 'local-saved:1' });
        const templateInbox = inbox();
        renderContainer(templateInbox);
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.adopt' }));
        await userEvent.click(
            within(await screen.findByRole('dialog')).getByRole('button', { name: 'legal.proposal.replace.confirm' }),
        );
        await waitFor(() =>
            expect(templateInbox.adopt).toHaveBeenCalledWith(proposal, 'ARCHIVE_AND_REPLACE', 'local-saved:1'),
        );
        expect(h.serverSave).toHaveBeenCalledWith({
            content: { de: '<p>nur im Browser</p>' },
            consentText: { de: 'Satz {{legal_links}}' },
        });
    });

    it('dismissing leaves the draft alone', async () => {
        const templateInbox = inbox();
        renderContainer(templateInbox);
        await userEvent.click(screen.getByRole('button', { name: 'legal.proposal.dismiss' }));
        await waitFor(() => expect(templateInbox.dismiss).toHaveBeenCalledWith(proposal));
        expect(h.serverDiscard).not.toHaveBeenCalled();
        expect(h.localDiscard).not.toHaveBeenCalled();
    });

    it('read-only (platform lock): the template is shown with the lock reason, adopting is disabled', () => {
        h.canEdit.mockReturnValue(false);
        h.readOnlyReason = { key: 'tenants.legal.readOnly.lockedPlatformWide', platformLock: true };
        renderContainer(inbox());
        expect(screen.getByTestId('legal-template-reader')).toBeInTheDocument();
        expect(screen.getByText('tenants.legal.readOnly.lockedPlatformWide', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'legal.proposal.adopt' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'legal.proposal.dismiss' })).toBeDisabled();
    });
});
