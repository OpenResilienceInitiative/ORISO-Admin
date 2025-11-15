import { Col, notification, Row } from 'antd';
import { RuleRender } from 'rc-field-form/lib/interface';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../components/CardEditable';
import { FormInputPasswordField } from '../../../components/FormInputPasswordField';
import { useUpdateUserPassword } from '../../../hooks/useUpdateUserPassword.hook';
import { validatePasswordCriteria } from '../../../utils/validateInputValue';
import styles from './styles.module.scss';

export const PasswordChange = () => {
    const { t } = useTranslation();
    const { mutate: updateData } = useUpdateUserPassword({
        onSuccess: () => {
            notification.success({ message: t('profile.passwordChange.success') });
        },
        onError: () => {
            notification.error({ message: t('profile.passwordChange.error') });
        },
    });

    const requiredPasswordChars: RuleRender = () => ({
        validator(_, value) {
            if (value && validatePasswordCriteria(value)) {
                return Promise.resolve();
            }
            return Promise.reject(new Error(t('profile.passwordChange.error.passwordInsecure')));
        },
    });

    const passwordConfirmationRule: RuleRender = ({ getFieldValue }) => ({
        validator(_, value) {
            if (!value || getFieldValue('newPassword') === value) {
                return Promise.resolve();
            }
            return Promise.reject(new Error(t('profile.passwordChange.error.passwordsNotMatch')));
        },
    });

    return (
        <CardEditable
            titleKey="profile.passwordChange.title"
            subTitleKey="profile.passwordChange.info"
            saveKey="profile.passwordChange.save"
            onSave={(data, opts) => updateData(data as any, opts)}
            editButton={<span className={styles.editButton}>{t('profile.passwordChange.editButton')}</span>}
        >
            {({ editing }) =>
                editing && (
                    <>
                        <Row gutter={[16, 16]}>
                            <Col span={12} sm={6}>
                                <FormInputPasswordField
                                    name="oldPassword"
                                    placeholderKey="profile.passwordChange.form.currentPassword"
                                    required
                                />
                            </Col>
                        </Row>

                        <p className={styles.passwordRequirementsInfo}>
                            <strong>{t('profile.passwordChange.passwordRequirementsInfo')}</strong>
                        </p>
                        <ul className={styles.passwordRequirementsList}>
                            <li>{t('profile.passwordChange.passwordRequirementsInfo.step1')}</li>
                            <li>{t('profile.passwordChange.passwordRequirementsInfo.step2')}</li>
                            <li>{t('profile.passwordChange.passwordRequirementsInfo.step3')}</li>
                            <li>{t('profile.passwordChange.passwordRequirementsInfo.step4')}</li>
                        </ul>

                        <Row gutter={[16, 16]}>
                            <Col span={12} sm={6}>
                                <FormInputPasswordField
                                    name="newPassword"
                                    placeholderKey="profile.passwordChange.form.newPassword"
                                    required
                                    rules={[requiredPasswordChars]}
                                />
                            </Col>
                            <Col span={12} sm={6}>
                                <FormInputPasswordField
                                    name="passwordConfirmation"
                                    placeholderKey="profile.passwordChange.form.passwordConfirmation"
                                    required
                                    dependencies={['newPassword']}
                                    rules={[passwordConfirmationRule]}
                                />
                            </Col>
                        </Row>
                    </>
                )
            }
        </CardEditable>
    );
};
