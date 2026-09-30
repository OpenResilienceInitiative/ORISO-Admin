import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useUserTableColumns } from './useUserTableColumns';
import { getVisibleColumns } from './userTableConfigs';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { CounselorData } from '../../../types/counselor';

// The agency cell renders one unit per agency ("postcode city" above the name) inside a fixed-width column. Long agency
// names used to be sliced mid-word because `text-overflow: ellipsis` does not apply to the
// anonymous flex item of an `inline-flex` chip — each line needs its own truncating element
// and the unit needs an accessible full value (ORISO-Admin#99).
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const LONG_AGENCY = {
    id: 'a-1',
    name: 'Codex PreDev E2E 20260625222629 Beratungsstelle Nord',
    postcode: '10115',
    city: 'Berlin-Charlottenburg-Wilmersdorf',
};

const columnsProps = {
    sectionId: TypeOfUser.Consultants,
    showTenant: false,
    showSubdomain: false,
    openRows: [],
    onToggleRow: () => undefined,
    onEditUser: () => undefined,
    onDeleteUser: () => undefined,
    onEditTenant: () => undefined,
    onDeleteTenant: () => undefined,
    canEditOrDelete: () => true,
    mainTenantSubdomain: '',
    sortBy: undefined,
    order: undefined,
} as any;

const renderAgencyCell = (row: Partial<CounselorData>) => {
    const Probe = () => {
        const columns = useUserTableColumns(columnsProps);
        const column: any = columns.find((c: any) => c.key === 'agency');
        expect(column).toBeDefined();
        return <div data-testid="cell">{column.render(row.agencies, { id: 'u1', ...row } as CounselorData)}</div>;
    };
    render(<Probe />);
    return screen.getByTestId('cell');
};

describe('agency column', () => {
    it('truncates every line of the centre unit in its own element instead of clipping the text', () => {
        const cell = renderAgencyCell({ agencies: [LONG_AGENCY] as any });

        const lines = cell.querySelectorAll('.counselorList__agencyChipLine');
        expect(lines).toHaveLength(2);
        expect([...lines].map((line) => line.textContent)).toEqual([
            `${LONG_AGENCY.postcode} ${LONG_AGENCY.city}`,
            LONG_AGENCY.name,
        ]);
    });

    it('exposes the full postcode, city and name of the centre via title', () => {
        const cell = renderAgencyCell({ agencies: [LONG_AGENCY] as any });

        const unit = cell.querySelector('.counselorList__agencyChip');
        expect(unit?.getAttribute('title')).toBe(`${LONG_AGENCY.postcode} ${LONG_AGENCY.city}, ${LONG_AGENCY.name}`);
    });

    it('shows each centre as one unit: "postcode city" on the first line, the name below', () => {
        const cell = renderAgencyCell({
            agencies: [{ id: 'a-2', name: 'Beratungsstelle Sep21', postcode: '44444', city: 'Kassel' }] as any,
        });

        const units = cell.querySelectorAll('.counselorList__agencyChip');
        expect(units).toHaveLength(1);
        const lines = [...units[0].querySelectorAll('.counselorList__agencyChipLine')].map((line) => line.textContent);
        expect(lines).toEqual(['44444 Kassel', 'Beratungsstelle Sep21']);
    });

    const linesOf = (agency: Record<string, unknown>) =>
        [
            ...renderAgencyCell({ agencies: [{ id: 'a-3', ...agency }] as any }).querySelectorAll(
                '.counselorList__agencyChipLine',
            ),
        ].map((line) => line.textContent);

    it('shows only the city on the first line when the postcode is missing', () => {
        expect(linesOf({ name: 'Beratungsstelle Sep21', city: 'Kassel' })).toEqual(['Kassel', 'Beratungsstelle Sep21']);
    });

    it('shows only the postcode on the first line when the city is missing', () => {
        expect(linesOf({ name: 'Beratungsstelle Sep21', postcode: '44444' })).toEqual([
            '44444',
            'Beratungsstelle Sep21',
        ]);
    });

    it('shows only the name when both postcode and city are missing', () => {
        expect(linesOf({ name: 'Beratungsstelle Sep21', postcode: '', city: undefined })).toEqual([
            'Beratungsstelle Sep21',
        ]);
    });

    it('keeps the identity columns within a 1440px content width', () => {
        // Sidebar rail (128px, Figma 1285-80496) + table padding leave ~1278px; the sum
        // of the fixed column widths must fit so no column is pushed out of sight
        // without an affordance.
        const widths = getVisibleColumns(TypeOfUser.Consultants, { showTenant: true, showSubdomain: false }).map(
            (column) => column.width ?? 0,
        );
        const total = widths.reduce((sum, width) => sum + width, 0);

        expect(total).toBeLessThanOrEqual(1278);
    });
});
