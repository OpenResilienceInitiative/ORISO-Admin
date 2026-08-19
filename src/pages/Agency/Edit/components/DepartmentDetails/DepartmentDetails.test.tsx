import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    useDepartmentDetails: vi.fn(),
    mutate: vi.fn(),
    refetch: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, arg?: any) => (arg?.value ? `${key}:${arg.value}` : key) }),
}));
vi.mock('../../../../../hooks/useDepartmentDetails.hook', () => ({
    useDepartmentDetails: h.useDepartmentDetails,
    DEPARTMENT_DETAILS_KEY: 'department-details',
}));
vi.mock('../../../../../hooks/useUpdateDepartmentDetails.hook', () => ({
    useUpdateDepartmentDetails: () => ({ mutate: h.mutate, isPending: false }),
}));

// eslint-disable-next-line import/first
import { AgencyDepartmentDetails, DepartmentDetailsCard } from '.';

const agencyData: any = {
    id: '55',
    topics: [
        { id: 3, name: 'U25 Suizidprävention' },
        { id: 4, name: 'Schuldnerberatung' },
    ],
    openingHours: 'Mo-Fr 9-17 Uhr',
    floorBuilding: 'Haus B',
};

describe('AgencyDepartmentDetails (container)', () => {
    beforeEach(() => {
        h.useDepartmentDetails.mockReset();
        h.mutate.mockReset();
    });

    it('loads the first department and prefills its stored overrides', () => {
        h.useDepartmentDetails.mockReturnValue({
            data: { openingHours: 'Di+Do 14-18 Uhr', phoneExtension: '-23', floorLocation: null },
            isLoading: false,
            isError: false,
            dataUpdatedAt: 1,
            refetch: h.refetch,
        });

        render(<AgencyDepartmentDetails agencyData={agencyData} />);

        expect(h.useDepartmentDetails).toHaveBeenCalledWith(55, 3);
        expect(screen.getByDisplayValue('Di+Do 14-18 Uhr')).toBeInTheDocument();
        expect(screen.getByDisplayValue('-23')).toBeInTheDocument();
    });

    it('shows the inherited Beratungsstelle value as the affordance for untouched fields', () => {
        h.useDepartmentDetails.mockReturnValue({
            data: { openingHours: null, phoneExtension: null, floorLocation: null },
            isLoading: false,
            isError: false,
            dataUpdatedAt: 1,
            refetch: h.refetch,
        });

        render(<AgencyDepartmentDetails agencyData={agencyData} />);

        // helper text carries the inherited value (inherit affordance, not a copied value)
        expect(
            screen.getByText('agency.edit.general.department_details.inherits_value:Mo-Fr 9-17 Uhr'),
        ).toBeInTheDocument();
        expect(screen.getByText('agency.edit.general.department_details.inherits_value:Haus B')).toBeInTheDocument();
        // inherited values are placeholders, never form values
        expect(screen.queryByDisplayValue('Mo-Fr 9-17 Uhr')).not.toBeInTheDocument();
    });

    it('saves only the department overrides through the mutation', async () => {
        h.useDepartmentDetails.mockReturnValue({
            data: { openingHours: null, phoneExtension: null, floorLocation: null },
            isLoading: false,
            isError: false,
            dataUpdatedAt: 1,
            refetch: h.refetch,
        });

        render(<AgencyDepartmentDetails agencyData={agencyData} />);

        await userEvent.click(screen.getByText('edit'));
        const openingHours = screen.getByLabelText('agency.edit.general.address.opening_hours');
        await userEvent.type(openingHours, 'Nur Di 10-12');
        await userEvent.click(screen.getByText('card.edit.save'));

        expect(h.mutate).toHaveBeenCalledWith(
            expect.objectContaining({ openingHours: 'Nur Di 10-12' }),
            expect.anything(),
        );
    });

    it('blocks editing (does not hide the card) when the stored overrides could not be read', () => {
        h.useDepartmentDetails.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            dataUpdatedAt: 0,
            refetch: h.refetch,
        });

        render(<AgencyDepartmentDetails agencyData={agencyData} />);

        expect(screen.getByText('agency.edit.general.department_details.loadError.title')).toBeInTheDocument();
        expect(screen.queryByText('edit')).not.toBeInTheDocument();
        // retry stays available
        screen.getByText('agency.legal.department.loadError.retry').click();
        expect(h.refetch).toHaveBeenCalled();
    });
});

describe('DepartmentDetailsCard (presentational)', () => {
    it('keeps the card visible with a hint when no departments are assigned (disable, not hide)', () => {
        render(<DepartmentDetailsCard departments={[]} onSelect={vi.fn()} inherited={{}} onSave={vi.fn()} />);

        expect(screen.getByText('agency.edit.general.department_details.no_departments')).toBeInTheDocument();
    });
});
