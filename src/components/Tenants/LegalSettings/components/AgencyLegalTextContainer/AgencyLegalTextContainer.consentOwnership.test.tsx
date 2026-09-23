import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    useDepartmentDpp: vi.fn(),
    card: vi.fn(),
    cardMounts: vi.fn(),
    publishDpp: vi.fn(),
    tenant: vi.fn(),
    saveAgencyDraft: vi.fn(),
    discardAgencyDraft: vi.fn(),
}));

vi.mock('../../hooks/useAgencyLegalDraft', () => ({
    useAgencyLegalDraft: () => ({
        draft: null,
        isLoading: false,
        isError: false,
        retry: vi.fn(),
        save: h.saveAgencyDraft,
        discard: h.discardAgencyDraft,
        hasConflict: false,
        conflict: undefined,
        conflictRefreshFailed: false,
        conflictRefreshing: false,
        retryConflict: vi.fn(),
        clearConflict: vi.fn(),
    }),
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));
vi.mock('../../../../../hooks/useDepartmentDpp.hook', () => ({ useDepartmentDpp: h.useDepartmentDpp }));
vi.mock('../../../../../hooks/useDepartmentImprint.hook', () => ({
    useDepartmentImprint: () => ({ data: undefined, isLoading: false, isError: false, isSuccess: true }),
}));
vi.mock('../../../../../hooks/usePublishDepartmentDpp.hook', () => ({
    usePublishDepartmentDpp: () => ({ mutate: h.publishDpp, isPending: false }),
}));
vi.mock('../../../../../hooks/usePublishDepartmentImprint.hook', () => ({
    usePublishDepartmentImprint: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../../../hooks/useSingleTenantData', () => ({ useSingleTenantData: () => h.tenant() }));
vi.mock('../../../../../hooks/useTenantAdminData.hook', () => ({ useTenantAdminData: () => ({ data: undefined }) }));
vi.mock('../../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate: vi.fn() }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: () => true, permissions: {} }),
}));
vi.mock('../../../../../hooks/useUserData.hook', () => ({
    // The container reads the opaque user id to scope its device-local draft; without
    // this mock the real react-query hook runs and the render dies on "No QueryClient".
    useUserData: () => ({ data: { id: 'user-7' }, isLoading: false }),
    USER_DATA_KEY: 'user-data',
}));
vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({
    useLegalTextVersions: () => ({ data: [], isError: false }),
}));
vi.mock('../DepartmentDataProtectionCard', async () => {
    const { useEffect } = await import('react');
    return {
        DepartmentDataProtectionCard: (props: any) => {
            h.card(props);
            // Counts mounts, so a test can tell a remount (staged edits discarded)
            // from a re-render (staged edits kept).
            useEffect(() => {
                h.cardMounts();
            }, []);
            return <div data-testid="legal-editor">{props.departmentSlot}</div>;
        },
    };
});

import { AgencyLegalTextContainer } from '.';

const agencyData: any = {
    id: '55',
    tenantId: '1',
    topics: [{ id: 3, name: 'U25 Suizidprävention' }],
    content: { privacy: { de: '<p>agency wide</p>' } },
};

const renderContainer = (props: Record<string, unknown> = {}) =>
    render(
        <AgencyLegalTextContainer
            agencyData={agencyData}
            field="privacy"
            onSaveAgencyWide={vi.fn()}
            {...(props as any)}
        />,
    );

const selectDepartment = async (name: string) => {
    await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
    await userEvent.click(await screen.findByText(name));
};

const cardProps = () => h.card.mock.calls.at(-1)?.[0];

/** A Fachbereich whose policy BODY is empty — the state the QA run hit. */
const departmentWithoutBody = (extra: Record<string, unknown> = {}) =>
    h.useDepartmentDpp.mockReturnValue({
        data: { content: '{}', publicationStatus: 'DRAFT', ...extra },
        isLoading: false,
        isError: false,
        isSuccess: true,
    });

/**
 * A consent sentence is a FIELD of the policy, and a blank policy body means the
 * level above still governs the document text (ADR-021 decision 1). The two are
 * therefore independent: judging whether a Fachbereich has its own SENTENCE by
 * whether it has its own BODY threw away every sentence saved against an empty
 * policy — which is exactly how an admin authors the first one (#929).
 */
describe('AgencyLegalTextContainer — a sentence of its own, with no body of its own', () => {
    beforeEach(() => {
        h.useDepartmentDpp.mockReset();
        h.card.mockReset();
        h.cardMounts.mockReset();
        h.publishDpp.mockReset();
        h.tenant.mockReset().mockReturnValue({ data: { content: { privacyConsent: { de: 'Träger-Satz' } } } });
        h.saveAgencyDraft.mockReset();
        h.discardAgencyDraft.mockReset().mockResolvedValue(undefined);
    });

    it('shows the stored sentence, not the inherited one', async () => {
        departmentWithoutBody({ consentText: '{"de":"Fachbereich-Satz"}' });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(cardProps().consentByLanguage).toEqual({ de: 'Fachbereich-Satz' });
        expect(cardProps().consentInheritedFrom).toBeUndefined();
    });

    it('keeps a deliberately blank sentence blank', async () => {
        // Blank is a decision, not an absence: at runtime it means the level
        // above governs. Re-seeding it would silently re-author a legal
        // sentence nobody wrote.
        departmentWithoutBody({ consentText: '{"de":""}' });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(cardProps().consentByLanguage).toEqual({ de: '' });
    });

    it('still inherits when the Fachbereich has no sentence at all', async () => {
        departmentWithoutBody();

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(cardProps().consentByLanguage).toEqual({ de: 'Träger-Satz' });
        expect(cardProps().consentInheritedFrom).toBe('legal.consent.level.agency');
    });

    it('keeps the body inheriting while the sentence is the Fachbereich’s own', async () => {
        departmentWithoutBody({ consentText: '{"de":"Fachbereich-Satz"}' });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        // An empty own body still edits a copy of the agency-wide text — that
        // seeding rule is unrelated to the sentence and must not change.
        expect(cardProps().initialContentByLanguage).toEqual({ de: '<p>agency wide</p>' });
    });

    it('resets the card when the inherited sentence it shows changes', async () => {
        // An unforked Fachbereich shows the level above's sentence, and publishing
        // forks it with whatever the card holds. Keyed on the Fachbereich's own
        // record alone, a refetch of the inherited sentence kept the card mounted
        // with the staged edits laid over the new text, and publish shipped them.
        departmentWithoutBody();

        const view = renderContainer();
        await selectDepartment('U25 Suizidprävention');
        const mountsBefore = h.cardMounts.mock.calls.length;

        h.tenant.mockReturnValue({ data: { content: { privacyConsent: { de: 'Neuer Träger-Satz' } } } });
        view.rerender(<AgencyLegalTextContainer agencyData={agencyData} field="privacy" onSaveAgencyWide={vi.fn()} />);

        expect(cardProps().consentByLanguage).toEqual({ de: 'Neuer Träger-Satz' });
        expect(h.cardMounts.mock.calls.length).toBe(mountsBefore + 1);
    });
});
