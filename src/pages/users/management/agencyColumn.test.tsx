import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useUserTableColumns } from './useUserTableColumns';
import { getVisibleColumns } from './userTableConfigs';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { CounselorData } from '../../../types/counselor';

// The agency cell renders three chips per agency inside a fixed-width column. Long agency
// names used to be sliced mid-word because `text-overflow: ellipsis` does not apply to the
// anonymous flex item of an `inline-flex` chip — the label needs its own truncating element
// and every chip needs an accessible full value (ORISO-Admin#99).
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
    it('truncates every chip label in its own element instead of clipping the text', () => {
        const cell = renderAgencyCell({ agencies: [LONG_AGENCY] as any });

        const labels = cell.querySelectorAll('.counselorList__agencyChipLabel');
        expect(labels).toHaveLength(3);
        expect([...labels].map((label) => label.textContent)).toEqual([
            LONG_AGENCY.postcode,
            LONG_AGENCY.name,
            LONG_AGENCY.city,
        ]);
    });

    it('exposes the full value of every chip via title, not only the agency name', () => {
        const cell = renderAgencyCell({ agencies: [LONG_AGENCY] as any });

        const titles = [...cell.querySelectorAll('.counselorList__agencyChip')].map((chip) =>
            chip.getAttribute('title'),
        );
        expect(titles).toEqual([LONG_AGENCY.postcode, LONG_AGENCY.name, LONG_AGENCY.city]);
    });

    it('keeps the identity columns within a 1440px content width', () => {
        // Sidebar rail (96px) + table padding leave ~1310px; the sum of the fixed column
        // widths must fit so no column is pushed out of sight without an affordance.
        const widths = getVisibleColumns(TypeOfUser.Consultants, { showTenant: true, showSubdomain: false }).map(
            (column) => column.width ?? 0,
        );
        const total = widths.reduce((sum, width) => sum + width, 0);

        expect(total).toBeLessThanOrEqual(1310);
    });
});
