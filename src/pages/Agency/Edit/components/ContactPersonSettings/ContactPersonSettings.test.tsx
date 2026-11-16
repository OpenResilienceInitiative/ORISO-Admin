import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { ContactPersonSettings } from './index';
import { CANDIDATES, MARIA, PETRA } from '../../../../../components/ContactPerson/contactPersonFixtures';
import type { AgencyContactPersonAdmin } from '../../../../../types/contactPerson';

// Some fields read `const [t] = useTranslation()`, others `const { t } = …`: serve both.
vi.mock('react-i18next', () => {
    const t = (key: string) => key;
    return { useTranslation: () => Object.assign([t], { t }) };
});

const data = (overrides: Partial<AgencyContactPersonAdmin>): AgencyContactPersonAdmin => ({
    agencyId: 1,
    tenantId: 7,
    contact: null,
    deputy: null,
    traegerDefault: {},
    effectiveSource: 'NONE',
    ...overrides,
});

const renderTile = (overrides: Partial<AgencyContactPersonAdmin>) =>
    render(<ContactPersonSettings data={data(overrides)} candidates={CANDIDATES} onSave={vi.fn()} />);

/** ORISO-Admin#1534: the hint under the title of the "Ansprechperson" tile. */
describe('ContactPersonSettings', () => {
    it('names the Träger default while the centre has no own contact', () => {
        renderTile({ traegerDefault: { contact: PETRA }, effectiveSource: 'TRAEGER_DEFAULT' });

        expect(screen.getByTestId('contact-person-traeger-default')).toHaveTextContent(
            'Petra Träger (kontakt@caritas-sued.example)',
        );
        expect(screen.queryByTestId('contact-person-no-default')).toBeNull();
    });

    it('warns when neither the centre nor the Träger names anyone', () => {
        renderTile({});

        expect(screen.getByTestId('contact-person-no-default')).toBeInTheDocument();
    });

    it('shows no hint once the centre has its own contact', () => {
        renderTile({ contact: MARIA, traegerDefault: { contact: PETRA }, effectiveSource: 'OWN' });

        expect(screen.queryByTestId('contact-person-traeger-default')).toBeNull();
        expect(screen.queryByTestId('contact-person-no-default')).toBeNull();
    });
});
