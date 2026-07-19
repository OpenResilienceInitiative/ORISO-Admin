import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Modal } from '../../../Modal';

export interface UnsavedChangesProps {
    onConfirm: () => void;
    onClose: () => void;
}

export const UnsavedChangesModal = ({ onConfirm, onClose }: UnsavedChangesProps) => (
    // The emphasised (primary) action keeps the user in the editor; the secondary
    // action discards. onConfirm = "discard/leave", onClose = "keep editing".
    <Modal
        titleKey="overlay.unsaved.title"
        icon={<WarningAmberOutlinedIcon />}
        contentKey="overlay.unsaved.text"
        cancelLabelKey="overlay.unsaved.confirm"
        okLabelKey="overlay.unsaved.cancel"
        onConfirm={onClose}
        onClose={onConfirm}
    />
);
