import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LegalTextVersion } from '../../../../../types/legalVersion';

const h = vi.hoisted(() => ({
    useLegalTextVersions: vi.fn(),
    card: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));
vi.mock('../../../../../hooks/useDepartmentDpp.hook', () => ({
    useDepartmentDpp: () => ({ data: undefined, isLoading: false, isError: false, isSuccess: true }),
}));
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
    useUserPermissions: () => ({ can: () => true, permissions: {} }),
}));
vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({
    useLegalTextVersions: h.useLegalTextVersions,
}));
vi.mock('../DepartmentDataProtectionCard', () => ({
    DepartmentDataProtectionCard: (props: any) => {
        h.card(props);
        return <div data-testid="legal-editor">{props.departmentSlot}</div>;
    },
}));

import { AgencyLegalTextContainer } from '.';

const version = (id: number, ownerId: number, html: string): LegalTextVersion => ({
    id,
    kind: 'DPP',
    ownerLevel: 'DEPARTMENT',
    ownerId,
    publishedAt: '2026-07-13T10:22:00Z',
    content: JSON.stringify({ de: html }),
});

const agencyData: any = {
    id: '55',
    tenantId: '1',
    topics: [
        { id: 3, name: 'U25 Suizidprävention' },
        { id: 4, name: 'Schuldnerberatung' },
    ],
    content: { privacy: { de: '<p>agency wide</p>' } },
};

const renderContainer = (field: 'privacy' | 'imprint' = 'privacy') =>
    render(<AgencyLegalTextContainer agencyData={agencyData} field={field} onSaveAgencyWide={vi.fn()} />);

const selectDepartment = async (name: string) => {
    await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
    await userEvent.click(await screen.findByText(name));
};

/** The last scope the container asked the history hook for. */
const lastScope = () => h.useLegalTextVersions.mock.calls.at(-1)?.[0];

/**
 * #812: the Fachbereich switcher has to drive the privacy-policy and imprint
 * histories. Versions of two departments must never be shown for one another —
 * which means the request is scoped by the SELECTED department, not by the agency.
 */
describe('AgencyLegalTextContainer — department-scoped version history', () => {
    beforeEach(() => {
        h.card.mockReset();
        h.useLegalTextVersions.mockReset().mockReturnValue({ data: [], isError: false });
    });

    it('asks for the agency-wide history while "Alle Fachbereiche" is selected', () => {
        renderContainer();

        expect(lastScope()).toEqual({ level: 'agency', agencyId: 55, kind: 'DPP' });
    });

    it('asks for the imprint history on the imprint editor', () => {
        renderContainer('imprint');

        expect(lastScope()).toEqual({ level: 'agency', agencyId: 55, kind: 'IMPRINT' });
    });

    it('scopes the history to the selected Fachbereich', async () => {
        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(lastScope()).toEqual({ level: 'department', agencyId: 55, topicId: 3, kind: 'DPP' });
    });

    it('hands the card the versions of the selected department', async () => {
        h.useLegalTextVersions.mockReturnValue({ data: [version(42, 3, '<p>U25</p>')], isError: false });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(h.card.mock.calls.at(-1)?.[0].versions).toEqual([version(42, 3, '<p>U25</p>')]);
    });

    it('swaps the history when the admin switches departments — the two never mix', async () => {
        h.useLegalTextVersions.mockImplementation((scope: any) =>
            scope.level === 'department' && scope.topicId === 3
                ? { data: [version(42, 3, '<p>U25</p>')], isError: false }
                : { data: [version(77, 4, '<p>Schulden</p>')], isError: false },
        );

        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        expect(h.card.mock.calls.at(-1)?.[0].versions).toEqual([version(42, 3, '<p>U25</p>')]);

        await selectDepartment('Schuldnerberatung');

        expect(lastScope()).toEqual({ level: 'department', agencyId: 55, topicId: 4, kind: 'DPP' });
        expect(h.card.mock.calls.at(-1)?.[0].versions).toEqual([version(77, 4, '<p>Schulden</p>')]);
    });

    it('shows an empty history for a department that never published', async () => {
        h.useLegalTextVersions.mockReturnValue({ data: [], isError: false });

        renderContainer();
        await selectDepartment('Schuldnerberatung');

        expect(h.card.mock.calls.at(-1)?.[0].versions).toEqual([]);
        expect(h.card.mock.calls.at(-1)?.[0].versionsUnavailable).toBe(false);
    });

    it('reports a failed history as unavailable rather than as "never published"', async () => {
        h.useLegalTextVersions.mockReturnValue({ data: undefined, isError: true });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(h.card.mock.calls.at(-1)?.[0].versionsUnavailable).toBe(true);
    });
});
