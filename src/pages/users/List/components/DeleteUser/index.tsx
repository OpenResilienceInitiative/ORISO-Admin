import { message, notification, Checkbox } from 'antd';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useTranslation } from 'react-i18next';
import { useCallback, useId, useState } from 'react';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import i18next from 'i18next';
import { useDeleteConsultantOrAgencyAdmin } from '../../../../../hooks/useDeleteConsultantOrAdmin';
import { Modal } from '../../../../../components/Modal';
import { Text } from '../../../../../components/text/Text';
import { FETCH_ERRORS, X_REASON } from '../../../../../api/fetchData';
import { extractApiErrorReason } from '../../../../../utils/extractApiErrorMessage';
import { IdentityRemovalNotice } from '../IdentityRemovalNotice';
import { useIdentityRemovalPolicy } from '../../../../../hooks/useIdentityRemovalPolicy';
import {
    hasVerifiedAccountOperationRefusal,
    isTerminalAccountOperationRefusal,
} from '../../../../../utils/accountOperationIntent';

interface DeleteUserModalProps {
    typeOfUser: 'consultants' | 'admins';
    deleteUserId: string;
    hasOtherIdentity?: boolean;
    onClose: () => void;
}

export const DeleteUserModal = ({ typeOfUser, deleteUserId, hasOtherIdentity, onClose }: DeleteUserModalProps) => {
    const { t } = useTranslation();
    const [hasSessions, setHasSessions] = useState(false);
    const [lastConsultantOfAgency, setLastConsultantOfAgency] = useState(false);
    const [force, setForce] = useState(false);
    const [failure, setFailure] = useState<string>();
    const policy = useIdentityRemovalPolicy(deleteUserId, typeOfUser === 'admins', hasOtherIdentity);
    const guardId = useId();
    const { mutate: deleteConsultant, isPending } = useDeleteConsultantOrAgencyAdmin({
        typeOfUser,
        onSuccess: () => {
            message.success({
                content: t(
                    typeOfUser === 'consultants'
                        ? 'message.counselor.delete.success'
                        : 'identityRemoval.administrator.success',
                ),
                duration: 3,
            });
            onClose();
        },
        onError: async (error: Error | Response) => {
            if (error instanceof Error && error.message === FETCH_ERRORS.REQUEST_IDENTITY_CHANGED) {
                setFailure('accountOperation.identityChanged');
                return;
            }
            if (error instanceof Error && error.message === FETCH_ERRORS.ACCOUNT_COMMANDS_UNAVAILABLE) {
                setFailure('identityRemoval.retryUnavailable');
                return;
            }
            if (
                (policy.scoped && !hasVerifiedAccountOperationRefusal(error)) ||
                !isTerminalAccountOperationRefusal(error)
            ) {
                setFailure('accountOperation.outcomeUnknown');
                return;
            }
            setFailure(undefined);
            if (error instanceof Response) {
                const reason = await extractApiErrorReason(error);
                switch (reason) {
                    case X_REASON.CONSULTANT_HAS_ACTIVE_OR_ARCHIVE_SESSIONS:
                        notification.error({
                            message: t('message.counselor.delete.error.hasSessions'),
                        });
                        setHasSessions(true);
                        break;
                    case X_REASON.CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE:
                        notification.error({
                            message: t('message.counselor.delete.error.lastConsultantOfAgency'),
                        });
                        setLastConsultantOfAgency(true);
                        break;
                    default:
                        message.error({
                            content: i18next.t([`message.error.${reason}`, 'message.error.default']) as string,
                            duration: 3,
                        });
                }
            }
        },
    });

    const onChange = useCallback((e: CheckboxChangeEvent) => {
        setForce(e.target.checked);
    }, []);

    const deleteLabelKey = hasSessions ? 'forceDelete' : 'delete';

    return (
        <Modal
            titleKey={
                typeOfUser === 'consultants' ? 'counselor.modal.headline.delete' : 'identityRemoval.administrator.title'
            }
            icon={<DeleteOutlineOutlinedIcon />}
            closable={false}
            cancelLabelKey="btn.cancel.uppercase"
            // The confirm action is hidden entirely for the last consultant of an
            // agency (no valid delete), else labelled force/normal delete.
            okLabelKey={lastConsultantOfAgency ? undefined : deleteLabelKey}
            confirmDisabled={!!policy.unavailableReason || isPending || (hasSessions && !force)}
            confirmDescribedBy={policy.unavailableReason ? guardId : undefined}
            onConfirm={() => {
                if (!policy.unavailableReason && !isPending && (!hasSessions || force)) {
                    setFailure(undefined);
                    deleteConsultant({ id: deleteUserId, forceDelete: hasSessions });
                }
            }}
            onClose={onClose}
        >
            <p>
                {t(
                    typeOfUser === 'consultants'
                        ? 'counselor.modal.text.delete.text'
                        : 'identityRemoval.administrator.confirm',
                )}
            </p>
            {policy.scoped && (
                <IdentityRemovalNotice
                    removing={typeOfUser === 'consultants' ? 'consultant' : 'administrator'}
                    hasOtherIdentity={hasOtherIdentity}
                />
            )}
            {policy.unavailableReason && <p id={guardId}>{t(policy.unavailableReason)}</p>}
            {failure && <p role="alert">{t(failure)}</p>}

            {hasSessions && !lastConsultantOfAgency && (
                <Checkbox onChange={onChange} checked={force}>
                    <Text text={t('counselor.modal.text.delete.error.hasSessions')} type="error" />
                </Checkbox>
            )}

            {lastConsultantOfAgency && (
                <Text text={t('counselor.modal.text.delete.error.lastConsultantOfAgency')} type="error" />
            )}
        </Modal>
    );
};
