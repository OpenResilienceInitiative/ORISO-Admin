import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserDataTable } from './UserDataTable';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import type { CounselorData } from '../../../types/counselor';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
const person = (active: boolean | null): CounselorData => ({
    id: 'selected-account',
    key: 'selected-account',
    firstname: 'Selected',
    lastname: 'Person',
    username: 'selected',
    email: 'selected@example.invalid',
    active,
    gender: '',
    phone: '',
    agencies: [],
    agencyIds: [],
    formalLanguage: true,
    absent: false,
    status: 'ACTIVE',
    tenantId: '1',
    tenantName: 'Träger',
});
describe('actual shared person-list status cells', () => {
    it.each([TypeOfUser.Consultants, TypeOfUser.AgencyAdmins, TypeOfUser.TenantAdmins, TypeOfUser.PlatformAdmins])(
        'exposes authoritative status for %s without changing its display',
        (sectionId) => {
            render(
                <MemoryRouter>
                    <UserDataTable
                        sectionId={sectionId}
                        rows={[person(false), { ...person(null), id: 'unknown-account', key: 'unknown-account' }]}
                        loading={false}
                        showTenant={false}
                        showSubdomain={false}
                        canEditOrDelete={false}
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
                    />
                </MemoryRouter>,
            );
            const states = screen.getAllByTestId('entity-status-list');
            expect(states).toHaveLength(2);
            expect(states[0]).toHaveAttribute('data-entity-kind', 'account');
            expect(states[0]).toHaveAttribute('data-entity-id', 'selected-account');
            expect(states[0]).toHaveAttribute('data-active', 'false');
            expect(states[1]).toHaveAttribute('data-active', 'unknown');
        },
    );
});
