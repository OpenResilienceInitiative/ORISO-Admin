import { message, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import Title from 'antd/lib/typography/Title';
import deleteAgencyData from '../../../../api/agency/deleteAgencyData';
import { AgencyData } from '../../../../types/agency';

export const AgencyDeletionModal = ({ agencyModel, onClose }: { agencyModel: AgencyData; onClose: () => void }) => {
    const { t } = useTranslation();
    const handleOnDelete = () => {
        deleteAgencyData(agencyModel)
            .then(() => {
                message.success({
                    content: t('message.agency.delete'),
                    duration: 3,
                });
            })
            .finally(() => onClose());
    };

    return (
        <Modal
            title={<Title level={2}>{t('agency.modal.headline.delete')}</Title>}
            open
            onOk={handleOnDelete}
            onCancel={() => onClose()}
            cancelText={t('btn.cancel.uppercase')}
            centered
            okText={t('agency.modal.btn.ok.uppercase')}
        >
            <p>{t('agency.modal.text.delete')}</p>
        </Modal>
    );
};
