import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    card: vi.fn(),
    saveAgencyWide: vi.fn(),
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
    useSingleTenantData: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('../../../../../hooks/useTenantAdminData.hook', () => ({ useTenantAdminData: () => ({ data: undefined }) }));
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
    topics: [{ id: 3, name: 'U25 Suizidprävention' }],
    content: { privacy: { de: '<p>agency wide</p>' } },
};

const renderContainer = (props: Record<string, unknown> = {}) =>
    render(
        <AgencyLegalTextContainer
            agencyData={agencyData}
            field="privacy"
            onSaveAgencyWide={h.saveAgencyWide}
            {...(props as any)}
        />,
    );

const cardProps = () => h.card.mock.calls.at(-1)?.[0];

/*
 * jsdom's Storage does NOT enumerate through `Object.keys` — it returns [] even when
 * `length` is 1. Read it through the Storage API instead, or this helper silently
 * reports "nothing was saved" for a draft that was saved perfectly well.
 */
const draftKeys = () =>
    Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
        .filter((key): key is string => !!key)
        .filter((key) => key.startsWith('oriso-admin.legal.draft.'));

beforeEach(() => {
    window.localStorage.clear();
    h.card.mockClear();
    h.saveAgencyWide.mockClear();
});
afterEach(() => window.localStorage.clear());

/*
 * "Alle Fachbereiche" used to hand `onSave(content, publish=false)` — the editor's
 * "Save draft" action — straight to `onSaveAgencyWide`, which writes the agency
 * record. The `publish` argument was dropped on the floor, so the button published
 * the live legal text with no confirmation and a label promising the opposite.
 *
 * The fix follows the house answer to the identical problem one level up
 * (`LegalText` + `useLegalDraft`): the agency record has no draft state, so the
 * draft is device-local, and only Publish touches the record.
 */
describe('agency-wide draft — "Save draft" must not publish', () => {
    it('does not write the agency record when the editor saves a draft', async () => {
        renderContainer();
        await waitFor(() => expect(screen.getByTestId('legal-editor')).toBeInTheDocument());

        cardProps().onSave({ de: '<p>work in progress</p>' }, false);

        expect(h.saveAgencyWide).not.toHaveBeenCalled();
    });

    it('parks the draft on the device instead', async () => {
        renderContainer();
        await waitFor(() => expect(screen.getByTestId('legal-editor')).toBeInTheDocument());

        cardProps().onSave({ de: '<p>work in progress</p>' }, false, { de: 'consent {{legal_links}}' });

        await waitFor(() => expect(draftKeys()).toHaveLength(1));
        const stored = JSON.parse(window.localStorage.getItem(draftKeys()[0]) as string);
        expect(stored.content).toEqual({ de: '<p>work in progress</p>' });
        expect(stored.consent).toEqual({ de: 'consent {{legal_links}}' });
    });

    it('scopes the draft to the agency so it cannot collide with the tenant-level draft', async () => {
        // Both are `privacy` for the same user; only the agency id separates them.
        // Without it, editing a Beratungsstelle would silently overwrite the
        // Träger's parked wording, or vice versa.
        renderContainer();
        await waitFor(() => expect(screen.getByTestId('legal-editor')).toBeInTheDocument());

        cardProps().onSave({ de: '<p>x</p>' }, false);

        await waitFor(() => expect(draftKeys()).toHaveLength(1));
        expect(draftKeys()[0]).toContain('55');
        expect(draftKeys()[0]).not.toBe('oriso-admin.legal.draft.privacy.1:user-7');
    });

    it('still writes the agency record when the editor publishes', async () => {
        renderContainer();
        await waitFor(() => expect(screen.getByTestId('legal-editor')).toBeInTheDocument());

        cardProps().onSave({ de: '<p>final</p>' }, true);

        expect(h.saveAgencyWide).toHaveBeenCalledTimes(1);
        expect(h.saveAgencyWide.mock.calls[0][0]).toEqual({ content: { privacy: { de: '<p>final</p>' } } });
    });

    it('clears the parked draft once the text is published', async () => {
        renderContainer();
        await waitFor(() => expect(screen.getByTestId('legal-editor')).toBeInTheDocument());

        cardProps().onSave({ de: '<p>draft</p>' }, false);
        await waitFor(() => expect(draftKeys()).toHaveLength(1));

        cardProps().onSave({ de: '<p>final</p>' }, true);

        await waitFor(() => expect(draftKeys()).toHaveLength(0));
    });

    it('seeds the editor from a parked draft on the next mount', async () => {
        renderContainer();
        await waitFor(() => expect(screen.getByTestId('legal-editor')).toBeInTheDocument());
        cardProps().onSave({ de: '<p>parked wording</p>' }, false);
        await waitFor(() => expect(draftKeys()).toHaveLength(1));

        h.card.mockClear();
        renderContainer();
        await waitFor(() => expect(h.card).toHaveBeenCalled());

        expect(cardProps().initialContentByLanguage).toMatchObject({ de: '<p>parked wording</p>' });
    });
});
