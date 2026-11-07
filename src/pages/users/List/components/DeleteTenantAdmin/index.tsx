import { notification } from 'antd';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useTranslation } from 'react-i18next';
import { useDeleteTenantAdmin } from '../../../../../hooks/useDeleteTenantAdmin';
import { Modal } from '../../../../../components/Modal';
import { CounselorData } from '../../../../../types/counselor';

interface DeleteTenantAdminModalProps {
    user: CounselorData;
    onClose: () => void;
    isPlatformAdmin: boolean;
}

export const DeleteTenantAdminModal = ({ user, onClose, isPlatformAdmin }: DeleteTenantAdminModalProps) => {
    const { t } = useTranslation();
    const labelScope = isPlatformAdmin ? 'platformAdmins' : 'tenantAdmins';
    const { mutate: deleteAdmin } = useDeleteTenantAdmin({
        onSuccess: () => {
            notification.success({
                message: t(`${labelScope}.delete.success`),
            });
            onClose();
        },
    });

    return (
        <Modal
            titleKey={`${labelScope}.delete.description`}
            titleKeyOptions={{ name: `${user.firstname} ${user.lastname}`.trim() }}
            icon={<DeleteOutlineOutlinedIcon />}
            cancelLabelKey="btn.cancel.uppercase"
            okLabelKey="delete"
            onConfirm={() => deleteAdmin(user.id)}
            onClose={onClose}
        />
    );
};
