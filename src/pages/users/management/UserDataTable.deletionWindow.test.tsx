import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import type { CounselorData } from '../../../types/counselor';
import { UserDataTable, type UserDataTableProps } from './UserDataTable';

const layout = vi.hoisted(() => ({ value: 'wide' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
vi.mock('./useUserTableLayout', () => ({ useUserTableLayout: () => layout.value }));

const person = (id: string, status: CounselorData['status']) =>
    ({
        id,
        status,
        firstname: `First${id}`,
        lastname: `Last${id}`,
        email: `${id}@example.test`,
        username: `user${id}`,
        agencies: [],
    } as unknown as CounselorData);

const renderTable = (props: Partial<UserDataTableProps> = {}) =>
    render(
        <MemoryRouter>
            <UserDataTable
                sectionId={TypeOfUser.Consultants}
                rows={[person('1', 'IN_DELETION'), person('2', 'CREATED')]}
                loading={false}
                showTenant={false}
                showSubdomain={false}
                canEditOrDelete
                sortBy="UPDATE_DATE"
                order="DESC"
                onSortChange={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
                page={1}
                pageSize={10}
                total={2}
                onPageChange={vi.fn()}
                onPageSizeChange={vi.fn()}
                {...props}
            />
        </MemoryRouter>,
    );

describe('UserDataTable deletion window actions', () => {
    it('offers cancel and pause only on a row whose deletion is running', () => {
        const onCancelDeletion = vi.fn();
        const onPauseDeletion = vi.fn();
        renderTable({ onCancelDeletion, onPauseDeletion });

        const cancel = screen.getAllByRole('button', { name: 'deletionWindow.cancel.action' });
        const pause = screen.getAllByRole('button', { name: 'deletionWindow.pause.action' });
        expect(cancel).toHaveLength(1);
        expect(pause).toHaveLength(1);

        fireEvent.click(cancel[0]);
        expect(onCancelDeletion).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
        fireEvent.click(pause[0]);
        expect(onPauseDeletion).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    });

    it('offers nothing when the section or the caller does not allow it', () => {
        renderTable();

        expect(screen.queryByRole('button', { name: 'deletionWindow.cancel.action' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'deletionWindow.pause.action' })).toBeNull();
    });

    it('can offer pause without cancel', () => {
        renderTable({ onPauseDeletion: vi.fn() });

        expect(screen.queryByRole('button', { name: 'deletionWindow.cancel.action' })).toBeNull();
        expect(screen.getByRole('button', { name: 'deletionWindow.pause.action' })).toBeInTheDocument();
    });

    it('keeps the actions reachable in the narrow row menu', () => {
        layout.value = 'tablet';
        const onCancelDeletion = vi.fn();
        renderTable({ onCancelDeletion, onPauseDeletion: vi.fn() });

        const menus = screen.getAllByRole('button', { name: 'userTable.rowMenu.label' });
        fireEvent.click(menus[0]);
        const menu = within(screen.getByRole('menu'));
        fireEvent.click(menu.getByRole('menuitem', { name: 'deletionWindow.cancel.action' }));
        expect(onCancelDeletion).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
        layout.value = 'wide';
    });
});
