import { Form, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { DialogButton, Modal } from '../../../../Modal';
import { MuiFormField } from '../../../../mui/MuiFormField';
import { berlinSigningDeadline } from '../../../../../utils/dpaSigningDeadline';

export const DpaPublishDeadlineDialog = ({
    onConfirm,
    onCancel,
    publishing = false,
}: {
    onConfirm: (signingDeadlineAt: string) => void;
    onCancel: () => void;
    publishing?: boolean;
}) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const confirm = () => {
        const deadline = berlinSigningDeadline(form.getFieldValue('deadline') ?? '');
        if (!deadline) {
            form.setFields([{ name: 'deadline', errors: [t('legal.dpa.deadline.invalid')] }]);
            return;
        }
        onConfirm(deadline);
    };
    return (
        <Modal
            titleKey="legal.dpa.deadline.publishTitle"
            descriptionKey="legal.dpa.deadline.publishDescription"
            onClose={() => {
                if (!publishing) onCancel();
            }}
            closable={!publishing}
            maskClosable={!publishing}
            keyboard={!publishing}
            footer={
                <Space>
                    <DialogButton onClick={onCancel} disabled={publishing}>
                        {t('cancel')}
                    </DialogButton>
                    <DialogButton primary loading={publishing} onClick={confirm}>
                        {t('legal.m3Editor.publish')}
                    </DialogButton>
                </Space>
            }
        >
            <Form
                form={form}
                onValuesChange={() => form.setFields([{ name: 'deadline', errors: [] }])}
                initialValues={{ deadline: '' }}
            >
                <MuiFormField
                    name="deadline"
                    label={t('legal.dpa.deadline.input')}
                    type="datetime-local"
                    disabled={publishing}
                    helpText={t('legal.dpa.deadline.zone')}
                    inputProps={{ required: true, autoFocus: true }}
                />
            </Form>
        </Modal>
    );
};
