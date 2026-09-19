import { Button, Form, message, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { ThemeProvider } from '@mui/material/styles';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FETCH_ERRORS, X_REASON } from '../../api/fetchData';
import { UnsavedChangesModal } from '../CardEditable/components/UnsavedChanges';
import { ConsultantPersonalFields, ConsultantSettingsFields, type ConsultantFieldName } from '../ConsultantFields';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { Modal, DialogButton } from '../Modal';
import { TypeOfUser } from '../../enums/TypeOfUser';
import { useAddOrUpdateConsultantOrAdmin } from '../../hooks/useAddOrUpdateConsultantOrAgencyAdmin';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { ADMIN_REMARKS_ROLES } from '../../utils/adminRemarksRoles';
import { CounselorData } from '../../types/counselor';
import { extractApiErrorMessage } from '../../utils/extractApiErrorMessage';
import styles from './styles.module.scss';

interface CreateConsultantModalProps {
    /**
     * Tenant the new consultant will belong to. The trigger button is disabled
     * until a tenant is known (superadmins must pick one in the agency form first).
     */
    tenantId?: string | number;
    agencyId?: string | number;
    topicIds?: Array<string | number>;
    disabled?: boolean;
    disabledReasonKey?: string;
    onSuccess: (consultant: CounselorData) => void;
}

/**
 * What this surface does NOT offer, and why. Stated rather than simply left
 * out, so the difference from the page form (src/pages/users/Edit) is a
 * decision someone made and can revisit — the reason the field set lives in
 * one shared module in the first place.
 *
 * The remarks used to be listed here unconditionally, "because this dialog
 * opens from the agency screen". That is a role question, and the dialog can
 * ask it: hiding the field from everyone answered it with the most restrictive
 * case for all of them, and brought back the very divergence between the two
 * surfaces that this module exists to remove. It is gated below instead.
 */
const PERSONAL_EXCLUSIONS: readonly ConsultantFieldName[] = [];

const SETTINGS_EXCLUSIONS: readonly ConsultantFieldName[] = [
    // ADR-008: a standing supervisor is attached to an existing counsellor, and
    // `addCounselorData` carries no such field — a switch here would do nothing.
    'isSupervisor',
    // Same reason: the create request drops `absenceMessage` (only
    // `editCounselorData` sends it). `absent` itself IS carried, so the flag
    // stays and the note is set on the next edit.
    'absenceMessage',
];

/** Tenant, agency and topics are injected from the agency being edited, not asked for. */
const normalizeNumericIds = (values: Array<string | number | undefined>): number[] => [
    ...new Set(values.map(Number).filter((value) => Number.isFinite(value) && value > 0)),
];

export const buildQuickCreateConsultantData = (
    values: Record<string, unknown>,
    tenantId?: string | number,
    agencyId?: string | number,
    topicIds: Array<string | number> = [],
) => ({
    ...values,
    // Tone used to be hardcoded here, so a counsellor created from the agency screen
    // always got the formal address regardless of what the tenant uses. It is a field
    // now; this stays as the default for an untouched form.
    formalLanguage: values.formalLanguage ?? true,
    absent: values.absent ?? false,
    isGroupchatConsultant: values.isGroupchatConsultant ?? false,
    tenantId: `${tenantId}`,
    agencyIds: normalizeNumericIds([agencyId]),
    topicIds: normalizeNumericIds(topicIds),
});

/**
 * The switches are rendered, so antd registers them and `onFinish` carries
 * them whether or not the admin touched one. These are the values an untouched
 * form submits — the same defaults `buildQuickCreateConsultantData` falls back
 * to, written down once so the switch on screen and the value on the wire can
 * never drift apart.
 */
const INITIAL_VALUES = {
    formalLanguage: true,
    isGroupchatConsultant: false,
    absent: false,
};

