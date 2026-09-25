import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * #1066: the card tells the truth about where its text comes from and why it cannot be edited,
 * and every role sees the same content — only the edit rights differ.
 */
const h = vi.hoisted(() => ({
    card: vi.fn(),
    canEditLegalText: vi.fn(() => true),
    tenantContent: undefined as Record<string, unknown> | undefined,
    serverDraft: null as null | { content: Record<string, string>; revision: string; savedAt: string },
    departmentRead: { data: undefined as unknown, isLoading: false, isError: false, isSuccess: true },
    departmentDppTopicIds: [] as number[],
    readOnlyReason: { key: 'tenants.legal.readOnly.managedByTraeger', platformLock: false },
}));

vi.mock('../../hooks/useAgencyLegalDraft', () => ({
    useAgencyLegalDraft: () => ({
        draft: h.serverDraft,
        isLoading: false,
        isError: false,
        retry: vi.fn(),
        save: vi.fn(),
        discard: vi.fn(),
        hasConflict: false,
        conflict: undefined,
        conflictRefreshFailed: false,
        conflictRefreshing: false,
        retryConflict: vi.fn(),
        clearConflict: vi.fn(),
    }),
}));
vi.mock('../../hooks/useLegalTextReadOnlyReason', () => ({
    useLegalTextReadOnlyReason: () => h.readOnlyReason,
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));
vi.mock('../../../../../hooks/useDepartmentDpp.hook', () => ({
    useDepartmentDpp: (_agencyId: number, topicId: number) => {
        if (Number.isFinite(topicId)) h.departmentDppTopicIds.push(topicId);
        return h.departmentRead;
    },
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
    useSingleTenantData: () => ({ data: h.tenantContent ? { content: h.tenantContent } : undefined }),
}));
vi.mock('../../../../../hooks/useTenantAdminData.hook', () => ({ useTenantAdminData: () => ({ data: undefined }) }));
vi.mock('../../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate: vi.fn() }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: h.canEditLegalText, permissions: {} }),
}));
vi.mock('../../../../../hooks/useUserData.hook', () => ({
    useUserData: () => ({ data: { id: 'user-7' }, isLoading: false }),
    USER_DATA_KEY: 'user-data',
}));
vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({
    useLegalTextVersions: () => ({ data: [], isError: false }),
}));
vi.mock('../DepartmentDataProtectionCard', () => ({
    DepartmentDataProtectionCard: (props: any) => {
        h.card(props);
        return <div data-testid="legal-editor">{props.departmentSlot}</div>;
    },
}));

import { AgencyLegalTextContainer } from '.';

const TRAEGER_TEXT = { de: '<p>Träger</p>' };
const TWO_TOPICS = [
    { id: 3, name: 'U25 Suizidprävention' },
    { id: 4, name: 'Schuldnerberatung' },
];

const renderContainer = (agency: Record<string, unknown> = {}) =>
    render(
        <AgencyLegalTextContainer
            agencyData={{ id: '55', tenantId: '1', topics: TWO_TOPICS, content: {}, ...agency } as any}
            field="privacy"
            onSaveAgencyWide={vi.fn()}
        />,
    );

const lastCard = () => h.card.mock.calls.at(-1)?.[0];

const selectDepartment = async (name: string) => {
    await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
    await userEvent.click(await screen.findByText(name));
};

beforeEach(() => {
    h.card.mockReset();
    h.canEditLegalText.mockReset().mockReturnValue(true);
    h.tenantContent = { privacy: TRAEGER_TEXT };
    h.serverDraft = null;
    h.departmentRead = { data: undefined, isLoading: false, isError: false, isSuccess: true };
    h.departmentDppTopicIds = [];
    h.readOnlyReason = { key: 'tenants.legal.readOnly.managedByTraeger', platformLock: false };
});

