import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    useDepartmentDpp: vi.fn(),
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

const renderContainer = (props: Record<string, unknown> = {}) =>
    render(
        <AgencyLegalTextContainer
            agencyData={agencyData}
            field="privacy"
            onSaveAgencyWide={vi.fn()}
            {...(props as any)}
        />,
    );

const selectDepartment = async (name: string) => {
    await userEvent.click(screen.getByRole('button', { name: /agency.legal.department.choose/i }));
    await userEvent.click(await screen.findByText(name));
};

/** The last props the card was rendered with. */
const cardProps = () => h.card.mock.calls.at(-1)?.[0];

const storedDepartment = (extra: Record<string, unknown> = {}) =>
    h.useDepartmentDpp.mockReturnValue({
        data: { content: '{"de":"<p>own</p>"}', publicationStatus: 'PUBLISHED', ...extra },
        isLoading: false,
        isError: false,
        isSuccess: true,
    });

/**
 * ADR-021 decision 4 — the consent sentence is a field of the data-protection policy.
 * #862 — on the agency editor it is offered only for a concrete Fachbereich, not for
 * "Alle Fachbereiche".
 */
describe('AgencyLegalTextContainer — consent sentence', () => {
    beforeEach(() => {
        h.useDepartmentDpp.mockReset();
        h.card.mockReset();
        h.publishDpp.mockReset();
        h.tenant.mockReset().mockReturnValue({ data: undefined });
        h.saveAgencyDraft.mockReset();
        h.discardAgencyDraft.mockReset().mockResolvedValue(undefined);
    });

    it('is offered empty to a Fachbereich whose read carried no sentence (#929)', async () => {
        storedDepartment();

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        // `{}`, not `undefined` — a successful read that omits the field is the empty
        // first-authoring state, and that is precisely where the template chooser has to be
        // reachable. `undefined` would hide the editor and strand the department there.
        expect(cardProps().consentByLanguage).toEqual({});
    });

    it('is not offered while the department policy has not been read successfully', async () => {
        h.useDepartmentDpp.mockReturnValue({ data: undefined, isLoading: false, isError: false, isSuccess: false });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(cardProps().consentByLanguage).toBeUndefined();
    });

    /**
     * `fetchData` resolves a 204 with the raw `Response` and a JSON `null` body with `null`, and
     * neither marks the query as failed. Believing `isSuccess` alone there would open the editor
     * on the INHERITED agency text and let a publish store it as the department's own — the same
     * silent overwrite a failed read is already blocked for.
     */
    it.each([
        ['a JSON null body', null],
        ['a 204 with the raw Response', new Response(null, { status: 204 })],
        ['an array', []],
        ['an object that is not a policy document', { foo: 'bar' }],
        ['a publicationStatus the contract does not define', { content: null, publicationStatus: 'WAT' }],
        ['content that is not the stored JSON string', { content: {}, publicationStatus: 'DRAFT' }],
        [
            'consentText that is not the stored JSON string',
            { content: null, consentText: {}, publicationStatus: 'DRAFT' },
        ],
    ])('blocks the editor when a successful read returns %s', async (_label, data) => {
        h.useDepartmentDpp.mockReturnValue({
            data,
            isLoading: false,
            isError: false,
            isSuccess: true,
            refetch: vi.fn(),
        });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(screen.queryByTestId('legal-editor')).not.toBeInTheDocument();
        expect(screen.getByText('agency.legal.department.loadError.title')).toBeInTheDocument();
    });

    it('is never offered on the imprint', async () => {
        storedDepartment({ consentText: '{"de":"Ich willige ein {{legal_links}}"}' });
        h.tenant.mockReturnValue({ data: { content: { privacyConsent: { de: 'Träger-Satz' } } } });

        renderContainer({ field: 'imprint' });
        await selectDepartment('U25 Suizidprävention');

        expect(cardProps().consentByLanguage).toBeUndefined();
    });

    it('is not offered on Alle Fachbereiche even when a Träger sentence exists (#862)', () => {
        storedDepartment();
        h.tenant.mockReturnValue({ data: { content: { privacyConsent: { de: 'Träger-Satz' } } } });

        renderContainer();

        expect(cardProps().consentByLanguage).toBeUndefined();
    });

    it('hands a Fachbereich the sentence stored with its own policy', async () => {
        storedDepartment({ consentText: '{"de":"Fachbereich-Satz"}' });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(cardProps().consentByLanguage).toEqual({ de: 'Fachbereich-Satz' });
        expect(cardProps().consentInheritedFrom).toBeUndefined();
    });

    it('never stamps privacyConsent when publishing Alle Fachbereiche (#862)', async () => {
        storedDepartment();
        h.tenant.mockReturnValue({ data: { content: { privacyConsent: { de: 'Träger-Satz' } } } });
        h.saveAgencyDraft.mockResolvedValue({
            kind: 'DPP',
            content: { de: '<p>normalisiert</p>' },
            consentText: { de: 'Gespeicherter Satz' },
            revision: '41:0',
            savedAt: '2026-09-17T12:00:00Z',
        });
        const onSaveAgencyWide = vi.fn().mockResolvedValue(undefined);

        renderContainer({ onSaveAgencyWide });
        await act(async () => {
            await cardProps().onSave({ de: '<p>neu</p>' }, true, { de: 'Nicht editierbar {{legal_links}}' });
        });

        expect(h.saveAgencyDraft).toHaveBeenCalledWith({
            content: { de: '<p>neu</p>' },
            consentText: { de: 'Träger-Satz' },
        });
        expect(onSaveAgencyWide).toHaveBeenCalledWith({ content: { privacy: { de: '<p>normalisiert</p>' } } });
    });

    it('publishes a Fachbereich sentence as consentText', async () => {
        storedDepartment({ consentText: '{"de":"alt"}' });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        cardProps().onSave({ de: '<p>neu</p>' }, true, { de: 'neu {{legal_links}}' });

        expect(h.publishDpp).toHaveBeenCalledWith({
            content: { de: '<p>neu</p>' },
            publish: true,
            consentText: { de: 'neu {{legal_links}}' },
        });
    });

    /**
     * A department whose read carried no sentence now owns the consent field, so the card hands
     * back an empty map when the admin publishes without touching it. That map IS sent, and it is
     * not a clear: `ConsentTextService#resolveForUpdate` treats "no entries at all" exactly like an
     * omitted property and keeps whatever is stored. A clear is `{"de": ""}` — a language key with
     * empty content — which is why the two must stay distinguishable on the wire.
     */
    it('sends an untouched empty consent map, which the backend reads as "keep what is stored"', async () => {
        storedDepartment();

        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        cardProps().onSave({ de: '<p>neu</p>' }, true, {});

        expect(h.publishDpp).toHaveBeenCalledWith({
            content: { de: '<p>neu</p>' },
            publish: true,
            consentText: {},
        });
    });

    it('keeps a cleared sentence distinguishable from an untouched empty one', async () => {
        storedDepartment({ consentText: '{"de":"alt {{legal_links}}"}' });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        cardProps().onSave({ de: '<p>neu</p>' }, true, { de: '' });

        // A language key with empty content is the ONLY way a client can delete the sentence.
        expect(h.publishDpp).toHaveBeenCalledWith({
            content: { de: '<p>neu</p>' },
            publish: true,
            consentText: { de: '' },
        });
    });

    it('omits consentText entirely when the card hands none over', async () => {
        storedDepartment();

        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        cardProps().onSave({ de: '<p>neu</p>' }, false);

        // The card passes the third argument only while it owns the consent field. Without it the
        // property is left off the request rather than sent empty, so nothing is claimed about a
        // sentence this surface never edited.
        expect(h.publishDpp).toHaveBeenCalledWith({ content: { de: '<p>neu</p>' }, publish: false });
    });
});