export const CreateConsultantModal = ({
    tenantId,
    agencyId,
    topicIds,
    disabled,
    disabledReasonKey,
    onSuccess,
}: CreateConsultantModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    // Same gate as the page form, from the same list (AuthenticatedUser#hasTenantLevelAdminRole).
    const { hasRole } = useUserRoles();
    const canManageAdminRemarks = hasRole(ADMIN_REMARKS_ROLES);
    const personalExclusions = useMemo<readonly ConsultantFieldName[]>(
        () => (canManageAdminRemarks ? PERSONAL_EXCLUSIONS : [...PERSONAL_EXCLUSIONS, 'adminRemarks']),
        [canManageAdminRemarks],
    );
    const [open, setOpen] = useState(false);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    /**
     * A create request is in flight. A REF, not `isPending`: state becomes true
     * only after React has re-rendered, and the second click of a double click
     * arrives before that. Since this dialog exists to be submitted over and
     * over ("save and create another"), rapid repeated submission is the
     * intended rhythm, not an edge case — and a duplicate here costs a second
     * Keycloak account, a second Matrix identity and a second set of agency
     * relations, all removed by hand.
     */
    const isSaving = useRef(false);
    /**
     * What the button the admin pressed asked for. Read ONCE, at the moment a
     * submission is accepted, and cleared there — so a press that was turned
     * away, or a bare Enter, cannot decide the fate of a save already running.
     */
    const requestedKeepOpen = useRef(false);
    /** The intent of the submission actually in flight. */
    const keepOpenAfterSave = useRef(false);

    const closeModal = () => {
        setOpen(false);
        setShowUnsavedWarning(false);
        form.resetFields();
    };

    // X, Esc, mask click and the cancel button all funnel through here; a
    // touched form gets the unsaved-changes warning instead of silently closing.
    const requestClose = () => {
        if (form.isFieldsTouched()) {
            setShowUnsavedWarning(true);
            return;
        }
        closeModal();
    };

    const { mutate, isPending } = useAddOrUpdateConsultantOrAdmin({
        typeOfUser: TypeOfUser.Consultants,
        onSuccess: (consultant) => {
            isSaving.current = false;
            message.success({ content: t('message.counselor.add'), duration: 3 });
            const createAnother = keepOpenAfterSave.current;
            keepOpenAfterSave.current = false;

            if (createAnother) {
                /*
                 * The Jira pattern the owner asked for: the counsellor is saved
                 * and reported to the agency form (which appends them to its
                 * selection list), the dialog stays open and the form goes back
                 * to its defaults for the next person. `resetFields` restores
                 * `initialValues` AND clears the touched flag, so closing
                 * straight after no longer raises a false unsaved-changes
                 * warning about someone who is already stored.
                 */
                form.resetFields();
                onSuccess(consultant as CounselorData);
                return;
            }

            closeModal();
            onSuccess(consultant as CounselorData);
        },
        onError: async (error: Error | Response) => {
            // Nothing is reset here on purpose: a failed save must not cost the
            // admin everything they typed. The lock is released, though — the
            // attempt is over and the admin has to be able to try again.
            isSaving.current = false;
            keepOpenAfterSave.current = false;

            if (error instanceof Response) {
                const reason = error.headers.get(FETCH_ERRORS.X_REASON);
                if (
                    reason === X_REASON.EMAIL_NOT_AVAILABLE ||
                    reason === X_REASON.USERNAME_NOT_AVAILABLE ||
                    reason === X_REASON.NUMBER_OF_LICENSES_EXCEEDED ||
                    reason === X_REASON.PASSWORD_NOT_VALID
                ) {
                    message.error({ content: t(`message.error.${reason}`), duration: 8 });
                    return;
                }
            }

            const content = await extractApiErrorMessage(error);
            message.error({ content, duration: 8 });
        },
    });

    const hasTenant = tenantId !== undefined && tenantId !== null && `${tenantId}` !== '' && `${tenantId}` !== '0';

    /*
     * The one gate every submission passes through: the footer buttons and the
     * form's own Enter handling both land here, after validation. Taking the
     * lock synchronously, before `mutate`, is what makes two submissions
     * dispatched in the same tick produce ONE consultant — by the time a state
     * flag could have disabled anything, both are already past.
     */
    const onFinish = (values: Record<string, unknown>) => {
        if (isSaving.current) {
            return;
        }
        isSaving.current = true;
        keepOpenAfterSave.current = requestedKeepOpen.current;
        requestedKeepOpen.current = false;
        mutate(buildQuickCreateConsultantData(values, tenantId, agencyId, topicIds) as unknown as CounselorData);
    };

    const submit = (createAnother: boolean) => {
        if (isSaving.current) {
            return;
        }
        requestedKeepOpen.current = createAnother;
        form.submit();
    };

    /*
     * Nothing was saved, so the intent expires with the attempt. Leaving the
     * flag set would hand it to whatever submits next — Enter inside a field,
     * which has always meant plain create — and the dialog would then stay
     * open on a save the admin expected to finish.
     *
     * The lock is NOT released here. It is only ever taken in `onFinish`, so
     * this either runs before any save (nothing to release) or for a second,
     * rejected attempt while the first is still running — where releasing it
     * would reopen the very hole this closes.
     */
    const onFinishFailed = () => {
        requestedKeepOpen.current = false;
    };

    const disabledTooltipKey =
        disabledReasonKey || (!hasTenant ? 'agency.form.registrationSettings.createConsultant.tenantFirst' : undefined);

    const button = (
        <Button
            type="dashed"
            icon={<PlusOutlined />}
            block
            disabled={disabled || !hasTenant}
            onClick={() => setOpen(true)}
        >
            {t('agency.form.registrationSettings.createConsultant.button')}
        </Button>
    );

    return (
        <>
            {disabledTooltipKey ? (
                // The reason is stated twice on purpose. A tooltip on a disabled button needs
                // a hover the pointer may never deliver -- there is none on touch, and clicking
                // a disabled button produces nothing at all, which is what the admin actually
                // tries. The text below the button is the one that cannot be missed; the
                // tooltip stays for the pointer users who do hover.
                <Tooltip title={t(disabledTooltipKey)}>
                    {/* span wrapper so the tooltip also works on the disabled button */}
                    <span style={{ display: 'block' }}>
                        {button}
                        <span className={styles.disabledReason} role="note">
                            {t(disabledTooltipKey)}
                        </span>
                    </span>
                </Tooltip>
            ) : (
                button
            )}
            {open && (
                <Modal
                    titleKey="agency.form.registrationSettings.createConsultant.title"
                    descriptionKey="agency.form.registrationSettings.createConsultant.description"
                    descriptionFullWidth
                    icon={<PersonAddOutlinedIcon />}
                    // The full field set in two columns needs a working surface, not a
                    // confirm-dialog column.
                    width={920}
                    className={styles.dialog}
                    footer={
                        <div className={styles.footerActions}>
                            <DialogButton onClick={requestClose} disabled={isPending}>
                                {t('btn.cancel')}
                            </DialogButton>
                            <DialogButton loading={isPending} onClick={() => submit(true)}>
                                {t('agency.form.registrationSettings.createConsultant.confirmAndNext')}
                            </DialogButton>
                            <DialogButton primary loading={isPending} onClick={() => submit(false)}>
                                {t('agency.form.registrationSettings.createConsultant.confirm')}
                            </DialogButton>
                        </div>
                    }
                    onClose={requestClose}
                >
                    <ThemeProvider theme={orisoMuiTheme}>
                        {/* disabled={false} keeps the outer (read-only) form context from disabling these fields */}
                        <Form
                            form={form}
                            layout="vertical"
                            disabled={false}
                            initialValues={INITIAL_VALUES}
                            onFinish={onFinish}
                            onFinishFailed={onFinishFailed}
                        >
                            <div className={styles.columns}>
                                <ConsultantPersonalFields exclude={personalExclusions} autoFocusFirstField />
                                <ConsultantSettingsFields exclude={SETTINGS_EXCLUSIONS} />
                            </div>
                            {/*
                              The footer actions live outside the <form> and submit it
                              programmatically, which leaves the form with no submit
                              button — and a form without one does not implicitly submit
                              on Enter. This restores that: Enter inside a field means
                              the plain create, the same as the primary action.
                            */}
                            <button
                                type="submit"
                                className={styles.enterSubmit}
                                tabIndex={-1}
                                aria-hidden
                                disabled={isPending}
                            >
                                {t('agency.form.registrationSettings.createConsultant.confirm')}
                            </button>
                        </Form>
                    </ThemeProvider>
                </Modal>
            )}
            {showUnsavedWarning && (
                <UnsavedChangesModal onConfirm={closeModal} onClose={() => setShowUnsavedWarning(false)} />
            )}
        </>
    );
};
