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
 * What this surface does not offer, stated rather than left out, so the difference from the page
 * form is a decision that can be revisited. The remarks are gated by role below, not hidden.
 */
const PERSONAL_EXCLUSIONS: readonly ConsultantFieldName[] = [];

const SETTINGS_EXCLUSIONS: readonly ConsultantFieldName[] = [
    // ADR-008: a standing supervisor is attached to an existing counsellor, and
    // `addCounselorData` carries no such field — a switch here would do nothing.
    'isSupervisor',
    // `absenceMessage` travels on the create path too: UserService refuses a blank note for an
    // absent counsellor there as well, so the switch would otherwise be unsaveable.
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
 * The values an untouched form submits — the same defaults `buildQuickCreateConsultantData`
 * falls back to, written once so switch and wire cannot drift apart.
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
     * A create request is in flight. A REF, not `isPending`: state becomes true only after a
     * re-render, and the second click of a double click arrives before that. A duplicate costs
     * a second Keycloak account and a second Matrix identity.
     */
    const isSaving = useRef(false);
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
                 * Save and keep going: the counsellor is reported to the agency form and the
                 * form returns to its defaults. `resetFields` also clears the touched flag, so
                 * closing afterwards raises no false unsaved-changes warning.
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

    // The one gate every submission passes: footer buttons and Enter both land here. The lock is
    // taken synchronously, before `mutate`, so two submissions in one tick produce ONE consultant.
    const startSaving = (values: Record<string, unknown>, createAnother: boolean) => {
        if (isSaving.current) {
            return;
        }
        isSaving.current = true;
        keepOpenAfterSave.current = createAnother;
        mutate(buildQuickCreateConsultantData(values, tenantId, agencyId, topicIds) as unknown as CounselorData);
    };

    /*
     * Validated here rather than through `form.submit()`, so the button's intent travels with the
     * attempt as an argument. Held in a ref it is shared, and a rejection arriving late clears what
     * a newer attempt asked for. antd shows the field errors from the rejection itself; the lock is
     * not released, because it is only taken once an attempt is accepted.
     */
    const submit = (createAnother: boolean) => {
        if (isSaving.current) {
            return;
        }
        form.validateFields().then(
            (values) => startSaving(values as Record<string, unknown>, createAnother),
            () => undefined,
        );
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
                // Stated twice on purpose: a tooltip needs a hover that touch never delivers,
                // and a disabled button produces nothing when clicked. The text below is the
                // one that cannot be missed.
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
                            onFinish={(values) => startSaving(values, false)}
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