/**
 * ADR-014 amendment: publishing under a Fachbereich forks it away from the inherited
 * text for good. The body is already seeded from what the Fachbereich currently shows;
 * the consent sentence has to come from the same place, or the fork ships a policy whose
 * sentence was left behind on the level above (ADR-021 decision 4 — one document).
 */
describe('AgencyLegalTextContainer — the fork copies policy AND sentence', () => {
    beforeEach(() => {
        h.useDepartmentDpp.mockReset();
        h.card.mockReset();
        h.publishDpp.mockReset();
        h.tenant.mockReset().mockReturnValue({ data: undefined });
    });

    const notYetForked = (extra: Record<string, unknown> = {}) =>
        h.useDepartmentDpp.mockReturnValue({
            data: { content: '', publicationStatus: 'DRAFT', consentText: '{}', ...extra },
            isLoading: false,
            isError: false,
            isSuccess: true,
        });

    it('seeds a not-yet-forked Fachbereich with the sentence it currently shows', async () => {
        notYetForked();
        h.tenant.mockReturnValue({ data: { content: { privacyConsent: { de: 'Traeger-Satz {{legal_links}}' } } } });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(cardProps().initialContentByLanguage).toEqual({ de: '<p>agency wide</p>' });
        expect(cardProps().consentByLanguage).toEqual({ de: 'Traeger-Satz {{legal_links}}' });
        expect(cardProps().consentInheritedFrom).toBe('legal.consent.level.agency');
        // Nothing authored at this level yet, so every language carries the notice.
        expect(cardProps().ownConsentByLanguage).toEqual({});
    });

    it('publishes that seeded sentence with the forked policy', async () => {
        notYetForked();
        h.tenant.mockReturnValue({ data: { content: { privacyConsent: { de: 'Traeger-Satz {{legal_links}}' } } } });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        cardProps().onSave({ de: '<p>agency wide</p>' }, true, cardProps().consentByLanguage);

        expect(h.publishDpp).toHaveBeenCalledWith({
            content: { de: '<p>agency wide</p>' },
            publish: true,
            consentText: { de: 'Traeger-Satz {{legal_links}}' },
        });
    });

    it('leaves a Fachbereich that has already forked with its own sentence, blank included', async () => {
        storedDepartment({ consentText: '{}' });
        h.tenant.mockReturnValue({ data: { content: { privacyConsent: { de: 'Traeger-Satz' } } } });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        // Blank at a forked level is a valid state: the level above still governs at
        // runtime. Re-seeding it here would silently re-author a legal sentence.
        expect(cardProps().consentByLanguage).toEqual({});
        expect(cardProps().consentInheritedFrom).toBeUndefined();
    });

    it('seeds from the agency sentence when the read omits consentText altogether (#929)', async () => {
        notYetForked({ consentText: undefined });
        h.tenant.mockReturnValue({ data: { content: { privacyConsent: { de: 'Traeger-Satz' } } } });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        // Same fork rule as above: an omitted field is "nothing authored here yet", which is
        // exactly the state the fork copies the level above into.
        expect(cardProps().consentByLanguage).toEqual({ de: 'Traeger-Satz' });
        expect(cardProps().consentInheritedFrom).toBe('legal.consent.level.agency');
    });
});
