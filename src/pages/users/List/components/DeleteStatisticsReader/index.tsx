import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useTranslation } from 'react-i18next';
import { snackbar } from '../../../../../components/Snackbar';
import { Modal } from '../../../../../components/Modal';
import { useDeleteStatisticsReader } from '../../../../../hooks/useStatisticsReaders';
import { CounselorData } from '../../../../../types/counselor';

interface DeleteStatisticsReaderModalProps {
    user: CounselorData;
    onClose: () => void;
}

/** Confirms before a Statistik-Leser·in account is deleted (ORISO-UserService#1666). */
export const DeleteStatisticsReaderModal = ({ user, onClose }: DeleteStatisticsReaderModalProps) => {
    const { t } = useTranslation();
    const { mutate: deleteReader } = useDeleteStatisticsReader({
        onSuccess: () => {
            snackbar.success({ message: t('statisticsReaders.delete.success') });
            onClose();
        },
    });

    return (
        <Modal
            titleKey="statisticsReaders.delete.description"
            titleKeyOptions={{ name: `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() }}
            icon={<DeleteOutlineOutlinedIcon />}
            cancelLabelKey="btn.cancel.uppercase"
            okLabelKey="delete"
            onConfirm={() => deleteReader(user.id)}
            onClose={onClose}
        />
    );
};
