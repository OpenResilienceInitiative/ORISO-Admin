import type { ReactNode } from 'react';
import { Form } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    CONSULTANT_PERSONAL_FIELDS,
    CONSULTANT_SETTINGS_FIELDS,
    ConsultantPersonalFields,
    ConsultantSettingsFields,
    type ConsultantFieldName,
} from './index';

// t() is identity so labels/messages are predictable and no i18n init is needed.
// react-i18next's hook returns an array [t, i18n, ready] that also exposes { t },
// so support both `const [t] = …` and `const { t } = …` call sites.
vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return { useTranslation: () => Object.assign([t, {}, true], { t }) };
});

/*
 * The consultant field set has TWO surfaces: the full page form
 * (src/pages/users/Edit) and the quick-create dialog on the agency screen
 * (src/components/CreateConsultantModal). The dialog used to re-state a subset
 * of the page's fields, which is how a counsellor created from the agency
 * screen became a different record from one created on the user screen — the
 * tone was hardcoded and the avatar was never asked for.
 *
 * This module is the single declaration of that set. These tests pin the two
 * things a shared field set has to get right: it renders EVERY field it
 * declares, and a surface that offers fewer of them has to SAY which ones
 * (`exclude`) rather than reaching the same result by leaving code out.
 */

const submitted = vi.fn();

/** Passes the required rules so `onFinish` can be reached without typing. */
const VALID_REQUIRED = {
    firstname: 'Ada',
    lastname: 'Lovelace',
    email: 'ada@example.org',
    username: 'ada',
    password: 'Str0ng!pass',
    passwordConfirmation: 'Str0ng!pass',
};

const Harness = ({
    exclude,
    settingsExclude,
    usernameLocked,
    initialValues,
    children,
}: {
    exclude?: ConsultantFieldName[];
    settingsExclude?: ConsultantFieldName[];
    usernameLocked?: boolean;
    initialValues?: Record<string, unknown>;
    children?: ReactNode;
}) => (
    <Form initialValues={{ ...VALID_REQUIRED, ...initialValues }} onFinish={submitted}>
        <ConsultantPersonalFields exclude={exclude} usernameLocked={usernameLocked} />
        <ConsultantSettingsFields exclude={settingsExclude}>{children}</ConsultantSettingsFields>
        <button type="submit">go</button>
    </Form>
);

/** The label key each declared field renders under. */
const LABEL: Record<ConsultantFieldName, string> = {
    firstname: 'firstname',
    lastname: 'lastname',
    displayName: 'counselor.displayName',
    internalDisplayName: 'counselor.internalDisplayName',
    avatar: 'counselor.avatar',
    salutation: 'counselor.salutation',
    position: 'counselor.position',
    title: 'counselor.personalTitle',
    adminRemarks: 'counselor.adminRemarks',
    email: 'email',
    username: 'counselor.username',
    password: 'counselor.password',
    passwordConfirmation: 'counselor.passwordConfirmation',
    formalLanguage: 'counselor.formalLanguage.title',
    isSupervisor: 'counselor.isSupervisor',
    isGroupchatConsultant: 'counselor.isGroupChatConsultant',
    absent: 'counselor.absent',
    absenceMessage: 'counselor.absenceMessage',
};

/** MUI outlined fields print their label twice (label + fieldset legend). */
const isRendered = (label: string) => screen.queryAllByText(label).length > 0;

beforeEach(() => submitted.mockReset());

describe('the shared consultant field set', () => {
    it('renders every field it declares', () => {
        render(<Harness />);

        const declared = [...CONSULTANT_PERSONAL_FIELDS, ...CONSULTANT_SETTINGS_FIELDS].filter(
            // absenceMessage is conditional on `absent`; it has its own test below.
            (name) => name !== 'absenceMessage',
        );

        expect(declared.filter((name) => !isRendered(LABEL[name]))).toEqual([]);
    });

    it('offers the avatar picker, not merely the stored value', () => {
        render(<Harness />);

        // One radiogroup holds the initials tile and every motif (#1046).
        expect(screen.getByRole('radiogroup')).toBeInTheDocument();
        expect(screen.getAllByRole('radio').length).toBeGreaterThan(1);
    });

    it('writes the avatar choice into the two fields that carry it', async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.click(screen.getAllByRole('radio')[0]);
        await user.click(screen.getByRole('button', { name: 'go' }));

        // The picker is the control; `avatarKind`/`avatarId` are the registered
        // fields. The choice has to reach the payload, not only the screen.
        await waitFor(() =>
            expect(submitted).toHaveBeenCalledWith(expect.objectContaining({ avatarKind: 'INITIALS' })),
        );
    });

    it('drops a field only where the surface declares it excluded', () => {
        render(<Harness exclude={['adminRemarks', 'password', 'passwordConfirmation']} />);

        expect(isRendered('counselor.adminRemarks')).toBe(false);
        expect(isRendered('counselor.password')).toBe(false);
        expect(isRendered('counselor.passwordConfirmation')).toBe(false);
        // Everything it did NOT exclude is still there.
        expect(isRendered('counselor.username')).toBe(true);
    });

    it('locks the username once the account exists, and drops its format hint with it', () => {
        render(<Harness usernameLocked />);

        expect(screen.getByLabelText('counselor.username')).toBeDisabled();
        expect(isRendered('message.error.username.format')).toBe(false);
    });

    it('asks for the absence note only once the consultant is marked absent', async () => {
        const user = userEvent.setup();
        render(<Harness />);

        expect(isRendered('counselor.absenceMessage')).toBe(false);

        await user.click(screen.getByRole('switch', { name: 'counselor.absent' }));

        await waitFor(() => expect(isRendered('counselor.absenceMessage')).toBe(true));
    });

    it('shows a stored absence note even where the absent switch itself is excluded', () => {
        // The page form keeps the switch hidden but still edits absent records.
        render(<Harness settingsExclude={['absent']} initialValues={{ absent: true }} />);

        expect(screen.queryByRole('switch', { name: 'counselor.absent' })).not.toBeInTheDocument();
        expect(isRendered('counselor.absenceMessage')).toBe(true);
    });

    it('renders the host-owned fields in the settings slot', () => {
        render(
            <Harness>
                <p>host-owned supervisor picker</p>
            </Harness>,
        );

        expect(screen.getByText('host-owned supervisor picker')).toBeInTheDocument();
    });

    it('submits exactly the fields it rendered — an excluded field is absent, not empty', async () => {
        const user = userEvent.setup();
        render(<Harness exclude={['adminRemarks']} />);

        await user.click(screen.getByRole('button', { name: 'go' }));

        await waitFor(() => expect(submitted).toHaveBeenCalled());
        // antd's onFinish carries REGISTERED fields only. An excluded field is
        // therefore missing from the payload entirely, which the API layer drops
        // and the backend reads as "leave unchanged" — NOT as "clear it".
        const [values] = submitted.mock.calls[0];
        expect(Object.keys(values)).not.toContain('adminRemarks');
        expect(Object.keys(values)).toEqual(expect.arrayContaining(['formalLanguage', 'isSupervisor']));
    });
});
