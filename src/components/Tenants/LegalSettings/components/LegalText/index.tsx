import set from 'lodash.set';
import { Form, Spin } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalProps } from '../../../../Modal';
import { M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import { EditorHelpText } from '../../../../FormPluginEditor/EditorHelpText';
import FormPluginEditor from '../../../../FormPluginEditor/FormPluginEditor';
import { useLegalHelp } from '../../hooks/useLegalHelp';
import { isEmptyLegalContent } from '../../utils/legalHelpTexts';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import styles from './styles.module.scss';
import { PermissionAction } from '../../../../../enums/PermissionAction';
import { Resource } from '../../../../../enums/Resource';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';

interface LegalTextProps {
    tenantId: string | number;
    fieldName: string[];
    titleKey: string;
    /**
     * Which legal text this card edits — selects the role/state dependent help
     * texts (description + bold CTA tip, Figma 457-13255). When omitted, the
     * static `subTitle` is shown instead.
     */
    legalType?: 'privacy' | 'imprint';
    subTitle?: string | React.ReactElement<any> | number | string;
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
    legalType,
    subTitle,
    placeHolderKey,
    icon,
    showConfirmationModal,
    placeholders,
}: LegalTextProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { can } = useUserPermissions();
    const canEditLegalText = can(PermissionAction.Update, Resource.LegalText);
    const { data, isLoading, mutate: updateTenant, isPending } = useTenantAppearanceFormData(`${tenantId}`);
    const [activeLanguage, setActiveLanguage] = useState('de');
    const [formDataContent, setFormData] = useState<Record<string, unknown>>();
    const [modalVisible, setModalVisible] = useState(false);

    const languages = useMemo(() => data?.settings?.activeLanguages || ['de'], [data?.settings?.activeLanguages]);

    // Stored content for this legal text (language map or legacy string) — the
    // help texts distinguish "nothing published yet" from "text exists".
    const storedContent = useMemo(
        () => fieldName.reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], data),
        [data, fieldName],
    );
    const help = useLegalHelp(legalType ?? 'privacy', {
        empty: isEmptyLegalContent(storedContent),
        readOnly: !canEditLegalText,
    });

    const onConfirm = useCallback(() => {
        updateTenant(set(formDataContent, showConfirmationModal.field, false));
        setModalVisible(false);
    }, [formDataContent, showConfirmationModal, updateTenant]);

    const onCancel = useCallback(() => {
        updateTenant(set(formDataContent, showConfirmationModal.field, true));
        setModalVisible(false);
    }, [formDataContent, showConfirmationModal, updateTenant]);

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
                    readOnly={!canEditLegalText}
                    publishing={isPending}
                    versionLabel={t('legal.m3Editor.versionLabel')}
                    languages={languages.map((language) => ({
                        value: language,
                        label: t(`language.${language}`),
                    }))}
                    language={activeLanguage}
                    onLanguageChange={setActiveLanguage}
                    helpSlot={legalType && <EditorHelpText text={help.text} hint={help.hint} />}
                    aboveEditorSlot={
                        !legalType && subTitle ? <p className={styles.description}>{subTitle}</p> : undefined
                    }
                    editorSlot={
                        // Keep all language fields mounted so form state survives
                        // switching; FormPluginEditor preserves placeholders and
                        // heading anchors inside the M3 shell.
                        <>
                            {languages.map((language) => (
                                <div key={language} style={{ display: language === activeLanguage ? 'block' : 'none' }}>
                                    <FormPluginEditor
                                        name={[...fieldName, language]}
                                        placeholder={t(placeHolderKey)}
                                        placeholders={placeholders}
                                        itemProps={{}}
                                    />
                                </div>
                            ))}
                        </>
                    }
                    onPublish={canEditLegalText ? () => form.submit() : undefined}
                    belowSlot={
                        showConfirmationModal &&
                        modalVisible && <Modal {...showConfirmationModal} onConfirm={onConfirm} onClose={onCancel} />
                    }
                />
            </div>
        </Form>
    );
};
