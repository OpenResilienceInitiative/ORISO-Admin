import { useEffect } from 'react';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Modal } from '../../../../../components/Modal';

export interface NoTopicConfirmProps {
    onConfirm: () => void;
    onClose: () => void;
}

export const NoTopicConfirmModal = ({ onConfirm, onClose }: NoTopicConfirmProps) => {
    useEffect(() => {
        const cancel = document.querySelector('.ant-modal-footer button');
        (cancel as HTMLButtonElement | null)?.focus();
    }, []);

    return (
        <Modal
            titleKey="agency.form.registrationSettings.noTopicConfirm.title"
            icon={<WarningAmberOutlinedIcon />}
            contentKey="agency.form.registrationSettings.noTopicConfirm.text"
            cancelLabelKey="agency.form.registrationSettings.noTopicConfirm.cancel"
            okLabelKey="agency.form.registrationSettings.noTopicConfirm.confirm"
            onConfirm={onConfirm}
            onClose={onClose}
        />
    );
};
