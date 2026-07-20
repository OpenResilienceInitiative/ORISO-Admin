import { notification } from 'antd';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useTranslation } from 'react-i18next';
import { useDeleteTenantAdmin } from '../../../../../hooks/useDeleteTenantAdmin';
import { Modal } from '../../../../../components/Modal';
import { CounselorData } from '../../../../../types/counselor';

interface DeleteTenantAdminModalProps {
    user: CounselorData;
    onClose: () => void;
}

export const DeleteTenantAdminModal = ({ user, onClose }: DeleteTenantAdminModalProps) => {
    const { t } = useTranslation();
    const { mutate: deleteAdmin } = useDeleteTenantAdmin({
        onSuccess: () => {
            notification.success({
                message: t('tenantAdmins.delete.success'),
            });
            onClose();
        },
    });

    return (
        <Modal
            titleKey="tenantAdmins.delete.description"
            titleKeyOptions={{ name: `${user.firstname} ${user.lastname}`.trim() }}
            icon={<DeleteOutlineOutlinedIcon />}
            cancelLabelKey="btn.cancel.uppercase"
            okLabelKey="delete"
            onConfirm={() => deleteAdmin(user.id)}
            onClose={onClose}
        />
    );
};
