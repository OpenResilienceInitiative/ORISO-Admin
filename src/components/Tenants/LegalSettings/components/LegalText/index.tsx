import set from 'lodash.set';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { Modal, ModalProps } from '../../../../Modal';
import { TranslatableFormField } from '../../../../TranslatableFormField';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';
import FormPluginEditor from '../../../../FormPluginEditor/FormPluginEditor';

interface LegalTextProps {
    tenantId: string | number;
    fieldName: string[];
    titleKey: string;
    subTitle: string | React.ReactChild;
    placeHolderKey: string;
    showConfirmationModal?: Omit<ModalProps, 'onClose' | 'onConfirm'> & { field: string[] };
    placeholders?: { [key: string]: string };
}

export const LegalText = ({
    tenantId,
    fieldName,
    titleKey,
    subTitle,
    placeHolderKey,
    showConfirmationModal,
    placeholders,
}: LegalTextProps) => {
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate: updateTenant } = useTenantAdminDataMutation({ id: tenantId });
    const [formDataContent, setFormData] = useState<Record<string, unknown>>();
    const [modalVisible, setModalVisible] = useState(false);

    const onConfirm = useCallback(() => {
        updateTenant(set(formDataContent, showConfirmationModal.field, false));
        setModalVisible(false);
    }, [formDataContent]);

    const onCancel = useCallback(() => {
        updateTenant(set(formDataContent, showConfirmationModal.field, true));
        setModalVisible(false);
    }, [formDataContent]);

    return (
        <>
            <CardEditable
                allowUnsavedChanges
                isLoading={isLoading}
                initialValues={{ ...data }}
                titleKey={titleKey}
                subTitle={subTitle}
                className={styles.card}
                onSave={(formData) => {
                    if (showConfirmationModal) {
                        setFormData(formData as Record<string, unknown>);
                        setModalVisible(true);
                    } else {
                        updateTenant(formData);
                    }
                }}
            >
                <TranslatableFormField name={fieldName}>
                    <FormPluginEditor
                        placeholder={t(placeHolderKey)}
                        placeholders={placeholders}
                        itemProps={{
                            rules: [{ required: true }],
                        }}
                    />
                </TranslatableFormField>
            </CardEditable>
            {showConfirmationModal && modalVisible && (
                <Modal {...showConfirmationModal} onConfirm={onConfirm} onClose={onCancel} />
            )}
        </>
    );
};
