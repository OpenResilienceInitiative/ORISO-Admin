import type { ReactNode, Ref } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';

const UploadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden width="18" height="18">
        <path d="M12 3l4 4h-3v6h-2V7H8l4-4zM5 18v2h14v-2H5z" fill="currentColor" />
    </svg>
);

export interface ImageUploadFieldProps {
    /** Preview image; a placeholder is shown when absent. */
    previewSrc?: string;
    alt?: string;
    /** Optional heading beside the preview (e.g. "Own picture"). */
    title?: ReactNode;
    onUpload?: () => void;
    uploadLabel?: string;
    /** Helper text under the row. */
    helper?: ReactNode;
    shape?: 'rounded' | 'circle';
    className?: string;
    /** Disables the upload action (read-only form, a pending save). */
    disabled?: boolean;
    /** Lets the owner return focus to the upload action after an asynchronous step. */
    uploadButtonRef?: Ref<HTMLButtonElement>;
    /** Further actions under the upload button (e.g. save or remove the photo). */
    actions?: ReactNode;
}

const Placeholder = () => (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={styles.placeholder}>
        <path d="M24 10l7 12H17l7-12zM15 26a5 5 0 100 10 5 5 0 000-10zM28 27h9v9h-9z" fill="currentColor" />
    </svg>
);

/**
 * M3 image upload field (Figma Admin.ORISO — Avatar "Own picture" 1-34788,
 * Individuelle Bilder 1-34189): a preview tile next to an upload action, with
 * optional heading and helper text.
 */
export const ImageUploadField = ({
    previewSrc,
    alt = '',
    title,
    onUpload,
    uploadLabel = 'Upload',
    helper,
    shape = 'rounded',
    className,
    disabled = false,
    uploadButtonRef,
    actions,
}: ImageUploadFieldProps) => (
    <div className={classNames(styles.field, className)}>
        <div className={styles.row}>
            <div className={classNames(styles.preview, styles[shape])}>
                {previewSrc ? <img src={previewSrc} alt={alt} className={styles.image} /> : <Placeholder />}
            </div>
            <div className={styles.side}>
                {title && <span className={styles.title}>{title}</span>}
                <button
                    ref={uploadButtonRef}
                    type="button"
                    className={styles.uploadButton}
                    onClick={onUpload}
                    disabled={disabled}
                >
                    <UploadIcon />
                    {uploadLabel}
                </button>
                {actions && <div className={styles.actions}>{actions}</div>}
            </div>
        </div>
        {helper && <span className={styles.helper}>{helper}</span>}
    </div>
);
