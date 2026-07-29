import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import { Modal } from '../Modal';
import { useLegalNoticeContent, type LegalNoticeKind } from './legalNoticeContent';
import styles from './legalNoticeDialog.module.scss';

export interface LegalNoticeDialogProps {
    kind: LegalNoticeKind;
    onClose: () => void;
}

/**
 * The text box behind the footer's Imprint / Privacy entries (#594.15b).
 *
 * It is the shared M3 dialog (`components/Modal`) — the product's reference
 * sheet — so the public surface gets the same anatomy as every confirm dialog
 * in the admin. The copy comes from {@link useLegalNoticeContent}, which is the
 * single seam for swapping the placeholder text for the stored legal texts.
 */
export const LegalNoticeDialog = ({ kind, onClose }: LegalNoticeDialogProps) => {
    const { title, paragraphs } = useLegalNoticeContent(kind);

    return (
        <Modal
            title={title}
            icon={<GavelOutlinedIcon />}
            width={640}
            showDivider={false}
            cancelLabelKey="btn.close"
            onClose={onClose}
        >
            <div className={styles.body} data-testid={`legal-notice-${kind}`}>
                {paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                ))}
            </div>
        </Modal>
    );
};

export default LegalNoticeDialog;
