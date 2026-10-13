import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    useLegalTextVersions: vi.fn(),
    card: vi.fn(),
    revert: vi.fn(),
    notify: vi.fn(),
}));

vi.mock('../../hooks/useAgencyLegalDraft', () => ({
    useAgencyLegalDraft: () => ({
        draft: null,
        isLoading: false,
        isError: false,
        retry: vi.fn(),
        save: vi.fn(),
        discard: vi.fn(),
        hasConflict: false,
        conflict: undefined,
        conflictRefreshFailed: false,
        conflictRefreshing: false,
        retryConflict: vi.fn(),
        clearConflict: vi.fn(),
    }),
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));
vi.mock('../../../../../hooks/useDepartmentDpp.hook', () => ({
    // The payload a never-authored Fachbereich really returns. `undefined` alongside `isSuccess`
    // is not a shape react-query can produce, and the container now refuses to read a department
    // out of a success that carried no document at all.
    useDepartmentDpp: () => ({
        data: { content: JSON.stringify({ de: '<p>eigener Text</p>' }), publicationStatus: 'PUBLISHED' },
        isLoading: false,
        isError: false,
        isSuccess: true,
    }),
}));
vi.mock('../../../../../hooks/useDepartmentImprint.hook', () => ({
    useDepartmentImprint: () => ({
        data: { content: null, publicationStatus: 'DRAFT' },
        isLoading: false,
        isError: false,
        isSuccess: true,
    }),
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
vi.mock('../../../../../hooks/useUserData.hook', () => ({
    // The container reads the opaque user id to scope its device-local draft; without
    // this mock the real react-query hook runs and the render dies on "No QueryClient".
    useUserData: () => ({ data: { id: 'user-7' }, isLoading: false }),
    USER_DATA_KEY: 'user-data',
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

vi.mock('../../../../../hooks/useRevertDepartmentLegalText.hook', () => ({
    useRevertDepartmentLegalText: (...args: unknown[]) => ({
        mutateAsync: () => h.revert(...args),
        isPending: false,
    }),
}));
vi.mock('antd', async (importOriginal) => ({
    ...(await importOriginal<typeof import('antd')>()),
    notification: { success: h.notify, error: h.notify, info: h.notify },
}));

import { AgencyLegalTextContainer } from '.';

const agencyData: any = {
    id: '55',
    tenantId: '1',
    topics: [
        { id: 3, name: 'U25 Suizidprävention' },
        { id: 4, name: 'Schuldnerberatung' },
    ],
    content: { privacy: { de: '<p>agency wide</p>' } },
};

const open = async () => {
    render(<AgencyLegalTextContainer agencyData={agencyData} field="privacy" onSaveAgencyWide={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
    await userEvent.click(await screen.findByText('U25 Suizidprävention'));
};

/** ORISO-Admin#916: a Fachbereich with a published text of its own can return to the inherited one. */
describe('AgencyLegalTextContainer — revert to inherited text', () => {
    beforeEach(() => {
        h.card.mockReset();
        h.notify.mockReset();
        h.revert.mockReset().mockResolvedValue({ reverted: true });
        h.useLegalTextVersions.mockReset().mockReturnValue({ data: [], isError: false });
    });

    it('offers no revert on "Alle Fachbereiche"', () => {
        render(<AgencyLegalTextContainer agencyData={agencyData} field="privacy" onSaveAgencyWide={vi.fn()} />);
        expect(h.card.mock.calls.at(-1)?.[0].onRevertToInherited).toBeUndefined();
    });

    it('offers a revert for a Fachbereich that has its own published text', async () => {
        await open();
        expect(h.card.mock.calls.at(-1)?.[0].onRevertToInherited).toBeInstanceOf(Function);
    });

    it('reverts exactly this Fachbereich and says so', async () => {
        await open();

        await h.card.mock.calls.at(-1)?.[0].onRevertToInherited();

        expect(h.revert).toHaveBeenCalledWith('privacy', 55, 3);
        expect(h.notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'legal.revert.success' }));
    });

    it('tells the admin when nothing changed', async () => {
        h.revert.mockResolvedValue({ reverted: false });
        await open();

        await h.card.mock.calls.at(-1)?.[0].onRevertToInherited();

        expect(h.notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'legal.revert.unchanged' }));
    });

    it('reports a failed revert instead of staying silent', async () => {
        h.revert.mockRejectedValue(new Error('boom'));
        await open();

        await h.card.mock.calls.at(-1)?.[0].onRevertToInherited();

        expect(h.notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'legal.revert.error' }));
    });
});
