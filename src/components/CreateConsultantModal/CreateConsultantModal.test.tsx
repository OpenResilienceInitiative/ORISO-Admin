import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateConsultantModal } from './index';

// t() is identity so labels/messages are predictable and no i18n init is needed.
// react-i18next's hook returns an array [t, i18n, ready] that also exposes { t }.
vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return { useTranslation: () => Object.assign([t, {}, true], { t }) };
});

const mocks = vi.hoisted(() => ({ addCounselorData: vi.fn() }));

vi.mock('../../api/counselor/addCounselorData', () => ({ addCounselorData: mocks.addCounselorData }));

const CREATED = { id: '77', firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.org' };

const renderModal = (overrides: Record<string, unknown> = {}) => {
    const onSuccess = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <CreateConsultantModal tenantId={42} agencyId={282} topicIds={[7]} onSuccess={onSuccess} {...overrides} />
        </QueryClientProvider>,
    );
    return { onSuccess };
};

const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
    // The trigger carries a plus icon, so its accessible name is "plus …".
    await user.click(screen.getByRole('button', { name: /createConsultant\.button$/ }));
    return screen.findByText('agency.form.registrationSettings.createConsultant.title');
};

/** Typing 60 characters re-renders the avatar grid 60 times; set the values instead. */
const fillRequired = (values: Record<string, string> = {}) => {
    const filled = {
        firstname: 'Ada',
        lastname: 'Lovelace',
        email: 'ada@example.org',
        'counselor.username': 'ada',
        'counselor.password': 'Str0ng!pass',
        'counselor.passwordConfirmation': 'Str0ng!pass',
        ...values,
    };
    Object.entries(filled).forEach(([label, value]) => {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
    });
};

/** MUI outlined fields print their label twice (label + fieldset legend). */
const isRendered = (label: string) => screen.queryAllByText(label).length > 0;

beforeEach(() => {
    mocks.addCounselorData.mockReset();
    mocks.addCounselorData.mockResolvedValue(CREATED);
});

/*
 * Owner, 2026-09-19: "nein lass bitte an allen stellen alle daten anlegen dann
 * ist das popup halt in zwei columns designed fertig. auch wäre hier ein save
 * and create new button super […] ein bisschen wie jira […] also auch icon etc
 * muss jetzt da gewählt werden!"
 *
 * Two things follow. The dialog offers the SAME set as the page form — no
 * collapsed "more fields" drawer hiding half a person behind a disclosure
 * triangle — and creating one counsellor can hand the admin an empty form for
 * the next one instead of throwing them back to the agency screen.
 */
describe('the quick-create dialog field set', () => {
    it('offers every field up front, with nothing folded away', async () => {
        const user = userEvent.setup();
        renderModal();
        await openDialog(user);

        // The disclosure drawer is gone: half the fields behind a triangle is
        // how the quick path silently decided things for the admin.
        expect(document.querySelector('details')).toBeNull();

        const expected = [
            'firstname',
            'lastname',
            'counselor.displayName',
            'counselor.internalDisplayName',
            'counselor.avatar',
            'counselor.salutation',
            'counselor.position',
            'counselor.personalTitle',
            'email',
            'counselor.username',
            'counselor.password',
            'counselor.passwordConfirmation',
            'counselor.formalLanguage.title',
            'counselor.isGroupChatConsultant',
            'counselor.absent',
        ];

        expect(expected.filter((label) => !isRendered(label))).toEqual([]);
    });

    it('lets the admin pick the avatar right here', async () => {
        const user = userEvent.setup();
        renderModal();
        await openDialog(user);

        // "auch icon etc muss jetzt da gewählt werden" — the picker itself, not
        // a note that it can be set later on the user screen.
        expect(screen.getByRole('radiogroup')).toBeInTheDocument();
        expect(screen.getAllByRole('radio').length).toBeGreaterThan(1);
    });

    it('leaves out only what it declares, and leaves it out for a reason', async () => {
        const user = userEvent.setup();
        renderModal();
        await openDialog(user);

        // Role-gated on the page form; not offered on a surface with no role gate.
        expect(isRendered('counselor.adminRemarks')).toBe(false);
        // Needs a stored record (ADR-008) — `addCounselorData` carries neither.
        expect(isRendered('counselor.isSupervisor')).toBe(false);

        // The absence note is excluded, not merely hidden behind the switch:
        // turning absence ON must still not produce a field the create request
        // would drop on the floor.
        await user.click(screen.getByRole('switch', { name: 'counselor.absent' }));
        await waitFor(() => expect(screen.getByRole('switch', { name: 'counselor.absent' })).toBeChecked());
        expect(isRendered('counselor.absenceMessage')).toBe(false);
    });
});

