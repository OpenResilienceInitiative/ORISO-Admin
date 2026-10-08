import type { ComponentProps } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { OrganisationDpaStep } from './OrganisationDpaStep';
import type { TenantAdminOnboardingInviteDTO } from '../../api/tenantOnboarding/tenantOnboarding';
import de from '../../locales/de/translation.json';
import en from '../../locales/en/translation.json';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
    Element.prototype.scrollIntoView = vi.fn();
});

const INVITE: TenantAdminOnboardingInviteDTO = {
    recipientEmail: 'admin@tenant.example',
    firstName: 'Erika',
    lastName: 'Beispiel',
    reservedTenantId: 21,
    tenantIdReservationToken: 'reservation-token-21',
    expiresAt: null,
    dpaContent: JSON.stringify({ de: '<h2 id="s1">§ 1 Gegenstand</h2><p>Text</p>' }),
};

const renderStep = (props: Partial<ComponentProps<typeof OrganisationDpaStep>> = {}) =>
    render(
        <OrganisationDpaStep
            invite={INVITE}
            initialOrganisation={null}
            initialDpa={null}
            onSubmit={vi.fn()}
            {...props}
        />,
    );

/** True when `first` appears before `second` in the rendered document. */
const precedes = (first: Element, second: Element) =>
    // eslint-disable-next-line no-bitwise
    Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

/**
 * Owner annotations 2026-08-18, H3 (reader modal) / I2 (wizard view): "Alles
 * innerhalb blauer area muss weg" / "entfernen in dieser ansicht" — the
 * reader's own icon + title + info-line header must go from BOTH places.
 * Both go through the same `DpaLegalReader` call in this step; the fullscreen
 * "reader modal" (H3) is that very same card maximized, so one fix covers
 * both annotations.
 */
describe('OrganisationDpaStep — no duplicate AVV header block (owner report 2026-08-18, H3/I2)', () => {
    it('hides the reader-card icon, title and info line — the wizard already states the agreement once', async () => {
        renderStep();

        await screen.findByTestId('dpa-text');

        expect(screen.queryByRole('heading', { name: 'tenantOnboarding.dpa.title' })).not.toBeInTheDocument();
        expect(screen.queryByText('tenantOnboarding.dpa.description')).not.toBeInTheDocument();
        // The accessible name of the reading region must survive hiding the
        // VISUAL header — `title` is still required and still labels it.
        expect(screen.getByRole('region', { name: 'tenantOnboarding.dpa.title' })).toBeInTheDocument();
    });

    it('keeps the header hidden inside the fullscreen reader dialog too (H3, the "reader modal")', async () => {
        renderStep();
        await screen.findByTestId('dpa-text');

        fireEvent.click(screen.getByRole('button', { name: 'legal.m3Editor.maximize' }));

        // The modal is a portal: `DpaLegalReader`'s own `dpa-text` wrapper
        // stays in the original tree position, only the M3RichTextEditor
        // card itself (`m3-editor`) moves into the dialog.
        const dialog = await screen.findByRole('dialog');
        await waitFor(() => expect(within(dialog).getByTestId('m3-editor')).toBeInTheDocument());
        expect(within(dialog).getAllByText('§ 1 Gegenstand').length).toBeGreaterThan(0);
        expect(within(dialog).queryByRole('heading', { name: 'tenantOnboarding.dpa.title' })).not.toBeInTheDocument();
        expect(within(dialog).queryByText('tenantOnboarding.dpa.description')).not.toBeInTheDocument();
    });
});

/**
 * Owner report 2026-08-19: step 1 showed two unnamed field groups — the
 * organisation master data at the very top of the step and, far below the
 * agreement, the signer fields with no headline at all. Both blocks get a real
 * section header, and the organisation block moves DOWN so it sits directly
 * above the person that signs ("Die Sektion muss nach unten zu den
 * Personendaten wandern").
 */
