import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { OrganisationDpaStep } from './OrganisationDpaStep';
import type { TenantAdminOnboardingInviteDTO } from '../../api/tenantOnboarding/tenantOnboarding';

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

const renderStep = () =>
    render(<OrganisationDpaStep invite={INVITE} initialOrganisation={null} initialDpa={null} onSubmit={vi.fn()} />);

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