describe('AgencyLegalTextContainer — publication badge (H3)', () => {
    it('marks the agency-wide text as published only when the Beratungsstelle has its own', () => {
        renderContainer({ content: { privacy: { de: '<p>eigener Text</p>' } } });

        expect(lastCard().publicationStatus).toBe('PUBLISHED');
    });

    it('marks inherited Träger text as inherited, never as published', () => {
        renderContainer();

        expect(lastCard().initialContentByLanguage).toEqual(TRAEGER_TEXT);
        expect(lastCard().publicationStatus).toBe('INHERITED_FROM_TRAEGER');
    });

    it('claims nothing when neither level has a text', () => {
        h.tenantContent = undefined;
        renderContainer();

        expect(lastCard().publicationStatus).toBeUndefined();
    });

    it('treats an agency map of empty paragraphs as no own text', () => {
        renderContainer({ content: { privacy: { de: '<p></p>' } } });

        expect(lastCard().publicationStatus).toBe('INHERITED_FROM_TRAEGER');
    });

    it('marks a Fachbereich that inherits the Beratungsstelle text as inherited from it', async () => {
        h.departmentRead = {
            data: { content: null, publicationStatus: 'DRAFT' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        };
        renderContainer({ content: { privacy: { de: '<p>eigener Text</p>' } } });

        await selectDepartment('U25 Suizidprävention');

        expect(lastCard().publicationStatus).toBe('INHERITED_FROM_AGENCY');
    });

    it('marks a Fachbereich that inherits all the way from the Träger as inherited from it', async () => {
        h.departmentRead = {
            data: { content: null, publicationStatus: 'DRAFT' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        };
        renderContainer();

        await selectDepartment('U25 Suizidprävention');

        expect(lastCard().publicationStatus).toBe('INHERITED_FROM_TRAEGER');
    });

    it('keeps the stored status of a Fachbereich with its own text', async () => {
        h.departmentRead = {
            data: { content: '{"de":"<p>own</p>"}', publicationStatus: 'PUBLISHED' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        };
        renderContainer();

        await selectDepartment('U25 Suizidprävention');

        expect(lastCard().publicationStatus).toBe('PUBLISHED');
    });
});

describe('AgencyLegalTextContainer — read-only reason (H3/H5)', () => {
    it('names the platform-wide lock when that is what blocks the admin', () => {
        h.canEditLegalText.mockReturnValue(false);
        h.readOnlyReason = { key: 'tenants.legal.readOnly.lockedPlatformWide', platformLock: true };
        renderContainer();

        expect(lastCard().readOnly).toBe(true);
        expect(lastCard().readOnlyReason).toBe('tenants.legal.readOnly.lockedPlatformWide');
    });

    it('keeps the Träger wording where the Träger is the reason', () => {
        h.canEditLegalText.mockReturnValue(false);
        renderContainer();

        expect(lastCard().readOnlyReason).toBe('tenants.legal.readOnly.managedByTraeger');
    });

    it('gives an editor no read-only reason', () => {
        renderContainer();

        expect(lastCard().readOnlyReason).toBeUndefined();
    });
});

describe('AgencyLegalTextContainer — same card for every role (H6)', () => {
    const cardFor = (canEdit: boolean) => {
        h.card.mockReset();
        h.canEditLegalText.mockReturnValue(canEdit);
        const view = renderContainer();
        const { initialContentByLanguage, publicationStatus } = lastCard();
        view.unmount();
        return { initialContentByLanguage, publicationStatus };
    };

    it('shows an editor and a reader the same text and the same badge', () => {
        expect(cardFor(true)).toEqual(cardFor(false));
    });

    it('does not hide the inherited Träger text behind an empty saved draft', () => {
        h.serverDraft = { content: {}, revision: 'r1', savedAt: '2026-09-25T10:00:00Z' };
        renderContainer();

        expect(lastCard().initialContentByLanguage).toEqual(TRAEGER_TEXT);
    });

    it('still opens an editor on the draft that holds text', () => {
        h.serverDraft = { content: { de: '<p>Entwurf</p>' }, revision: 'r1', savedAt: '2026-09-25T10:00:00Z' };
        renderContainer();

        expect(lastCard().initialContentByLanguage).toEqual({ de: '<p>Entwurf</p>' });
    });
});

describe('AgencyLegalTextContainer — one Fachbereich (H4)', () => {
    it('preselects the only Fachbereich', () => {
        h.departmentRead = {
            data: { content: null, publicationStatus: 'DRAFT' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        };
        renderContainer({ topics: [{ id: 3, name: 'U25 Suizidprävention' }] });

        expect(lastCard().documentScope).toBe('department');
        expect(lastCard().departmentName).toBe('U25 Suizidprävention');
        expect(h.departmentDppTopicIds).toContain(3);
    });

    it('starts on "Alle Fachbereiche" when there are several', () => {
        renderContainer();

        expect(lastCard().documentScope).toBe('agency');
    });
});
