import { message } from 'antd';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useTranslation } from 'react-i18next';
import deleteAgencyData from '../../../../api/agency/deleteAgencyData';
import { Modal } from '../../../../components/Modal';
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
            titleKey="agency.modal.headline.delete"
            icon={<DeleteOutlineOutlinedIcon />}
            contentKey="agency.modal.text.delete"
            cancelLabelKey="btn.cancel.uppercase"
            okLabelKey="agency.modal.btn.ok.uppercase"
            onConfirm={handleOnDelete}
            onClose={onClose}
        />
    );
};
