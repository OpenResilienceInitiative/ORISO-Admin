import { Alert, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SupportTarget } from '../../../hooks/useSupportAccess';

interface RequestSupportAccessModalProps {
    target: SupportTarget | null;
    pending: boolean;
    errorMessage?: string | null;
    onCancel: () => void;
    onSubmit: (credentials: { password: string; otp: string }) => void;
}

/**
 * Fresh re-authentication before asking for support access (ADR-018 §1). Password and OTP live only
 * inside this form: the fields are cleared whenever the dialog closes, and the caller drops the
 * values as soon as the request is away, so nothing survives the five-minute waiting window.
 */
export const RequestSupportAccessModal = ({
    target,
    pending,
    errorMessage,
    onCancel,
    onSubmit,
}: RequestSupportAccessModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<{ password: string; otp: string }>();

    useEffect(() => {
        if (!target) {
            form.resetFields();
        }
    }, [target, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        onSubmit({ password: values.password, otp: values.otp });
        form.resetFields();
    };

    const targetName = [target?.firstName, target?.lastName].filter(Boolean).join(' ') || target?.email;

    return (
        <Modal
            open={Boolean(target)}
            title={t('supportAccess.request.title')}
            okText={t('supportAccess.request.submit')}
            cancelText={t('btn.cancel.uppercase')}
            confirmLoading={pending}
            onCancel={() => {
                form.resetFields();
                onCancel();
            }}
            onOk={handleOk}
            destroyOnHidden
        >
            <p>{t('supportAccess.request.description', { name: targetName, agencyId: target?.agencyId })}</p>
            {errorMessage && <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} />}
            <Form form={form} layout="vertical" requiredMark={false}>
                <Form.Item
                    name="password"
                    label={t('supportAccess.request.password')}
                    rules={[{ required: true, message: t('supportAccess.request.password.required') }]}
                >
                    <Input.Password autoComplete="off" data-cy="support-request-password" />
                </Form.Item>
                <Form.Item
                    name="otp"
                    label={t('supportAccess.request.otp')}
                    rules={[{ required: true, message: t('supportAccess.request.otp.required') }]}
                >
                    <Input autoComplete="one-time-code" inputMode="numeric" data-cy="support-request-otp" />
                </Form.Item>
            </Form>
        </Modal>
    );
};
