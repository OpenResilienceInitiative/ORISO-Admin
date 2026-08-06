import type { ReactNode } from 'react';
import { GdprIcon, ImprintIcon } from '../CustomIcons/LegalIcons';
import { Modal } from '../Modal';
import { useLegalNoticeContent, type LegalNoticeKind } from './legalNoticeContent';
import styles from './legalNoticeDialog.module.scss';

export interface LegalNoticeDialogProps {
    kind: LegalNoticeKind;
    onClose: () => void;
}

/**
 * The product's own legal icons (Icons Master File, 40px grid) — the exact ones
 * the legal editor cards use for the same two documents. A generic MUI gavel
 * stood here before, which is a courtroom, not an imprint or a privacy notice,
 * and it was the only icon on the public surface that came from outside the
 * ORISO set.
 */
const LEGAL_NOTICE_ICONS: Record<LegalNoticeKind, ReactNode> = {
    imprint: <ImprintIcon />,
    privacy: <GdprIcon />,
};

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
            icon={LEGAL_NOTICE_ICONS[kind]}
            width={640}
            showDivider={false}
            /* `btn.close` did not exist in any locale, so the action rendered
               the raw key. `footer.legal.close` is the key that was actually
               translated for this dialog. */
            cancelLabelKey="footer.legal.close"
            onClose={onClose}
        >
            {/* The published legal texts are far longer than the placeholder
                copy, so the text scrolls inside the sheet — title, icon and the
                close action stay put instead of being pushed off-screen.

                The tab stop is WCAG 2.1.1, not decoration: without it a
                keyboard-only user cannot scroll the rest of a legal text at
                all — the very content this dialog exists for. The lint rule
                does not know the region scrolls, so it is disabled here only. */}
            {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
            <div
                className={styles.body}
                data-testid={`legal-notice-${kind}`}
                role="region"
                aria-label={title}
                tabIndex={0}
            >
                {paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                ))}
            </div>
            {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
        </Modal>
    );
};

export default LegalNoticeDialog;