describe('OrganisationDpaStep — named sections, master data next to the signer (owner report 2026-08-19)', () => {
    it('names both blocks with real headings one level below the step title', async () => {
        renderStep();
        await screen.findByTestId('dpa-text');

        expect(
            screen.getByRole('heading', { name: 'tenantOnboarding.organisation.masterDataTitle', level: 3 }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'tenantOnboarding.dpa.signerSectionTitle', level: 3 }),
        ).toBeInTheDocument();
    });

    it('orders the step: intro, agreement, organisation master data, signer data, consent', async () => {
        renderStep();
        await screen.findByTestId('dpa-text');

        const stepTitle = screen.getByRole('heading', { name: 'tenantOnboarding.organisation.title', level: 2 });
        const agreement = screen.getByTestId('dpa-text');
        const masterDataTitle = screen.getByRole('heading', {
            name: 'tenantOnboarding.organisation.masterDataTitle',
        });
        const organisationName = screen.getByLabelText('tenantOnboarding.organisation.name');
        const address = screen.getByLabelText('tenantOnboarding.organisation.address');
        const signerTitle = screen.getByRole('heading', { name: 'tenantOnboarding.dpa.signerSectionTitle' });
        const signerName = screen.getByLabelText('tenantOnboarding.dpa.signerName');
        const consent = screen.getByTestId('dpa-consent');

        const order = [
            stepTitle,
            agreement,
            masterDataTitle,
            organisationName,
            address,
            signerTitle,
            signerName,
            consent,
        ];
        order.forEach((element, index) => {
            const next = order[index + 1];
            if (next) expect(precedes(element, next)).toBe(true);
        });
    });

    it('keeps the organisation master data reachable while the agreement is unavailable', async () => {
        renderStep({ invite: { ...INVITE, dpaContent: null } });

        expect(await screen.findByTestId('dpa-content-unavailable')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'tenantOnboarding.organisation.masterDataTitle' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('tenantOnboarding.organisation.name')).toBeInTheDocument();
        // Nothing to sign: the signer section goes with the fields it names.
        expect(
            screen.queryByRole('heading', { name: 'tenantOnboarding.dpa.signerSectionTitle' }),
        ).not.toBeInTheDocument();
    });

    it('keeps the organisation master data in the forwarded on-hold state, without a signer section', async () => {
        renderStep({
            forward: { signUrl: 'https://example.org/dpa-sign/t', expiresAt: null, recipientEmail: null },
        });

        await screen.findByTestId('dpa-forwarded-onhold');
        expect(
            screen.getByRole('heading', { name: 'tenantOnboarding.organisation.masterDataTitle' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('tenantOnboarding.organisation.subdomain')).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'tenantOnboarding.dpa.signerSectionTitle' }),
        ).not.toBeInTheDocument();
    });
});

/**
 * The backend can fail to deliver the contract text for two opposite reasons
 * (`dpaUnavailableReason`), and the page used to answer both with "please
 * reload". Reloading helps in neither case: on staging that single sentence
 * made a server-side misconfiguration read as "the operator published
 * nothing", and it stayed unreported for hours. The step must pass the reason
 * through and keep refusing the submit in every case.
 */
describe('OrganisationDpaStep — the unavailable agreement names its cause', () => {
    it('shows the platform-configuration message on an upstream error', async () => {
        renderStep({ invite: { ...INVITE, dpaContent: null, dpaUnavailableReason: 'UPSTREAM_ERROR' } });

        expect(await screen.findByTestId('dpa-content-unavailable')).toHaveTextContent(
            'tenantOnboarding.dpa.unavailableUpstream',
        );
    });

    it('shows the not-yet-published message when nothing was published', async () => {
        renderStep({ invite: { ...INVITE, dpaContent: null, dpaUnavailableReason: 'NOT_PUBLISHED' } });

        expect(await screen.findByTestId('dpa-content-unavailable')).toHaveTextContent(
            'tenantOnboarding.dpa.unavailableNotPublished',
        );
    });

    it('falls back to the generic message against a backend that does not send the field', async () => {
        renderStep({ invite: { ...INVITE, dpaContent: null } });

        // Anchored: both reason keys start with the generic one.
        expect(await screen.findByTestId('dpa-content-unavailable')).toHaveTextContent(
            /^tenantOnboarding\.dpa\.unavailable$/,
        );
    });

    it('still refuses the submit with a named reason — the step stays blocked', async () => {
        const onSubmit = vi.fn();
        renderStep({
            invite: { ...INVITE, dpaContent: null, dpaUnavailableReason: 'UPSTREAM_ERROR' },
            onSubmit,
        });

        await screen.findByTestId('dpa-content-unavailable');
        fireEvent.change(screen.getByLabelText('tenantOnboarding.organisation.name'), {
            target: { value: 'Träger Beispiel' },
        });
        fireEvent.change(screen.getByLabelText('tenantOnboarding.organisation.subdomain'), {
            target: { value: 'beispiel' },
        });
        fireEvent.change(screen.getByLabelText('tenantOnboarding.organisation.address'), {
            target: { value: 'Musterweg 1, 12345 Musterstadt' },
        });
        fireEvent.click(screen.getByRole('button', { name: /tenantOnboarding\.continue/ }));

        await waitFor(() =>
            expect(screen.getByTestId('onboarding-submit-error')).toHaveTextContent(
                'tenantOnboarding.dpa.unavailableBlocked',
            ),
        );
        expect(onSubmit).not.toHaveBeenCalled();
        // The delegation path is the way out and must survive the error state.
        expect(screen.getByRole('button', { name: /dpaForward\.action\.notAuthorised/ })).toBeInTheDocument();
    });

    it('ships both reason messages in every locale, each with its own remedy', () => {
        expect(de['tenantOnboarding.dpa.unavailableUpstream']).toMatch(/Plattform-Konfiguration/);
        expect(de['tenantOnboarding.dpa.unavailableUpstream']).toMatch(/Neuladen der Seite hilft hier nicht/);
        expect(de['tenantOnboarding.dpa.unavailableNotPublished']).toMatch(/noch keine Vertragsunterlagen/);
        // The old wording sent people to reload; the named states must not.
        expect(de['tenantOnboarding.dpa.unavailableNotPublished']).not.toMatch(/laden Sie die Seite neu/);
        expect(en['tenantOnboarding.dpa.unavailableUpstream']).toMatch(/platform configuration/i);
        expect(en['tenantOnboarding.dpa.unavailableUpstream']).toMatch(/will not help/i);
        expect(en['tenantOnboarding.dpa.unavailableNotPublished']).toMatch(/has not published/i);
        expect(en['tenantOnboarding.dpa.unavailableNotPublished']).not.toMatch(/reload the page/i);
    });
});

