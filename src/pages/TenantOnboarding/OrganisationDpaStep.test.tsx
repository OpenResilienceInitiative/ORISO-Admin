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
 * With a section header above them the signer fields no longer have to repeat
 * "der unterzeichnenden Person" in every single label (owner report
 * 2026-08-19) — the long labels were truncated in the two-column grid.
 */
describe('tenant onboarding wording — short signer labels under their section header', () => {
    it('ships both section headers in every locale', () => {
        expect(de['tenantOnboarding.organisation.masterDataTitle']).toBe('Stammdaten Organisation');
        expect(de['tenantOnboarding.dpa.signerSectionTitle']).toBe('Daten der unterschriftsberechtigten Person');
        expect(en['tenantOnboarding.organisation.masterDataTitle']).toBeTruthy();
        expect(en['tenantOnboarding.dpa.signerSectionTitle']).toBeTruthy();
    });

    it('shortens the four signer labels', () => {
        expect(de['tenantOnboarding.dpa.signerName']).toBe('Name');
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
