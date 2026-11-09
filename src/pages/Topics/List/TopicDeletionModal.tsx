import { useCallback } from 'react';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useTranslation } from 'react-i18next';
import { snackbar } from '../../../components/Snackbar';
import { deleteTopicData } from '../../../api/topic/deleteTopicData';
import { Modal } from '../../../components/Modal';

export const TopicDeletionModal = ({ id, onClose }: { id: number; onClose: () => void }) => {
    const { t } = useTranslation();
    const handleOnDelete = useCallback(() => {
        deleteTopicData(id).then(() => {
            snackbar.success({
                content: t('message.topic.delete'),
                duration: 3,
            });
            onClose();
        });
    }, []);

    return (
        <Modal
            titleKey="topic.modal.headline.delete"
            icon={<DeleteOutlineOutlinedIcon />}
            contentKey="topic.modal.text.delete"
            cancelLabelKey="btn.cancel.uppercase"
            okLabelKey="btn.ok.uppercase"
            onConfirm={handleOnDelete}
            onClose={onClose}
        />
    );
};
