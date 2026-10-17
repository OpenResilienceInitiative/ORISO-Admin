import type { Meta, StoryObj } from '@storybook/react-vite';
import i18n from 'i18next';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { CHANGE_TENANT_ERRORS, type ChangeTenantErrorCode } from '../../../api/counselor/changeConsultantTenant';
import { ChangeTraegerDialog } from './ChangeTraegerDialog';

/**
 * Admin#1216: the dialog that asks before a platform admin moves a counsellor to another Träger.
 * Open cases stay with the old Träger, and colleagues there take them over ("Zuordnung beendet").
 */
const meta = {
    title: 'Organisms/Pages/Users/CounsellorEdit/Change Träger dialog',
    component: ChangeTraegerDialog,
    parameters: { layout: 'fullscreen' },
    args: {
        consultantName: 'Ada Lovelace',
        fromTraeger: 'Caritas Augsburg',
        toTraeger: 'Diakonie Nord',
        centres: ['Beratungsstelle Mitte (30159 Hannover)'],
        handoverLogHref: '/admin/logs/case-handover',
        step: 'confirm',
        onConfirm: fn(),
        onCancel: fn(),
        onDone: fn(),
    },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('de');
        return () => i18n.changeLanguage(previousLanguage);
    },
} satisfies Meta<typeof ChangeTraegerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const english = async () => {
    const previousLanguage = i18n.language;
    await i18n.changeLanguage('en');
    return () => i18n.changeLanguage(previousLanguage);
};

const phone = { globals: { viewport: { value: 'phone', isRotated: false } } };

/** The dialog fades in: wait until it is shown before asserting or reading text. */
const openDialog = async () => {
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toBeVisible());
    return within(dialog);
};

/** Before the call the server's case count is not known, so the dialog says it in general. */
export const OpenCasesNotCountedYet: Story = {
    play: async () => {
        const dialog = await openDialog();
        await expect(dialog.getByText(/Offene Fälle bleiben beim bisherigen Träger „Caritas Augsburg“/)).toBeVisible();
        await expect(dialog.getByText(/„Zuordnung beendet“ übernehmen/)).toBeVisible();
        await expect(dialog.getByText(/freiwilligen Wechsel zuerst/)).toBeVisible();
        await expect(dialog.getByRole('link', { name: 'Fallübergaben ansehen' })).toHaveAttribute('target', '_blank');
        await expect(dialog.getByRole('button', { name: 'Träger wechseln' })).toBeEnabled();
    },
};

export const NoOpenCases: Story = {
    args: { openCases: 0 },
    play: async () => {
        const dialog = await openDialog();
        await expect(dialog.getByText('Es bleiben keine offenen Fälle beim bisherigen Träger zurück.')).toBeVisible();
    },
};

export const SomeOpenCases: Story = {
    args: { openCases: 12 },
    play: async () => {
        const dialog = await openDialog();
        await expect(
            dialog.getByText('12 offene Fälle bleiben beim bisherigen Träger „Caritas Augsburg“.'),
        ).toBeVisible();
    },
};

export const Saving: Story = {
    args: { step: 'saving' },
    play: async () => {
        const dialog = await openDialog();
        await expect(dialog.getByRole('button', { name: 'Träger wechseln' })).toBeDisabled();
        await expect(dialog.getByRole('button', { name: 'Zurück zum Bearbeiten' })).toBeDisabled();
    },
};

/** After the call the server's count is known: none left behind. */
export const DoneWithoutOpenCases: Story = {
    args: { step: 'done', result: { casesLeftWithPreviousTenant: 0, matrixAccessRevocationsQueued: 0 } },
    play: async () => {
        const dialog = await openDialog();
        await expect(dialog.getByText('Es blieben keine offenen Fälle beim bisherigen Träger zurück.')).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Fertig' })).toBeVisible();
    },
};

/** After the call: N cases stay with the old Träger until a colleague takes them over. */
export const DoneWithOpenCases: Story = {
    args: { step: 'done', result: { casesLeftWithPreviousTenant: 3, matrixAccessRevocationsQueued: 2 } },
    play: async () => {
        const dialog = await openDialog();
        await expect(
            dialog.getByText('3 offene Fälle bleiben beim bisherigen Träger „Caritas Augsburg“.'),
        ).toBeVisible();
        await expect(dialog.getByText(/„Zuordnung beendet“ übernehmen/)).toBeVisible();
        await expect(dialog.getByText(/Zugriff auf 2 Chaträume/)).toBeVisible();
    },
};

/** A refusal keeps the edit: the reason shows in the dialog and "Zurück zum Bearbeiten" returns to the form. */
const refused = (error: ChangeTenantErrorCode, message: RegExp, retry: boolean): Story => ({
    args: { error },
    play: async () => {
        const dialog = await openDialog();
        await expect(dialog.getByRole('alert')).toHaveTextContent(message);
        await expect(dialog.getByRole('button', { name: 'Zurück zum Bearbeiten' })).toBeEnabled();
        if (retry) {
            await expect(dialog.getByRole('button', { name: 'Erneut versuchen' })).toBeEnabled();
        } else {
            await expect(dialog.queryByRole('button', { name: 'Erneut versuchen' })).toBeNull();
        }
    },
});

