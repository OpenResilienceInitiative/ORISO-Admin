import { notification } from 'antd';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useTranslation } from 'react-i18next';
import { useId, useState } from 'react';
import { useDeleteTenantAdmin } from '../../../../../hooks/useDeleteTenantAdmin';
import { Modal } from '../../../../../components/Modal';
import { CounselorData } from '../../../../../types/counselor';
import { IdentityRemovalNotice, otherIdentityFromRow } from '../IdentityRemovalNotice';
import { useIdentityRemovalPolicy } from '../../../../../hooks/useIdentityRemovalPolicy';
import {
    hasVerifiedAccountOperationRefusal,
    isTerminalAccountOperationRefusal,
} from '../../../../../utils/accountOperationIntent';

interface DeleteTenantAdminModalProps {
    user: CounselorData;
    onClose: () => void;
}

export const DeleteTenantAdminModal = ({ user, onClose }: DeleteTenantAdminModalProps) => {
    const { t } = useTranslation();
    const hasOtherIdentity = otherIdentityFromRow(user);
    const policy = useIdentityRemovalPolicy(user.id, true, hasOtherIdentity);
    const guardId = useId();
    const [failure, setFailure] = useState<string>();
    const { mutate: deleteAdmin, isPending } = useDeleteTenantAdmin({
        onSuccess: () => {
            notification.success({
                message: t('tenantAdmins.delete.success'),
            });
            onClose();
        },
        onError: (error) => {
            if (error instanceof Error && error.message === 'ACCOUNT_COMMANDS_UNAVAILABLE') {
                setFailure('identityRemoval.retryUnavailable');
            } else if (
                (policy.scoped && !hasVerifiedAccountOperationRefusal(error)) ||
                !isTerminalAccountOperationRefusal(error)
            ) {
                setFailure('accountOperation.outcomeUnknown');
            } else {
                setFailure('message.error.default');
            }
        },
    });

    return (
        <Modal
            titleKey="tenantAdmins.delete.description"
            titleKeyOptions={{ name: `${user.firstname} ${user.lastname}`.trim() }}
            icon={<DeleteOutlineOutlinedIcon />}
            cancelLabelKey="btn.cancel.uppercase"
            okLabelKey="delete"
            confirmDisabled={!!policy.unavailableReason || isPending}
            confirmDescribedBy={policy.unavailableReason ? guardId : undefined}
            onConfirm={() => {
                if (!policy.unavailableReason && !isPending) {
                    setFailure(undefined);
                    deleteAdmin(user.id);
                }
            }}
            onClose={onClose}
        >
            <IdentityRemovalNotice removing="administrator" hasOtherIdentity={hasOtherIdentity} />
            {policy.unavailableReason && <p id={guardId}>{t(policy.unavailableReason)}</p>}
            {failure && <p role="alert">{t(failure)}</p>}
        </Modal>
    );
};
