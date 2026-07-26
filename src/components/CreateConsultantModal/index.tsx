import { Button, Form, message, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FETCH_ERRORS, X_REASON } from '../../api/fetchData';
import { UnsavedChangesModal } from '../CardEditable/components/UnsavedChanges';
import { FormInputField } from '../FormInputField';
import { FormInputPasswordField } from '../FormInputPasswordField';
import { Modal, DialogButton } from '../Modal';
import { TypeOfUser } from '../../enums/TypeOfUser';
import { useAddOrUpdateConsultantOrAdmin } from '../../hooks/useAddOrUpdateConsultantOrAgencyAdmin';
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
    formalLanguage: true,
    tenantId: `${tenantId}`,
    agencyIds: normalizeNumericIds([agencyId]),
    topicIds: normalizeNumericIds(topicIds),
});

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
    const [open, setOpen] = useState(false);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

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
            message.success({ content: t('message.counselor.add'), duration: 3 });
            closeModal();
            onSuccess(consultant as CounselorData);
        },
        onError: async (error: Error | Response) => {
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

    const onFinish = (values: Record<string, unknown>) => {
        mutate(buildQuickCreateConsultantData(values, tenantId, agencyId, topicIds) as unknown as CounselorData);
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
                <Tooltip title={t(disabledTooltipKey)}>
                    {/* span wrapper so the tooltip also works on the disabled button */}
                    <span style={{ display: 'block' }}>{button}</span>
                </Tooltip>
            ) : (
                button
            )}
            {open && (
                <Modal
                    titleKey="agency.form.registrationSettings.createConsultant.title"
                    icon={<PersonAddOutlinedIcon />}
                    footer={
                        <div className={styles.footerActions}>
                            <DialogButton onClick={requestClose} disabled={isPending}>
                                {t('btn.cancel')}
                            </DialogButton>
                            <DialogButton primary loading={isPending} onClick={() => form.submit()}>
                                {t('agency.form.registrationSettings.createConsultant.confirm')}
                            </DialogButton>
                        </div>
                    }
                    onClose={requestClose}
                >
                    {/* disabled={false} keeps the outer (read-only) form context from disabling these fields */}
                    {/* onFinish also fires on Enter inside a field, not only via the OK button */}
                    <Form form={form} layout="vertical" size="large" disabled={false} onFinish={onFinish}>
                        <FormInputField
                            name="firstname"
                            labelKey="firstname"
                            placeholderKey="placeholder.firstname"
                            required
                            autoFocus
                        />
                        <FormInputField
                            name="lastname"
                            labelKey="lastname"
                            placeholderKey="placeholder.lastname"
                            required
                        />
                        <FormInputField
                            name="email"
                            labelKey="email"
                            placeholderKey="placeholder.email"
                            rules={[
                                {
                                    required: true,
                                    type: 'email',
                                    message: t('message.error.email.incorrect'),
                                },
                            ]}
                        />
                        <FormInputField
                            name="username"
                            labelKey="counselor.username"
                            placeholderKey="placeholder.username"
                            rules={[
                                {
                                    required: true,
                                    message: t('message.error.username.required'),
                                },
                                {
                                    pattern: /^[a-z0-9_-]+$/,
                                    message: t('message.error.username.format'),
                                },
                            ]}
                        />
                        <FormInputPasswordField
                            name="password"
                            labelKey="counselor.password"
                            placeholderKey="placeholder.password"
                            required
                            rules={[
                                {
                                    min: 8,
                                    message: t('message.error.password.minLength'),
                                },
                                {
                                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
                                    message: t('message.error.password.policy'),
                                },
                            ]}
                        />
                        <FormInputPasswordField
                            name="passwordConfirmation"
                            labelKey="counselor.passwordConfirmation"
                            placeholderKey="placeholder.password"
                            required
                            dependencies={['password']}
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(
                                            new Error(t('profile.passwordChange.error.passwordsNotMatch')),
                                        );
                                    },
                                }),
                            ]}
                        />
                    </Form>
                </Modal>
            )}
            {showUnsavedWarning && (
                <UnsavedChangesModal onConfirm={closeModal} onClose={() => setShowUnsavedWarning(false)} />
            )}
        </>
    );
};
