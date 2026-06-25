import { Button, Form, message, Modal } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LabeledValue } from 'antd/lib/select';
import { SelectFormField } from '../SelectFormField';
import { useAgenciesData } from '../../hooks/useAgencysData';
import { convertToOptions } from '../../utils/convertToOptions';
import { grantConsultantIdentityData } from '../../api/admins/grantConsultantIdentityData';
import { isActiveDeleteDate } from '../../utils/deleteDate';

interface GrantConsultantIdentityModalProps {
    adminId: string;
    tenantId?: number | string;
    onSuccess?: () => void;
    disabled?: boolean;
}

interface GrantConsultantIdentityFormValues {
    agencies?: LabeledValue[];
}

export const GrantConsultantIdentityModal = ({
    adminId,
    tenantId,
    onSuccess,
    disabled,
}: GrantConsultantIdentityModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<GrantConsultantIdentityFormValues>();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: agenciesData, isLoading } = useAgenciesData({ pageSize: 10000 });

    const tenantIdNumber = tenantId !== undefined && tenantId !== null ? parseInt(`${tenantId}`, 10) : undefined;
    const availableAgencies = (agenciesData?.data || []).filter(
        (agency) =>
            isActiveDeleteDate(agency.deleteDate) &&
            (tenantIdNumber === undefined || agency.tenantId === tenantIdNumber),
    );

    const closeModal = () => {
        setOpen(false);
        form.resetFields();
    };

    const onConfirm = async () => {
        try {
            const values = await form.validateFields();
            const agencyIds = (values.agencies || []).map(({ value }) => `${value}`);

            setIsSubmitting(true);
            await grantConsultantIdentityData(adminId, {
                formalLanguage: true,
                agencyIds,
            });

            message.success({ content: t('message.grantConsultantIdentity.success'), duration: 3 });
            closeModal();
            onSuccess?.();
        } catch (error) {
            // Form validation errors carry an errorFields array — those are surfaced inline by antd,
            // so only show the API error toast for real request failures.
            if (error && typeof error === 'object' && 'errorFields' in error) {
                return;
            }
            message.error({ content: t('message.grantConsultantIdentity.error'), duration: 8 });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Button type="default" disabled={disabled} onClick={() => setOpen(true)}>
                {t('grantConsultantIdentity.button')}
            </Button>
            <Modal
                title={t('grantConsultantIdentity.modal.title')}
                open={open}
                centered
                destroyOnClose
                confirmLoading={isSubmitting}
                okText={t('grantConsultantIdentity.modal.confirm')}
                cancelText={t('btn.cancel')}
                onOk={onConfirm}
                onCancel={closeModal}
            >
                <Form form={form} layout="vertical">
                    <SelectFormField
                        name="agencies"
                        label="grantConsultantIdentity.modal.agencyLabel"
                        labelInValue
                        isMulti
                        required
                        loading={isLoading}
                        placeholder="plsSelect"
                        options={convertToOptions(availableAgencies, ['postcode', 'name', 'city'], 'id')}
                    />
                </Form>
            </Modal>
        </>
    );
};
