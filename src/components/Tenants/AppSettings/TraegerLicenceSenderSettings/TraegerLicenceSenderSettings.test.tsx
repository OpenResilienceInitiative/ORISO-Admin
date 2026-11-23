import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('react-i18next', () => {
    const t = (key: string) => key;
    const i18n = { language: 'de' };
    const result: any = [t, i18n, true];
    result.t = t;
    result.i18n = i18n;
    result.ready = true;
    return { useTranslation: () => result };
});

const STORED = {
    id: 7,
    name: 'Träger Süd',
    address: 'Musterstraße 1',
    legalName: 'Caritasverband Süd e.V.',
    contactEmail: 'kontakt@example.org',
    contactPhone: '0761 1',
    licensing: { allowedNumberOfUsers: 40 },
    settings: { featureTopicsEnabled: true },
};
vi.mock('../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({ data: STORED, isLoading: false }),
}));

const mutate = vi.fn();
vi.mock('../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate }),
}));

const roles = { isSuperAdmin: true };
vi.mock('../../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => roles }));

// eslint-disable-next-line import/first
import { TraegerLicenceSenderSettings } from './index';

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

const LICENCE = /tenants.add.form.allowedConsultantsLicense.placeholder/;
const LEGAL_NAME = /tenants.form.sender.legalName/;

beforeEach(() => {
    mutate.mockReset();
    roles.isSuperAdmin = true;
});

/**
 * Frank, 2026-11-20: licence and sender go beyond master data. On the Träger page they moved from
 * Stammdaten into the tab "Weitere", as a tile with its own save.
 */
describe('TraegerLicenceSenderSettings ("Weitere")', () => {
    it('shows the licence and the sender block as sections of one tile, with the stored values', () => {
        render(<TraegerLicenceSenderSettings tenantId="7" />);

        const licence = screen.getByRole('group', { name: 'tenants.form.section.licence' });
        const sender = screen.getByRole('group', { name: 'tenants.form.section.sender' });
        expect(within(licence).getByLabelText(LICENCE)).toHaveValue(40);
        expect(within(sender).getByLabelText(LEGAL_NAME)).toHaveValue('Caritasverband Süd e.V.');
        expect(within(sender).getByLabelText(/tenants.form.sender.contactEmail/)).toHaveValue('kontakt@example.org');
        expect(within(sender).getByLabelText(/tenants.form.sender.contactPhone/)).toHaveValue('0761 1');
    });

    it('platform admin: saves licence and sender only, nothing else of the Träger', async () => {
        const user = userEvent.setup();
        render(<TraegerLicenceSenderSettings tenantId="7" />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        const licence = screen.getByLabelText(LICENCE);
        await user.clear(licence);
        await user.type(licence, '12');
        await user.clear(screen.getByLabelText(LEGAL_NAME));
        await user.type(screen.getByLabelText(LEGAL_NAME), 'Neuer Name e.V.');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
        // The shared mutation lays these over a fresh full read, so name, settings & co. stay as stored.
        expect(mutate.mock.calls[0][0]).toEqual({
            licensing: { allowedNumberOfUsers: 12 },
            legalName: 'Neuer Name e.V.',
            contactEmail: 'kontakt@example.org',
            contactPhone: '0761 1',
        });
    });

    it('platform admin: a licence is required', async () => {
        const user = userEvent.setup();
        render(<TraegerLicenceSenderSettings tenantId="7" />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.clear(screen.getByLabelText(LICENCE));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        expect(await screen.findByText('form.errors.required')).toBeInTheDocument();
        expect(mutate).not.toHaveBeenCalled();
    });

    it('Träger admin: sees the licence read-only and saves the sender without it', async () => {
        roles.isSuperAdmin = false;
        const user = userEvent.setup();
        render(<TraegerLicenceSenderSettings tenantId="7" />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        expect(screen.getByLabelText(LICENCE)).toBeDisabled();
        expect(screen.getByText('tenants.appSettings.licenceSender.licenceReadOnly')).toBeVisible();
        await user.type(screen.getByLabelText(/tenants.form.sender.contactPhone/), '23');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
        expect(mutate.mock.calls[0][0]).toEqual({
            legalName: 'Caritasverband Süd e.V.',
            contactEmail: 'kontakt@example.org',
            contactPhone: '0761 123',
        });
    });
});
