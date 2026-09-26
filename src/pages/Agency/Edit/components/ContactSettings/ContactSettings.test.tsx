import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContactSettings } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const traegerDpo = {
    nameAndLegalForm: 'Dr. Maria Muster',
    postcode: '79106',
    city: 'Freiburg',
    email: 'dsb@traeger.de',
};

const renderCard = (dataProtection: Record<string, unknown>, dpo = traegerDpo as typeof traegerDpo | null) =>
    render(<ContactSettings initialValues={{ dataProtection }} onSave={vi.fn()} traegerDpo={dpo} />);

/** Admin#1067: a Beratungsstelle without its own DPO inherits the Träger's; the Admin says so. */
describe('ContactSettings — inherited Träger DPO', () => {
    it('shows the Träger DPO as "geerbt vom Träger" when the Beratungsstelle has none', () => {
        renderCard({ dataProtectionResponsibleEntity: 'AGENCY_RESPONSIBLE' });

        const hint = screen.getByTestId('agency-inherited-dpo');
        expect(hint).toHaveTextContent('Dr. Maria Muster, 79106 Freiburg, dsb@traeger.de');
        expect(hint).toHaveTextContent('agency.edit.settings.legal.contact.inheritedDpo');
    });

    it('shows no inherited value when the Beratungsstelle names its own DPO', () => {
        renderCard({
            dataProtectionResponsibleEntity: 'DATA_PROTECTION_OFFICER',
            dataProtectionOfficerContact: { nameAndLegalForm: 'Anna Agentur' },
        });

        expect(screen.queryByTestId('agency-inherited-dpo')).toBeNull();
    });

    it('treats a chosen DPO without a name as not set', () => {
        renderCard({ dataProtectionResponsibleEntity: 'DATA_PROTECTION_OFFICER', dataProtectionOfficerContact: {} });

        expect(screen.getByTestId('agency-inherited-dpo')).toBeInTheDocument();
    });

    it('shows nothing when the Träger has no DPO either — not required, no warning', () => {
        renderCard({ dataProtectionResponsibleEntity: 'AGENCY_RESPONSIBLE' }, null);

        expect(screen.queryByTestId('agency-inherited-dpo')).toBeNull();
    });
});
