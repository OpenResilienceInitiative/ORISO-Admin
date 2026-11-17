import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useTranslation } from 'react-i18next';
import { FETCH_ERRORS } from '../../../../../api/fetchData';
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
    const { mutate: deleteReader, isPending } = useDeleteStatisticsReader({
        onSuccess: () => {
            snackbar.success({ message: t('statisticsReaders.delete.success') });
            onClose();
        },
        // An HTTP error already got its toast from fetchData (CATCH_ALL); a network failure or
        // timeout did not. Either way the dialog stays open so the admin can retry.
        onError: (error) => {
            if (error?.message !== FETCH_ERRORS.CATCH_ALL) {
                snackbar.error({ message: t('message.error.default') });
            }
        },
    });

    return (
        <Modal
            titleKey="statisticsReaders.delete.description"
            titleKeyOptions={{ name: `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() }}
            icon={<DeleteOutlineOutlinedIcon />}
            cancelLabelKey="btn.cancel.uppercase"
            okLabelKey="delete"
            confirmLoading={isPending}
            onConfirm={() => {
                if (!isPending) deleteReader(user.id);
            }}
            onClose={onClose}
        />
    );
};
