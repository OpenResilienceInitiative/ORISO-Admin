import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Modal } from '../../../Modal';

export interface UnsavedChangesProps {
    /** User confirms the destructive action (discard/leave) — fires from the primary button only. */
    onConfirm: () => void;
    /** User dismisses the warning and keeps editing — fires from Cancel, the mask, Esc and the close X. */
    onClose: () => void;
}

export const UnsavedChangesModal = ({ onConfirm, onClose }: UnsavedChangesProps) => (
    // Never let an incidental dismiss (mask click / Esc / the X) be destructive: only
    // the explicit, primary-coloured "Verwerfen" button may discard. Everything else
    // — Cancel, mask, Esc, X — is the safe "keep editing" path.
    <Modal
        titleKey="overlay.unsaved.title"
        icon={<WarningAmberOutlinedIcon />}
        contentKey="overlay.unsaved.text"
        cancelLabelKey="overlay.unsaved.cancel"
        okLabelKey="overlay.unsaved.confirm"
        onConfirm={onConfirm}
        onClose={onClose}
    />
);
