import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useUserTableColumns } from './useUserTableColumns';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { CounselorData } from '../../../types/counselor';

// Exercise the REAL column render produced by useUserTableColumns (not an inline
// copy): each table shows a read-only, identity-specific checkmark column for
// the *other* identity a row may hold (no generic "other rights" badge).
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const buildColumnsProps = (sectionId: TypeOfUser) =>
    ({
        sectionId,
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
    } as any);

const renderRealCell = (sectionId: TypeOfUser, row: Partial<CounselorData>) => {
    let title: unknown;
    const Probe = () => {
        const columns = useUserTableColumns(buildColumnsProps(sectionId));
        const column: any = columns.find((c: any) => c.key === 'hasOtherIdentity');
        expect(column).toBeDefined();
        title = column.title;
        const cell = column.render(undefined, { id: 'u1', ...row } as CounselorData);
        return <div data-testid="cell">{cell}</div>;
    };
    render(<Probe />);
    return { title };
};

describe('identity-specific other-identity checkmark column', () => {
    it('titles the consultants column "also Träger-Admin"', () => {
        const { title } = renderRealCell(TypeOfUser.Consultants, {});
        expect(title).toBe('users.table.alsoTenantAdmin');
    });

    it('titles the tenant-admins column "also Berater*in"', () => {
        const { title } = renderRealCell(TypeOfUser.TenantAdmins, {});
        expect(title).toBe('users.table.alsoConsultant');
    });

    it('titles the agency-admins column "also Berater*in"', () => {
        const { title } = renderRealCell(TypeOfUser.AgencyAdmins, {});
        expect(title).toBe('users.table.alsoConsultant');
    });

    it('shows a checkmark for a consultant who is also a Träger-Admin', () => {
        renderRealCell(TypeOfUser.Consultants, {
            hasOtherIdentity: true,
            otherIdentityTypes: ['TENANT_ADMIN'],
        });
        expect(screen.getByTestId('other-identity-checkmark')).toBeInTheDocument();
    });

    it('shows no checkmark in the consultants table when the other identity is only agency admin', () => {
        renderRealCell(TypeOfUser.Consultants, {
            hasOtherIdentity: true,
            otherIdentityTypes: ['AGENCY_ADMIN'],
        });
        expect(screen.queryByTestId('other-identity-checkmark')).toBeNull();
    });

    it('shows a checkmark for a tenant admin who is also a consultant', () => {
        renderRealCell(TypeOfUser.TenantAdmins, { hasOtherIdentity: true });
        expect(screen.getByTestId('other-identity-checkmark')).toBeInTheDocument();
    });

    it('shows no checkmark for a tenant admin without a consultant identity', () => {
        renderRealCell(TypeOfUser.TenantAdmins, { hasOtherIdentity: false });
        expect(screen.queryByTestId('other-identity-checkmark')).toBeNull();
    });
});
