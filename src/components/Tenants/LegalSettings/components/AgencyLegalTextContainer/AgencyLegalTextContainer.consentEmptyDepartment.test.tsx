import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    useDepartmentDpp: vi.fn(),
    publishDpp: vi.fn(),
    tenant: vi.fn(),
}));

/**
 * The two sentences this test actually reads: the template's wording has to carry
 * `{{legal_links}}`, because publishing a sentence without it is refused (ADR-021
 * decision 2) — and "can be published" is half of what #929 asks for.
 */
const STRINGS: Record<string, string> = {
    'legal.consent.template.platform.name': 'Plattform-Vorlage',
    'legal.consent.template.platform.text': 'Ich habe die {{legal_links}} zur Kenntnis genommen.',
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'de' },
        t: (key: string, options?: unknown) => STRINGS[key] ?? (typeof options === 'string' ? options : key),
    }),
}));
vi.mock('../../../../../hooks/useDepartmentDpp.hook', () => ({ useDepartmentDpp: h.useDepartmentDpp }));
vi.mock('../../../../../hooks/useDepartmentImprint.hook', () => ({
    useDepartmentImprint: () => ({
        data: { content: '{"de":"<p>Impressum</p>"}', publicationStatus: 'PUBLISHED' },
        isLoading: false,
        isError: false,
        isSuccess: true,
    }),
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
    useUserData: () => ({ data: { id: 'user-7' }, isLoading: false }),
    USER_DATA_KEY: 'user-data',
}));
vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({
    useLegalTextVersions: () => ({ data: [], isError: false }),
}));

/**
 * The ONLY stub between the container and the real card: TipTap is far too heavy for
 * a wiring test. Its slots are rendered as they are handed over, so everything this
 * test asserts — the chooser, the consent dialog, the publish action — is the real
 * card's own output, reached through the real container.
 */
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        consentSlot,
        topicSlot,
        onPublish,
    }: {
        consentSlot?: React.ReactNode;
        topicSlot?: React.ReactNode;
        onPublish?: () => void;
    }) => (
        <div data-testid="editor">
            <div data-testid="consent-slot">{consentSlot}</div>
            <div data-testid="topic-slot">{topicSlot}</div>
            <button type="button" onClick={() => onPublish?.()}>
                publish
            </button>
        </div>
    ),
}));

import { AgencyLegalTextContainer } from '.';

const agencyData: any = {
    id: '55',
    tenantId: '1',
    topics: [{ id: 3, name: 'U25 Suizidprävention' }],
    content: { privacy: { de: '<p>agency wide</p>' }, impressum: { de: '<p>agency imprint</p>' } },
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
    await userEvent.click(screen.getByRole('button', { name: 'Fachbereich wählen' }));
    await userEvent.click(await screen.findByText(name));
};

/** The chevron of the consent template split button. */
const chooser = () => screen.queryByRole('button', { name: 'Vorlagenmenü öffnen' });

/**
 * A Fachbereich whose data-protection policy read SUCCEEDED but carried no consent
 * sentence — the department that has not authored one yet. `content` is its own text,
 * so this is a forked department; the sentence is simply still missing.
 */
const readWithoutConsentText = () =>
    h.useDepartmentDpp.mockReturnValue({
        data: { content: '{"de":"<p>own</p>"}', publicationStatus: 'PUBLISHED' },
        isLoading: false,
        isError: false,
        isSuccess: true,
    });

/**
 * #929 — the chooser is the ONLY way to seed a first consent sentence, so it has to be
 * reachable exactly where none exists yet. Reading an omitted `consentText` as "this
 * backend cannot store consent" hid it there, which is the regression these tests hold.
 */
describe('AgencyLegalTextContainer → DepartmentDataProtectionCard — the first consent sentence', () => {
    beforeEach(() => {
        h.useDepartmentDpp.mockReset();
        h.publishDpp.mockReset();
        h.tenant.mockReset().mockReturnValue({ data: undefined });
    });

    it('offers the consent editor and its template chooser to a department that has no sentence yet', async () => {
        readWithoutConsentText();

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(screen.getByTestId('consent-slot')).toContainElement(chooser() as HTMLElement);
        expect(screen.getByTestId('consent-edit-trigger')).toBeInTheDocument();
    });

    it('seeds the sentence from a template and publishes it with the policy', async () => {
        readWithoutConsentText();

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        await userEvent.click(chooser() as HTMLElement);
        await userEvent.click(await screen.findByText('Plattform-Vorlage'));

        // The template's wording is what the admin now sees in the consent field …
        await userEvent.click(screen.getByTestId('consent-edit-trigger'));
        expect(screen.getByRole('textbox')).toHaveValue(STRINGS['legal.consent.template.platform.text']);

        // … and it goes live with the policy it belongs to, unblocked.
        await userEvent.click(screen.getByRole('button', { name: 'publish' }));
        expect(screen.queryByTestId('consent-publish-blocked')).not.toBeInTheDocument();
        expect(h.publishDpp).toHaveBeenCalledWith({
            content: { de: '<p>own</p>' },
            publish: true,
            consentText: { de: STRINGS['legal.consent.template.platform.text'] },
        });
    });

    it('still shows a stored sentence rather than an empty field', async () => {
        h.useDepartmentDpp.mockReturnValue({
            data: {
                content: '{"de":"<p>own</p>"}',
                consentText: '{"de":"Gespeicherter Satz {{legal_links}}"}',
                publicationStatus: 'PUBLISHED',
            },
            isLoading: false,
            isError: false,
            isSuccess: true,
        });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');
        await userEvent.click(screen.getByTestId('consent-edit-trigger'));

        expect(screen.getByRole('textbox')).toHaveValue('Gespeicherter Satz {{legal_links}}');
    });

    it('does not put a department consent chooser on the imprint', async () => {
        readWithoutConsentText();

        renderContainer({ field: 'imprint' });
        await selectDepartment('U25 Suizidprävention');

        expect(chooser()).not.toBeInTheDocument();
        expect(screen.getByTestId('consent-slot')).toBeEmptyDOMElement();
    });

    it('does not put a department consent chooser on the agency-wide text', () => {
        readWithoutConsentText();

        renderContainer();

        expect(chooser()).not.toBeInTheDocument();
        // Since #914 the slot is not empty here: it explains that the agency-wide text is
        // consent-free by decision and that a Fachbereich is one click away.
        expect(screen.getByTestId('consent-unavailable-trigger')).toBeInTheDocument();
    });

    it('stays fail-closed on a failed read: no editor at all, so no consent field either', async () => {
        h.useDepartmentDpp.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            isSuccess: false,
            refetch: vi.fn(),
        });

        renderContainer();
        await selectDepartment('U25 Suizidprävention');

        expect(screen.queryByTestId('editor')).not.toBeInTheDocument();
        expect(chooser()).not.toBeInTheDocument();
        expect(screen.getByText('agency.legal.department.loadError.title')).toBeInTheDocument();
    });
});