export const ErrorMultiTenancyOff = refused(
    CHANGE_TENANT_ERRORS.MULTI_TENANCY_OFF,
    /mehrere Träger nicht aktiviert/,
    false,
);
export const ErrorSameTraeger = refused(CHANGE_TENANT_ERRORS.SAME_TRAEGER, /gehört bereits zu diesem Träger/, false);
export const ErrorCentreOfOtherTraeger = refused(
    CHANGE_TENANT_ERRORS.CENTRE_OF_OTHER_TRAEGER,
    /nicht zum neuen Träger/,
    false,
);
export const ErrorTopicsNotCovered = refused(
    CHANGE_TENANT_ERRORS.TOPICS_NOT_COVERED,
    /nicht alle gewählten Themen/,
    false,
);
export const ErrorBadRequest = refused(CHANGE_TENANT_ERRORS.BAD_REQUEST, /Angaben wurden abgelehnt/, false);
export const ErrorNotPlatformAdmin = refused(
    CHANGE_TENANT_ERRORS.FORBIDDEN,
    /Nur Plattform-Administrator:innen/,
    false,
);
export const ErrorCounsellorNotFound = refused(CHANGE_TENANT_ERRORS.NOT_FOUND, /nicht gefunden/, false);
export const ErrorLastCounsellorOfCentre = refused(
    CHANGE_TENANT_ERRORS.LAST_COUNSELLOR_OF_CENTRE,
    /letzte Beratungsperson einer noch aktiven Beratungsstelle/,
    false,
);
export const ErrorAlsoAdmin = refused(CHANGE_TENANT_ERRORS.ALSO_ADMIN, /zusätzlich eine Administrationsrolle/, false);
export const ErrorConflict = refused(CHANGE_TENANT_ERRORS.CONFLICT, /so nicht möglich/, false);
export const ErrorIdentityProviderRefused = refused(
    CHANGE_TENANT_ERRORS.IDENTITY_PROVIDER_UNAVAILABLE,
    /Anmeldedienst hat den Wechsel abgelehnt/,
    true,
);
export const ErrorSessionExpired = refused(CHANGE_TENANT_ERRORS.SESSION_EXPIRED, /Sitzung ist abgelaufen/, false);
export const ErrorNoAnswer = refused(CHANGE_TENANT_ERRORS.NETWORK, /Keine Antwort vom Server/, true);
export const ErrorUnknown = refused(CHANGE_TENANT_ERRORS.UNKNOWN, /Wechsel ist fehlgeschlagen/, true);

export const Phone390: Story = {
    ...phone,
    ...SomeOpenCases,
};

export const Phone390Error: Story = {
    ...phone,
    ...ErrorLastCounsellorOfCentre,
};

export const Phone390Done: Story = {
    ...phone,
    ...DoneWithOpenCases,
};

export const English: Story = {
    beforeEach: english,
    args: { openCases: 12 },
    play: async () => {
        const dialog = await openDialog();
        await expect(dialog.getByText('12 open cases stay with the previous Träger “Caritas Augsburg”.')).toBeVisible();
        await expect(dialog.getByText(/“Assignment ended”/)).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Change Träger' })).toBeEnabled();
    },
};

export const EnglishNotCountedYet: Story = {
    beforeEach: english,
    play: async () => {
        const dialog = await openDialog();
        await expect(dialog.getByText('Open cases stay with the previous Träger “Caritas Augsburg”.')).toBeVisible();
    },
};

export const EnglishError: Story = {
    beforeEach: english,
    args: { error: CHANGE_TENANT_ERRORS.LAST_COUNSELLOR_OF_CENTRE },
    play: async () => {
        const dialog = await openDialog();
        await expect(dialog.getByRole('alert')).toHaveTextContent(/last one of a counselling centre/);
        await expect(dialog.getByRole('button', { name: 'Back to editing' })).toBeEnabled();
    },
};

export const EnglishDone: Story = {
    beforeEach: english,
    args: { step: 'done', result: { casesLeftWithPreviousTenant: 3, matrixAccessRevocationsQueued: 2 } },
    play: async () => {
        const dialog = await openDialog();
        await expect(dialog.getByText('3 open cases stay with the previous Träger “Caritas Augsburg”.')).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Done' })).toBeVisible();
    },
};

export const EnglishPhone390: Story = {
    ...phone,
    ...English,
};

/** Closing without saving: nothing was sent, the form stays. */
export const BackToEditing: Story = {
    play: async ({ args }) => {
        const dialog = await openDialog();
        await userEvent.click(dialog.getByRole('button', { name: 'Zurück zum Bearbeiten' }));
        await expect(args.onCancel).toHaveBeenCalledTimes(1);
        await expect(args.onConfirm).not.toHaveBeenCalled();
    },
};
