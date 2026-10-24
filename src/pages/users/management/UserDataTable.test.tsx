import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const phoneCases: Array<[number, TypeOfUser]> = [320, 412].flatMap((width) =>
    [TypeOfUser.Consultants, TypeOfUser.AgencyAdmins, TypeOfUser.TenantAdmins, TypeOfUser.PlatformAdmins].map(
        (sectionId): [number, TypeOfUser] => [width, sectionId],
    ),
);
describe('actual phone account cards', () => {
    afterEach(() => vi.restoreAllMocks());
    it.each(phoneCases)('%ipx exposes all authoritative states in %s cards', (width, sectionId) => {
        vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
            matches: width <= Number(/max-width: (\d+)px/.exec(query)?.[1] ?? Infinity),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(() => true),
        }));
        render(
            <MemoryRouter>
                <UserDataTable
                    sectionId={sectionId}
                    rows={[
                        person(false),
                        { ...person(true), id: 'active-account', key: 'active-account' },
                        { ...person(null), id: 'unknown-account', key: 'unknown-account' },
                    ]}
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
                    total={3}
                    onPageChange={vi.fn()}
                    onPageSizeChange={vi.fn()}
                />
            </MemoryRouter>,
        );
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        const cards = screen.getAllByRole('article');
        expect(cards).toHaveLength(3);
        const states: Array<[number, string, string]> = [
            [0, 'selected-account', 'false'],
            [1, 'active-account', 'true'],
            [2, 'unknown-account', 'unknown'],
        ];
        states.forEach(([index, id, active]) => {
            const marker = within(cards[index]).getByTestId('entity-status-list');
            expect(marker).toHaveAttribute('data-entity-kind', 'account');
            expect(marker).toHaveAttribute('data-entity-id', id);
            expect(marker).toHaveAttribute('data-active', active);
        });
    });
});
