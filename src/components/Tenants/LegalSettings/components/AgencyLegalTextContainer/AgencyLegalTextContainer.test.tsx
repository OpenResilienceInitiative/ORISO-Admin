import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    useDepartmentDpp: vi.fn(),
    refetch: vi.fn(),
    card: vi.fn(),
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
    });

    it('edits the agency-wide text before a department is chosen', () => {
        h.useDepartmentDpp.mockReturnValue({ data: undefined, isLoading: false, isError: false, isSuccess: true });

        renderContainer();

        expect(screen.getByTestId('legal-editor')).toBeInTheDocument();
        expect(h.card.mock.calls[0][0].initialContentByLanguage).toEqual({ de: '<p>agency wide</p>' });
        // No department chosen — the card must not claim a publication status of its own.
        expect(h.card.mock.calls[0][0].publicationStatus).toBeUndefined();
    });

    it('keeps the switcher available while the department text is still loading', async () => {
        // The editor must not open before the department's own text is known, but blanking the
        // whole card would strand the admin on a Fachbereich they cannot leave.
        h.useDepartmentDpp.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
            isSuccess: false,
        });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(screen.queryByTestId('legal-editor')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /agency.legal.department.choose/i })).toBeInTheDocument();
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
});
