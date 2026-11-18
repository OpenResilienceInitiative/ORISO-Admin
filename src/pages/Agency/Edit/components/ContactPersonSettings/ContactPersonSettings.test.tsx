import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { ContactPersonSettings } from './index';
import { CANDIDATES, JONAS, MARIA, PETRA } from '../../../../../components/ContactPerson/contactPersonFixtures';
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

const renderTile = (
    overrides: Partial<AgencyContactPersonAdmin>,
    props: Partial<Parameters<typeof ContactPersonSettings>[0]> = {},
) => {
    const onSave = vi.fn();
    render(<ContactPersonSettings data={data(overrides)} candidates={CANDIDATES} onSave={onSave} {...props} />);
    return { onSave, user: userEvent.setup() };
};

// The clear icon only becomes visible on hover; clicking it directly is what a hover-then-click does.
const clearContact = () => {
    const contact = screen.getByRole('combobox', { name: 'contactPerson.field.contact' });
    const field = contact.closest('.MuiAutocomplete-root') as HTMLElement;
    fireEvent.click(field.querySelector('.MuiAutocomplete-clearIndicator') as HTMLElement);
};

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

    it('submits the stored pair unchanged', async () => {
        const { onSave, user } = renderTile({ contact: MARIA, deputy: JONAS, effectiveSource: 'OWN' });

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(onSave.mock.calls[0][0]).toEqual({ contactAdminId: MARIA.adminId, deputyAdminId: JONAS.adminId });
    });

    it('clears the deputy with the contact, so the save is not blocked by a hidden deputy', async () => {
        const { onSave, user } = renderTile({ contact: MARIA, deputy: JONAS, effectiveSource: 'OWN' });

        await user.click(screen.getByRole('button', { name: 'edit' }));
        clearContact();
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(onSave.mock.calls[0][0]).toEqual({ contactAdminId: null, deputyAdminId: null });
    });

    it('reopens with the entered values when the save fails', async () => {
        const { onSave, user } = renderTile({ contact: MARIA, effectiveSource: 'OWN' });

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(screen.queryByRole('button', { name: 'card.edit.save' })).toBeNull();

        onSave.mock.calls[0][1].onError();

        expect(await screen.findByRole('button', { name: 'card.edit.save' })).toBeInTheDocument();
        expect(
            (screen.getByRole('combobox', { name: 'contactPerson.field.contact' }) as HTMLInputElement).value,
        ).toContain('Maria');
    });

    it('offers no saving without access', async () => {
        const { onSave, user } = renderTile({ contact: MARIA, effectiveSource: 'OWN' }, { readOnlyAccess: true });

        await user.click(screen.getByRole('button', { name: 'edit' }));

        expect(screen.queryByRole('button', { name: 'card.edit.save' })).toBeNull();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('offers no editing while a save is in flight', () => {
        renderTile({ contact: MARIA, effectiveSource: 'OWN' }, { saving: true });

        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
    });
});
