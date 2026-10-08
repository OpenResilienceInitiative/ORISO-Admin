import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ card: vi.fn(), saveAgencyWide: vi.fn(), serverSave: vi.fn() }));

vi.mock('../../hooks/useAgencyLegalDraft', () => ({
    useAgencyLegalDraft: () => ({
        draft: null,
        isLoading: false,
        isError: false,
        retry: vi.fn(),
        save: h.serverSave,
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
vi.mock('../../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({
        data: { content: { privacyConsent: { de: 'published consent' } } },
        isLoading: false,
    }),
}));
vi.mock('../../../../../hooks/useTenantAdminData.hook', () => ({
    useTenantAdminData: () => ({ data: { settings: { activeLanguages: ['de'] } } }),
}));
vi.mock('../../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate: vi.fn() }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: () => true, permissions: {} }),
}));
vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({
    useLegalTextVersions: () => ({ data: [], isError: false }),
}));
vi.mock('../../../../../hooks/useUserData.hook', () => ({
    useUserData: () => ({ data: { id: 'user-7' }, isLoading: false }),
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
    topics: [],
    content: { privacy: { de: '<p>published</p>' } },
};
const localKey = 'oriso-admin.legal.draft.privacy.1:user-7:agency:55';
const renderContainer = () =>
    render(<AgencyLegalTextContainer agencyData={agencyData} field="privacy" onSaveAgencyWide={h.saveAgencyWide} />);
const cardProps = () => h.card.mock.calls.at(-1)?.[0];
const storeLocalDraft = () =>
    window.localStorage.setItem(
        localKey,
        JSON.stringify({
            content: { de: '<p>local work</p>' },
            consent: { de: 'local consent' },
            savedAt: '2026-09-17T13:00:00.000Z',
        }),
    );

describe('agency-wide local draft migration', () => {
    beforeEach(() => {
        window.localStorage.clear();
        h.card.mockReset();
        h.saveAgencyWide.mockReset().mockResolvedValue(undefined);
        h.serverSave.mockReset();
    });
    afterEach(() => window.localStorage.clear());

    it('loads existing device-local work as the editable source', async () => {
        storeLocalDraft();
        renderContainer();
        await waitFor(() => expect(screen.getByTestId('legal-editor')).toBeInTheDocument());
        expect(cardProps().initialContentByLanguage).toEqual({ de: '<p>local work</p>' });
        expect(window.localStorage.getItem(localKey)).not.toBeNull();
    });

    it('clears local work only after the server save succeeds', async () => {
        storeLocalDraft();
        h.serverSave.mockResolvedValue({
            kind: 'DPP',
            content: { de: '<p>normalized</p>' },
            consentText: { de: 'local consent' },
            revision: 'draft-id:0',
            savedAt: '2026-09-17T14:00:00',
        });
        renderContainer();
        await act(async () => cardProps().onSave({ de: '<p>local work</p>' }, false));
        expect(h.serverSave).toHaveBeenCalledWith({
            content: { de: '<p>local work</p>' },
            consentText: { de: 'local consent' },
        });
        expect(window.localStorage.getItem(localKey)).toBeNull();
    });

    it('preserves local work when the server save fails', async () => {
        storeLocalDraft();
        h.serverSave.mockRejectedValue(new Error('offline'));
        renderContainer();
        await act(async () => cardProps().onSave({ de: '<p>local work</p>' }, false));
        expect(window.localStorage.getItem(localKey)).not.toBeNull();
        expect(h.saveAgencyWide).not.toHaveBeenCalled();
    });
});