describe('save and create another', () => {
    it('keeps the dialog open with an empty form, and reports the consultant', async () => {
        const user = userEvent.setup();
        const { onSuccess } = renderModal();
        await openDialog(user);
        fillRequired();

        await user.click(
            screen.getByRole('button', { name: 'agency.form.registrationSettings.createConsultant.confirmAndNext' }),
        );

        // Persisted, and handed to the agency form so the new counsellor shows
        // up in its selection list straight away.
        await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: '77' })));
        // Still open, ready for the next person (the Jira pattern the owner asked for).
        expect(screen.getByText('agency.form.registrationSettings.createConsultant.title')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByLabelText('firstname')).toHaveValue(''));
        expect(screen.getByLabelText('email')).toHaveValue('');
    });

    it('does not carry the previous person into the next request', async () => {
        const user = userEvent.setup();
        renderModal();
        await openDialog(user);
        fillRequired();
        await user.click(
            screen.getByRole('button', { name: 'agency.form.registrationSettings.createConsultant.confirmAndNext' }),
        );
        await waitFor(() => expect(mocks.addCounselorData).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.getByLabelText('firstname')).toHaveValue(''));

        fillRequired({ firstname: 'Grace', lastname: 'Hopper', 'counselor.username': 'grace' });
        await user.click(
            screen.getByRole('button', { name: 'agency.form.registrationSettings.createConsultant.confirmAndNext' }),
        );

        await waitFor(() => expect(mocks.addCounselorData).toHaveBeenCalledTimes(2));
        expect(mocks.addCounselorData.mock.calls[1][0]).toMatchObject({ firstname: 'Grace', username: 'grace' });
    });

    it('still closes the dialog on the plain create button', async () => {
        const user = userEvent.setup();
        const { onSuccess } = renderModal();
        await openDialog(user);
        fillRequired();

        await user.click(
            screen.getByRole('button', { name: 'agency.form.registrationSettings.createConsultant.confirm' }),
        );

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        await waitFor(() =>
            expect(
                screen.queryByText('agency.form.registrationSettings.createConsultant.title'),
            ).not.toBeInTheDocument(),
        );
    });

    it('does not let a rejected attempt change what the next submit does', async () => {
        const user = userEvent.setup();
        const { onSuccess } = renderModal();
        await openDialog(user);

        // Asked for "and another" on an empty form: validation rejects it, so
        // nothing was saved and the intent expires with the attempt.
        await user.click(
            screen.getByRole('button', { name: 'agency.form.registrationSettings.createConsultant.confirmAndNext' }),
        );
        await waitFor(() => expect(mocks.addCounselorData).not.toHaveBeenCalled());

        fillRequired();
        // Enter inside a field has always meant plain create.
        await user.type(screen.getByLabelText('firstname'), '{Enter}');

        await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
        await waitFor(() =>
            expect(
                screen.queryByText('agency.form.registrationSettings.createConsultant.title'),
            ).not.toBeInTheDocument(),
        );
    });

    it('leaves the form untouched when the save fails, so nothing is retyped', async () => {
        const user = userEvent.setup();
        mocks.addCounselorData.mockRejectedValue(new Error('boom'));
        renderModal();
        await openDialog(user);
        fillRequired();

        await user.click(
            screen.getByRole('button', { name: 'agency.form.registrationSettings.createConsultant.confirmAndNext' }),
        );

        await waitFor(() => expect(mocks.addCounselorData).toHaveBeenCalled());
        expect(screen.getByLabelText('firstname')).toHaveValue('Ada');
        expect(screen.getByText('agency.form.registrationSettings.createConsultant.title')).toBeInTheDocument();
    });
});
