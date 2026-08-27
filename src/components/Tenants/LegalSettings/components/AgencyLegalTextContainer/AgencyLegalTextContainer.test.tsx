import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    useDepartmentDpp: vi.fn(),
    refetch: vi.fn(),
    card: vi.fn(),
    canEditLegalText: vi.fn(() => true),
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
    useUserPermissions: () => ({ can: h.canEditLegalText, permissions: {} }),
}));
// The department-scoped history has its own suite (AgencyLegalTextContainer.versions.test.tsx).
vi.mock('../../../../../hooks/useUserData.hook', () => ({
    // The container reads the opaque user id to scope its device-local draft; without
    // this mock the real react-query hook runs and the render dies on "No QueryClient".
    useUserData: () => ({ data: { id: 'user-7' }, isLoading: false }),
    USER_DATA_KEY: 'user-data',
}));
vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({
    useLegalTextVersions: () => ({ data: [], isError: false }),
}));
vi.mock('../DepartmentDataProtectionCard', () => ({
    DepartmentDataProtectionCard: (props: any) => {
        h.card(props);
        // The real card renders the slot into the editor's function bar; the stub has to as well,
        // or the switcher the test drives is never in the DOM.
        return <div data-testid="legal-editor">{props.departmentSlot}</div>;
    },
}));

import { AgencyLegalTextContainer } from '.';

const agencyData: any = {
    id: '55',
    tenantId: '1',
    topics: [{ id: 3, name: 'U25 Suizidprävention' }],
    content: { privacy: { de: '<p>agency wide</p>' } },
};

const renderContainer = () =>
    render(<AgencyLegalTextContainer agencyData={agencyData} field="privacy" onSaveAgencyWide={vi.fn()} />);

/** Drives the real DepartmentSelect, so the test exercises the switcher the admin actually uses. */
const selectDepartment = async (name: string) => {
    await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
    await userEvent.click(await screen.findByText(name));
};

describe('AgencyLegalTextContainer', () => {
    beforeEach(() => {
        h.useDepartmentDpp.mockReset();
        h.card.mockReset();
        h.canEditLegalText.mockReset().mockReturnValue(true);
    });

    it('edits the agency-wide text before a department is chosen', () => {
        h.useDepartmentDpp.mockReturnValue({ data: undefined, isLoading: false, isError: false, isSuccess: true });

        renderContainer();

        expect(screen.getByTestId('legal-editor')).toBeInTheDocument();
        expect(h.card.mock.calls[0][0].initialContentByLanguage).toEqual({ de: '<p>agency wide</p>' });
        // No department chosen — the card must not claim a publication status of its own.
        expect(h.card.mock.calls[0][0].publicationStatus).toBeUndefined();
    });

    it('lets the admin leave a department that is still loading', async () => {
        // The editor must not open before the department's own text is known, but blanking the
        // whole card would strand the admin on a Fachbereich they cannot leave. A switcher that
        // merely renders is not enough — it has to still work, so the test drives it back out.
        h.useDepartmentDpp.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
            isSuccess: false,
        });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(screen.queryByTestId('legal-editor')).not.toBeInTheDocument();

        await selectDepartment('agency.legal.department.all');

        // Back on the agency-wide text, which needs no department read — the editor returns even
        // though the department query is still loading.
        expect(screen.getByTestId('legal-editor')).toBeInTheDocument();
        expect(h.card.mock.calls.at(-1)?.[0].initialContentByLanguage).toEqual({ de: '<p>agency wide</p>' });
    });

    it('blocks editing instead of seeding the inherited text when the department read fails', async () => {
        // The dangerous case: an errored read yields an empty content map exactly like a department
        // that genuinely has none. Seeding the editor with the inherited text would let a publish
        // silently replace the department's real text — the very defect this epic removes.
        h.useDepartmentDpp.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            isSuccess: false,
            refetch: h.refetch,
        });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(screen.queryByTestId('legal-editor')).not.toBeInTheDocument();
        expect(screen.getByText('agency.legal.department.loadError.title')).toBeInTheDocument();
    });

    it('offers a retry that refetches the department text', async () => {
        h.useDepartmentDpp.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            isSuccess: false,
            refetch: h.refetch,
        });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        await userEvent.click(screen.getByRole('button', { name: 'agency.legal.department.loadError.retry' }));

        expect(h.refetch).toHaveBeenCalled();
    });

    it('shows the department its own text once the read succeeds', async () => {
        h.useDepartmentDpp.mockReturnValue({
            data: { content: '{"de":"<p>department own</p>"}', publicationStatus: 'PUBLISHED' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(h.card.mock.calls.at(-1)?.[0].initialContentByLanguage).toEqual({ de: '<p>department own</p>' });
    });

    it('seeds a department with no own text from the inherited text', async () => {
        // The draft copy: nothing is written until the admin saves or publishes.
        h.useDepartmentDpp.mockReturnValue({
            data: { content: null, publicationStatus: 'DRAFT' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(h.card.mock.calls.at(-1)?.[0].initialContentByLanguage).toEqual({ de: '<p>agency wide</p>' });
    });

    /**
     * #609: this editor shipped without any permission check, so an admin who may not
     * change legal content was still offered publish and draft-save.
     */
    it('hands the card a read-only state when the admin may not change legal content', () => {
        h.canEditLegalText.mockReturnValue(false);
        h.useDepartmentDpp.mockReturnValue({ data: undefined, isLoading: false, isError: false, isSuccess: true });

        renderContainer();

        expect(h.card.mock.calls.at(-1)?.[0].readOnly).toBe(true);
    });

    it('leaves the card editable when the admin may', () => {
        h.useDepartmentDpp.mockReturnValue({ data: undefined, isLoading: false, isError: false, isSuccess: true });

        renderContainer();

        expect(h.card.mock.calls.at(-1)?.[0].readOnly).toBe(false);
    });

    /**
     * #583: the switcher marks who has left the inherited text. The two kinds have separate
     * flags — a Fachbereich with its own imprint may still inherit the privacy policy, and
     * showing the wrong one would tell the admin the opposite of the truth.
     */
    describe('marks departments that carry their own text', () => {
        const withDepartments = (field: 'privacy' | 'imprint') => {
            h.useDepartmentDpp.mockReturnValue({ data: undefined, isLoading: false, isError: false, isSuccess: true });
            return render(
                <AgencyLegalTextContainer
                    agencyData={{
                        ...agencyData,
                        topics: [
                            { id: 3, name: 'U25 Suizidprävention' },
                            { id: 4, name: 'Schuldnerberatung' },
                        ],
                        departments: [
                            { topicId: 3, hasPublishedDpp: true, hasPublishedImprint: false },
                            { topicId: 4, hasPublishedDpp: false, hasPublishedImprint: true },
                        ],
                    }}
                    field={field}
                    onSaveAgencyWide={vi.fn()}
                />,
            );
        };

        it('uses the data-protection flag on the privacy editor', async () => {
            withDepartments('privacy');
            await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));

            expect(await screen.findByTestId('own-text-3')).toBeInTheDocument();
            expect(screen.queryByTestId('own-text-4')).not.toBeInTheDocument();
        });

        it('uses the imprint flag on the imprint editor', async () => {
            withDepartments('imprint');
            await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));

            expect(await screen.findByTestId('own-text-4')).toBeInTheDocument();
            expect(screen.queryByTestId('own-text-3')).not.toBeInTheDocument();
        });
    });
});
