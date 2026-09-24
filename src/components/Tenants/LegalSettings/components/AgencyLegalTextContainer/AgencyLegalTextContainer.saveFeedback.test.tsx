import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    useDepartmentDpp: vi.fn(),
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
    card: vi.fn(),
    publishDpp: vi.fn(),
    tenant: vi.fn(),
    saveAgencyDraft: vi.fn(),
    discardAgencyDraft: vi.fn(),
}));

vi.mock('../../hooks/useAgencyLegalDraft', () => ({
    useAgencyLegalDraft: () => ({
        draft: null,
        isLoading: false,
        isError: false,
        retry: vi.fn(),
        save: h.saveAgencyDraft,
        discard: h.discardAgencyDraft,
        hasConflict: false,
        conflict: undefined,
        conflictRefreshFailed: false,
        conflictRefreshing: false,
        retryConflict: vi.fn(),
        clearConflict: vi.fn(),
    }),
}));
vi.mock('antd', async () => {
    const antd = await vi.importActual<typeof import('antd')>('antd');

    return {
        ...antd,
        notification: { ...antd.notification, success: h.notifySuccess, error: h.notifyError },
    };
});
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));
vi.mock('../../../../../hooks/useDepartmentDpp.hook', () => ({ useDepartmentDpp: h.useDepartmentDpp }));
vi.mock('../../../../../hooks/useDepartmentImprint.hook', () => ({
    useDepartmentImprint: () => ({ data: undefined, isLoading: false, isError: false, isSuccess: true }),
}));
vi.mock('../../../../../hooks/usePublishDepartmentDpp.hook', () => ({
    usePublishDepartmentDpp: () => ({ mutate: h.publishDpp, isPending: false }),
}));
vi.mock('../../../../../hooks/usePublishDepartmentImprint.hook', () => ({
    usePublishDepartmentImprint: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../../../hooks/useSingleTenantData', () => ({ useSingleTenantData: () => h.tenant() }));
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
    useLegalTextVersions: () => ({ data: [], isError: false }),
}));
vi.mock('../DepartmentDataProtectionCard', () => ({
    DepartmentDataProtectionCard: (props: any) => {
        h.card(props);
        return <div data-testid="legal-editor">{props.departmentSlot}</div>;
    },
}));

import { AgencyLegalTextContainer } from '.';

const agencyData: any = {
    id: '55',
    tenantId: '1',
    topics: [{ id: 3, name: 'U25 Suizidprävention' }],
    content: { privacy: { de: '<p>agency wide</p>' } },
};

const renderContainer = () =>
    render(<AgencyLegalTextContainer agencyData={agencyData} field="privacy" onSaveAgencyWide={vi.fn()} />);

const selectDepartment = async (name: string) => {
    await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
    await userEvent.click(await screen.findByText(name));
};

const cardProps = () => h.card.mock.calls.at(-1)?.[0];

/** The mutation options the container handed to `mutate` on the last call. */
const mutationCallbacks = () => h.publishDpp.mock.calls.at(-1)?.[1];

/**
 * A Fachbereich save used to be fire-and-forget: no success and no failure
 * message, so a rejected save was indistinguishable from a stored one. That is
 * why a sentence which never reached the server was only noticed on the next
 * reload (#929). Asserting that a second argument merely EXISTS would not catch
 * a no-op or a wrong key, so these drive the callbacks the container passes.
 */
describe('AgencyLegalTextContainer — the Fachbereich save says what happened', () => {
    beforeEach(() => {
        h.useDepartmentDpp.mockReset().mockReturnValue({
            data: { content: '{"de":"<p>own</p>"}', publicationStatus: 'PUBLISHED' },
            isLoading: false,
            isError: false,
            isSuccess: true,
        });
        h.card.mockReset();
        h.publishDpp.mockReset();
        h.tenant.mockReset().mockReturnValue({ data: undefined });
        h.saveAgencyDraft.mockReset();
        h.discardAgencyDraft.mockReset().mockResolvedValue(undefined);
        h.notifySuccess.mockReset();
        h.notifyError.mockReset();
    });

    it('confirms a publish', async () => {
        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        cardProps().onSave({ de: '<p>neu</p>' }, true, { de: 'neu {{legal_links}}' });

        mutationCallbacks().onSuccess();

        expect(h.notifySuccess).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'legal.department.published' }),
        );
        expect(h.notifyError).not.toHaveBeenCalled();
    });

    it('confirms a draft save, and does not call it a publication', async () => {
        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        cardProps().onSave({ de: '<p>neu</p>' }, false, { de: 'neu {{legal_links}}' });

        mutationCallbacks().onSuccess();

        expect(h.notifySuccess).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'legal.department.draftSaved' }),
        );
    });

    it('says so when the save is rejected', async () => {
        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        cardProps().onSave({ de: '<p>neu</p>' }, true, { de: 'neu {{legal_links}}' });

        mutationCallbacks().onError();

        expect(h.notifyError).toHaveBeenCalledWith(expect.objectContaining({ message: 'legal.department.saveError' }));
        expect(h.notifySuccess).not.toHaveBeenCalled();
    });
});
