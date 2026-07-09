import set from 'lodash.set';
import { Form, Spin } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalProps } from '../../../../Modal';
import { M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminData } from '../../../../../hooks/useTenantAdminData.hook';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';

interface LegalTextProps {
    tenantId: string | number;
    fieldName: string[];
    titleKey: string;
    subTitle: string | React.ReactElement<any> | number | string;
    placeHolderKey: string;
    /** Header icon for the M3 shell; defaults to the Impressum fingerprint. */
    icon?: React.ElementType;
    showConfirmationModal?: Omit<ModalProps, 'onClose' | 'onConfirm'> & { field: string[] };
    placeholders?: { [key: string]: string };
}

/**
 * Imprint / privacy card in the M3 editor shell (Figma Admin.ORISO 1-53274).
 * The editing engine stays the Form-bound TiptapEditor (per active language, with
 * the placeholder plugin and anchor navigation) mounted via the shell's editorSlot,
 * and saving keeps the tenant-admin mutation incl. the optional confirmation modal.
 */
export const LegalText = ({
    tenantId,
    fieldName,
    titleKey,
    subTitle,
    placeHolderKey,
    icon,
    showConfirmationModal,
}: LegalTextProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { can } = useUserPermissions();
    const canEditLegalText = can(PermissionAction.Update, Resource.LegalText);
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { data: tenantData } = useTenantAdminData();
    const { mutate: updateTenant, isPending } = useTenantAdminDataMutation({ id: tenantId });
    const [activeLanguage, setActiveLanguage] = useState('de');
    const [formDataContent, setFormData] = useState<Record<string, unknown>>();
    const [modalVisible, setModalVisible] = useState(false);
    // Content of the language currently shown in the native M3 editor. Reads the
    // form store so switching languages re-syncs the editor to that language's text.
    const activeContent = Form.useWatch([...fieldName, activeLanguage], form);

    const languages = useMemo(
        () => tenantData?.settings?.activeLanguages || ['de'],
        [tenantData?.settings?.activeLanguages],
    );

    const onConfirm = useCallback(() => {
        updateTenant(set(formDataContent, showConfirmationModal.field, false));
        setModalVisible(false);
    }, [formDataContent]);

    const onCancel = useCallback(() => {
        updateTenant(set(formDataContent, showConfirmationModal.field, true));
        setModalVisible(false);
    }, [formDataContent]);

    const onFinish = useCallback(
        (formData: Record<string, unknown>) => {
            if (showConfirmationModal) {
                setFormData(formData);
                setModalVisible(true);
            } else {
                updateTenant(formData);
            }
        },
        [showConfirmationModal, updateTenant],
    );

    if (isLoading) {
        return (
            <div className={styles.card}>
                <Spin />
            </div>
        );
    }

    return (
        <Form form={form} initialValues={{ ...data }} onFinish={onFinish} disabled={!canEditLegalText}>
            <div className={styles.card}>
                <M3RichTextEditor
                    title={t(titleKey)}
                    icon={icon}
                    value={typeof activeContent === 'string' ? activeContent : ''}
                    onChange={
                        canEditLegalText
                            ? (html) => form.setFieldValue([...fieldName, activeLanguage], html)
                            : undefined
                    }
                    placeholder={t(placeHolderKey)}
                    readOnly={!canEditLegalText}
                    publishing={isPending}
                    versionLabel={t('legal.m3Editor.versionLabel')}
                    languages={languages.map((language) => ({
                        value: language,
                        label: t(`language.${language}`),
                    }))}
                    language={activeLanguage}
                    onLanguageChange={setActiveLanguage}
                    aboveEditorSlot={<p className={styles.description}>{subTitle}</p>}
                    onPublish={canEditLegalText ? () => form.submit() : undefined}
                    belowSlot={
                        showConfirmationModal &&
                        modalVisible && <Modal {...showConfirmationModal} onConfirm={onConfirm} onClose={onCancel} />
                    }
                />
                {/* Registered (hidden) fields per language so `form.submit()` still
                    collects every language's content — the native M3 editor above
                    drives these via setFieldValue for the active language. */}
                {languages.map((language) => (
                    <Form.Item key={language} name={[...fieldName, language]} noStyle>
                        <input type="hidden" />
                    </Form.Item>
                ))}
            </div>
        </Form>
    );
};
