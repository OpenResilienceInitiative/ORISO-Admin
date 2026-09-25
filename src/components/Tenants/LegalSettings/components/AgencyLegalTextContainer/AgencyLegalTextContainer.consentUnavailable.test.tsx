import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    useDepartmentDpp: vi.fn(),
    card: vi.fn(),
    useAgencyLegalDraft: vi.fn(),
}));

vi.mock('../../hooks/useAgencyLegalDraft', () => ({
    useAgencyLegalDraft: (...args: unknown[]) => {
        h.useAgencyLegalDraft(...args);
        return {
            draft: null,
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
        };
    },
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));
vi.mock('../../../../../hooks/useDepartmentDpp.hook', () => ({ useDepartmentDpp: h.useDepartmentDpp }));
vi.mock('../../../../../hooks/useDepartmentImprint.hook', () => ({
    useDepartmentImprint: () => ({ data: undefined, isLoading: false, isError: false, isSuccess: true }),
}));
vi.mock('../../../../../hooks/usePublishDepartmentDpp.hook', () => ({
    usePublishDepartmentDpp: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../../../hooks/usePublishDepartmentImprint.hook', () => ({
    usePublishDepartmentImprint: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../../../hooks/useSingleTenantData', () => ({ useSingleTenantData: () => ({ data: undefined }) }));
vi.mock('../../../../../hooks/useTenantAdminData.hook', () => ({ useTenantAdminData: () => ({ data: undefined }) }));
vi.mock('../../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate: vi.fn() }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: () => true, permissions: {} }),
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

const withTopics = (topics: { id: number; name: string }[]) => ({
    id: '55',
    tenantId: '1',
    topics,
    content: { privacy: { de: '<p>agency wide</p>' } },
});

const renderContainer = (props: Record<string, unknown> = {}) =>
    render(
        <AgencyLegalTextContainer
            agencyData={withTopics([{ id: 3, name: 'U25 Suizidprävention' }]) as any}
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

/**
 * #914 — `consentByLanguage === undefined` carries three different situations. Only the
 * two the admin can act on (or must be warned about) get an explanation.
 */
describe('AgencyLegalTextContainer — why consent is unavailable', () => {
    beforeEach(() => {
        h.card.mockReset();
        h.useAgencyLegalDraft.mockReset();
        h.useDepartmentDpp.mockReset().mockReturnValue({
            data: { content: '{"de":"<p>own</p>"}', publicationStatus: 'PUBLISHED' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        });
    });

    // The switcher hides itself with zero departments, so the selection can never leave
    // "Alle Fachbereiche" — consent is unreachable for this agency, not merely one click away.
    it('names the zero-Fachbereich case, the one the operator disclaimer is for', () => {
        renderContainer({ agencyData: withTopics([]) });

        expect(cardProps().consentUnavailableReason).toBe('noDepartments');
    });

    it('names the agency-wide selection while Fachbereiche exist (#862)', () => {
        renderContainer();

        expect(cardProps().consentUnavailableReason).toBe('allDepartments');
    });

    it('explains nothing once a Fachbereich is selected and the field is there', async () => {
        h.useDepartmentDpp.mockReturnValue({
            data: { content: '{"de":"<p>own</p>"}', publicationStatus: 'PUBLISHED', consentText: '{"de":"Satz"}' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(cardProps().consentByLanguage).toBeDefined();
        expect(cardProps().consentUnavailableReason).toBeUndefined();
    });

    // A Fachbereich without a `consentText` yet is the seed case of #929: the chooser has to
    // be reachable exactly there, so the consent map is EMPTY rather than absent — and an
    // explanation would be wrong, because the admin can act. (#914 and #929 merged
    // independently; this is the reconciled contract.)
    it('offers the seed chooser instead of an explanation when a Fachbereich has no consent sentence yet', async () => {
        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(cardProps().consentByLanguage).toEqual({});
        expect(cardProps().consentUnavailableReason).toBeUndefined();
    });

    // A record that has not arrived has an empty topic list too — and "no Fachbereich"
    // is a legal claim about a specific Beratungsstelle, not about a pending request.
    it('says nothing until the agency record is actually there', () => {
        renderContainer({ agencyData: undefined });

        expect(screen.queryByTestId('legal-editor')).not.toBeInTheDocument();
        expect(h.card).not.toHaveBeenCalled();
        expect(h.useAgencyLegalDraft).toHaveBeenCalledWith(Number.NaN, 'DPP', false);
    });

    // ADR-021 decision 7 — the imprint has no consent gate, so it gets no explanation either.
    it('stays silent on the imprint, with or without Fachbereiche', () => {
        renderContainer({ field: 'imprint', agencyData: withTopics([]) });

        expect(cardProps().consentUnavailableReason).toBeUndefined();
    });
});
