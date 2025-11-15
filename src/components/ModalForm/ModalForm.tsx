import { Form, Modal } from 'antd';
import React, { useState } from 'react';
import Title from 'antd/es/typography/Title';
import { useTranslation } from 'react-i18next';

import { ModalFormProps } from '../../types/modalForm';

const ModalForm = ({
    isModalCreateVisible,
    handleOnAddElement,
    handleCreateModalCancel,
    title,
    isInAddMode,
    renderFormFields,
    formData,
}: ModalFormProps) => {
    const [form] = Form.useForm();
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const { t } = useTranslation();

    return (
        <Modal
            destroyOnClose
            title={<Title level={2}>{title}</Title>}
            open={isModalCreateVisible}
            onOk={() => {
                form.validateFields().then((values) => {
                    handleOnAddElement(values);
                });
            }}
            onCancel={() => {
                form.resetFields();
                handleCreateModalCancel();
            }}
            okButtonProps={{
                disabled: buttonDisabled,
            }}
            okText={t('btn.ok.uppercase')}
        >
            {renderFormFields({ form, setButtonDisabled, isInAddMode, formData })}
        </Modal>
    );
};

export default ModalForm;
