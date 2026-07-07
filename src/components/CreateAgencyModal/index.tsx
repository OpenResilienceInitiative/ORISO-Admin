import { Alert, Button, Form, message, Modal, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UnsavedChangesModal } from '../CardEditable/components/UnsavedChanges';
import { FormInputField } from '../FormInputField';
import { useAgencyUpdate } from '../../hooks/useAgencyUpdate';
import { AgencyData } from '../../types/agency';
import { extractApiErrorMessage } from '../../utils/extractApiErrorMessage';

interface CreateAgencyModalProps {
    /**
     * Tenant the new agency will belong to. The trigger button is disabled
     * until a tenant is known (superadmins must pick one in the form first).
     */
    tenantId?: string | number;
    disabled?: boolean;
    onSuccess: (agency: Partial<AgencyData>) => void;
}

export const CreateAgencyModal = ({ tenantId, disabled, onSuccess }: CreateAgencyModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const { mutate, isPending } = useAgencyUpdate('add');

    const hasTenant = tenantId !== undefined && tenantId !== null && `${tenantId}` !== '' && `${tenantId}` !== '0';

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

    const onFinish = (values: Record<string, unknown>) => {
        mutate(
            {
                ...values,
                tenantId: Number(tenantId),
                // No consultant assigned yet, so the agency starts invisible in registration.
                offline: true,
                postCodes: [{ from: '00000', until: '99999' }],
            },
            {
                onSuccess: (agency) => {
                    message.success({ content: t('message.agency.add'), duration: 3 });
                    closeModal();
                    onSuccess(agency as Partial<AgencyData>);
                },
                onError: async (error) => {
                    const content = await extractApiErrorMessage(error);
                    message.error({ content, duration: 8 });
                },
            },
        );
    };

    const button = (
        <Button
            type="dashed"
            icon={<PlusOutlined />}
            block
            disabled={disabled || !hasTenant}
            onClick={() => setOpen(true)}
        >
            {t('counselor.form.createAgency.button')}
        </Button>
    );

    return (
        <>
            {!hasTenant && !disabled ? (
                <Tooltip title={t('counselor.form.createAgency.tenantFirst')}>
                    {/* span wrapper so the tooltip also works on the disabled button */}
                    <span style={{ display: 'block' }}>{button}</span>
                </Tooltip>
            ) : (
                button
            )}
            <Modal
                title={t('counselor.form.createAgency.title')}
                open={open}
                centered
                destroyOnClose
                confirmLoading={isPending}
                okText={t('counselor.form.createAgency.confirm')}
                cancelText={t('btn.cancel')}
                onOk={() => form.submit()}
                onCancel={requestClose}
            >
                {/* disabled={false} keeps the outer (read-only) form context from disabling these fields */}
                {/* onFinish also fires on Enter inside a field, not only via the OK button */}
                <Form form={form} layout="vertical" size="large" disabled={false} onFinish={onFinish}>
                    <Alert type="info" description={t('counselor.form.createAgency.offlineHint')} />
                    <br />
                    <FormInputField
                        name="name"
                        labelKey="agency.edit.general.general_information.name"
                        placeholderKey="agency.edit.general.general_information.name"
                        required
                        autoFocus
                    />
                    <FormInputField
                        name="postcode"
                        labelKey="agency.edit.general.address.postcode"
                        placeholderKey="agency.edit.general.address.postcode"
                        required
                        maxLength={5}
                        rules={[{ min: 5, required: true, message: t('agency.postcode.minimum') }]}
                    />
                    <FormInputField
                        name="city"
                        labelKey="agency.edit.general.address.city"
                        placeholderKey="agency.edit.general.address.city"
                        required
                    />
                </Form>
            </Modal>
            {showUnsavedWarning && (
                <UnsavedChangesModal onConfirm={closeModal} onClose={() => setShowUnsavedWarning(false)} />
            )}
        </>
    );
};
