import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useUserTableColumns } from './useUserTableColumns';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { CounselorData } from '../../../types/counselor';

// Exercise the REAL column render produced by useUserTableColumns (not an inline
// copy): the "has other rights" column must render an antd <Tag> with the badge
// label when the row has hasOtherIdentity === true, and nothing otherwise.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const renderRealCell = (hasOtherIdentity?: boolean) => {
    const Probe = () => {
        const columns = useUserTableColumns({
            sectionId: TypeOfUser.AgencyAdmins,
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
        const column: any = columns.find((c: any) => c.key === 'hasOtherIdentity');
        expect(column).toBeDefined();
        const cell = column.render(undefined, { id: 'u1', hasOtherIdentity } as CounselorData);
        return <div data-testid="cell">{cell}</div>;
    };
    render(<Probe />);
};

describe('hasOtherIdentity column (real useUserTableColumns render)', () => {
    it('renders the badge tag when the row has another identity', () => {
        renderRealCell(true);
        expect(screen.getByText('users.table.hasOtherIdentity.badge')).toBeInTheDocument();
    });

    it('renders nothing when the row has no other identity', () => {
        renderRealCell(false);
        expect(screen.queryByText('users.table.hasOtherIdentity.badge')).toBeNull();
    });
});