/**
 * With a section header above them the signer fields no longer have to repeat
 * "der unterzeichnenden Person" in every single label (owner report
 * 2026-08-19) — the long labels were truncated in the two-column grid.
 */
describe('tenant onboarding wording — short signer labels under their section header', () => {
    it('ships both section headers in every locale', () => {
        expect(de['tenantOnboarding.organisation.masterDataTitle']).toBe('Stammdaten Organisation');
        expect(de['tenantOnboarding.dpa.signerSectionTitle']).toBe('Daten der vertretungsberechtigten Person');
        expect(en['tenantOnboarding.organisation.masterDataTitle']).toBeTruthy();
        expect(en['tenantOnboarding.dpa.signerSectionTitle']).toBeTruthy();
    });

    it('shortens the four signer labels', () => {
        expect(de['tenantOnboarding.dpa.signerName']).toBe('Vollständiger Name');
        expect(de['tenantOnboarding.dpa.signerPosition']).toBe('Position');
        expect(de['tenantOnboarding.dpa.signerEmail']).toBe('E-Mail');
        expect(de['tenantOnboarding.dpa.signerNote']).toBe('Anmerkung (optional)');
    });

    it('keeps the organisation labels self-explanatory — two fields called "Name" would be ambiguous', () => {
        expect(de['tenantOnboarding.organisation.name']).toBe('Name der Organisation');
        expect(de['tenantOnboarding.organisation.address']).toBe('Adresse');
        expect(de['tenantOnboarding.organisation.subdomain']).toBe('Subdomain');
    });
});

describe('the reserved-tenant-ID explanation travels with the fields it explains', () => {
    /*
     * Owner annotation on the *2 screenshot, 2026-08-19: a red box around the
     * three organisation fields plus the note "Move info to the section where
     * the person needs to sign." His prose says "die SEKTION *2 muss nach unten
     * ... wandern" — the section, not only its inputs.
     *
     * Moving the fields alone left the sentence that explains them stranded at
     * the top of the step, with the entire contract reader between the two. The
     * explanation now sits directly under the "Stammdaten Organisation" heading,
     * so the reserved ID is described where it is actually entered.
     *
     * The step subtitle ("Angaben zur Organisation") deliberately stays at the
     * top: it titles the step, not the field group.
     */
    it('renders the explanation after the master-data heading, not before the agreement', async () => {
        renderStep();

        const masterDataTitle = await screen.findByTestId('organisation-master-data-title');
        const explanation = screen.getByText(/tenantOnboarding\.organisation\.description/);
        const agreement = await screen.findByTestId('dpa-text');

        expect(precedes(masterDataTitle, explanation)).toBe(true);
        expect(precedes(agreement, explanation)).toBe(true);
    });

    it('keeps the step subtitle at the top of the step', async () => {
        renderStep();

        const subtitle = screen.getByRole('heading', { name: 'tenantOnboarding.organisation.title' });
        const agreement = await screen.findByTestId('dpa-text');

        expect(precedes(subtitle, agreement)).toBe(true);
    });
});
