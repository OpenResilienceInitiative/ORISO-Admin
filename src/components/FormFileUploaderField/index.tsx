import type { ReactNode } from 'react';
import classNames from 'classnames';
import { ConfigProvider, Form, Upload } from 'antd';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { useTranslation } from 'react-i18next';
import { snackbar } from '../Snackbar';
import { UploadFileProps, UploadValidationPolicy } from '../../types/uploadFiles';
import decodeHTML from '../../utils/decodeHTML';
import getBase64 from '../../utils/getBase64';
import { normalizeIconDataUrl } from '../../utils/normalizeIconDataUrl';
import styles from './styles.module.scss';

interface FormFileUploaderFieldProps {
    className?: string;
    /**
     * Shows the field as one row of an image list (preview, name, size, purpose, add/replace action)
     * instead of the clickable picture card.
     */
    row?: ImageRowDetails;
    labelKey?: string;
    name?: string | string[];
    allowIcon?: boolean;
    uploadPolicy?: UploadValidationPolicy;
    tooltip?: string;
    disabled?: boolean;
}

interface FormRichTextEditorProps {
    onChange?: (value: string) => void;
    value?: string;
    allowIcon: boolean;
    uploadPolicy?: UploadValidationPolicy;
    disabled?: boolean;
}

const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png'];
// Browsers disagree about .ico: Chrome reports image/vnd.microsoft.icon, Firefox
// image/x-icon, and a host without a mapping for the extension reports an empty
// string. The card offers ICO for the favicon, so the extension has to count too.
const ICON_MIME_TYPES = ['image/x-icon', 'image/vnd.microsoft.icon'];

const isAcceptedFile = (file: UploadFileProps, allowIcon: boolean) => {
    if (PHOTO_MIME_TYPES.includes(file.type)) {
        return true;
    }

    return allowIcon && (ICON_MIME_TYPES.includes(file.type) || /\.ico$/i.test(file.name ?? ''));
};

// Keeps the file picker in step with what beforeUpload accepts, so a rejected
// file is the exception rather than the way users discover the rules.
const acceptedFormats = (allowIcon: boolean) =>
    allowIcon ? '.jpg,.jpeg,.png,.ico,image/jpeg,image/png,image/x-icon' : '.jpg,.jpeg,.png,image/jpeg,image/png';

/**
 * The checks every picked file passes before it lands in the form: type, size and, for the assistant
 * icon, the passive-SVG policy. Shared by the picture-card uploader and the image list row.
 */
const useCheckedUpload = ({
    onChange,
    allowIcon,
    uploadPolicy,
    disabled,
}: {
    onChange?: (value: string) => void;
    allowIcon: boolean;
    uploadPolicy?: UploadValidationPolicy;
    disabled?: boolean;
}) => {
    const { t } = useTranslation();
    // CardEditable disables its <Form> while the card is in view mode, which antd
    // publishes as `componentDisabled`. antd merges `customDisabled ?? contextDisabled`,
    // so passing an explicit `false` here would shadow that and leave the uploader
    // clickable outside edit mode — the picked file would then land in the form state
    // with no way to save it. Merge both instead of forwarding the prop alone.
    const { componentDisabled } = ConfigProvider.useConfig();
    const isDisabled = disabled || componentDisabled;

    const beforeUpload = (file: UploadFileProps) => {
        if (isDisabled) {
            return false;
        }
        if (!(uploadPolicy ? uploadPolicy.mimeTypes.includes(file.type) : isAcceptedFile(file, allowIcon))) {
            snackbar.error(t(uploadPolicy ? uploadPolicy.invalidMessageKey : 'message.error.upload.filetype'));
            return false;
        }
        const isLarger500kb = file.size / 1024 > 512;

        if (isLarger500kb) {
            snackbar.error(t('message.error.upload.filesize'));
            return false;
        }

        // The stored value is what later becomes `link[rel=icon][href]`, so an
        // .ico whose MIME type the host could not map has to be relabelled here
        // rather than admitted by loosening `getSafeFaviconUrl`.
        getBase64(
            file,
            (result) => {
                if (uploadPolicy) {
                    const safe = uploadPolicy.validate(result, file);
                    if (!safe) {
                        snackbar.error(t(uploadPolicy.invalidMessageKey));
                        return;
                    }
                }
                onChange(normalizeIconDataUrl(result, file.name));
            },
            () => {
                snackbar.error(t(uploadPolicy?.invalidMessageKey ?? 'message.error.upload.filetype'));
            },
        );
        return false;
    };

    return {
        beforeUpload,
        isDisabled,
        accept: uploadPolicy ? uploadPolicy.accept : acceptedFormats(allowIcon),
    };
};

const FormFileUploaderLocal = ({ onChange, value, allowIcon, uploadPolicy, disabled }: FormRichTextEditorProps) => {
    const { t } = useTranslation();
    const { beforeUpload, isDisabled, accept } = useCheckedUpload({ onChange, allowIcon, uploadPolicy, disabled });

    return (
        <Upload
            name="upload"
            listType="picture-card"
            className="fileUploader"
            accept={accept}
            showUploadList={false}
            beforeUpload={beforeUpload}
            disabled={isDisabled}
        >
            {value && (!uploadPolicy || uploadPolicy.canPreview(decodeHTML(value))) ? (
                <img src={decodeHTML(value)} className={styles.image} alt="" />
            ) : (
                <div className={styles.uploadButton}>{t('btn.upload')}</div>
            )}
        </Upload>
    );
};

export interface ImageRowDetails {
    /** The image's name, also used in the add/replace action ("Logo ersetzen"). */
    title: string;
    /** Recommended size, e.g. "512 × 512 px". */
    size?: string;
    /**
     * The row sits in a `TileSections` panel that already names the image (and its size) and draws
     * the surface: no title line and no background of its own.
     */
    inSection?: boolean;
    /** Where the image appears and what may be uploaded, one short line. */
    description: ReactNode;
    /** Extra class for the preview box, e.g. to show a favicon at its real size. */
    previewClassName?: string;
}

const ImageRowLocal = ({
    onChange,
    value,
    allowIcon,
    uploadPolicy,
    disabled,
    title,
    size,
    description,
    previewClassName,
    inSection = false,
}: FormRichTextEditorProps & ImageRowDetails) => {
    const { t } = useTranslation();
    const { beforeUpload, isDisabled, accept } = useCheckedUpload({ onChange, allowIcon, uploadPolicy, disabled });
    // A field may also hold something that is not an image (the assistant's preset id): no preview then.
    const decoded = value ? decodeHTML(value) : undefined;
    const src = decoded && (!uploadPolicy || uploadPolicy.canPreview(decoded)) ? decoded : undefined;

    return (
        // The host measures the row's own width, so it stacks in a narrow tile on a wide screen too.
        <div className={styles.imageRowHost}>
            <div className={classNames(styles.imageRow, { [styles.imageRowInSection]: inSection })}>
                <span className={classNames(styles.rowPreview, previewClassName, { [styles.rowPreviewEmpty]: !src })}>
                    {src ? <img src={src} alt={title} /> : <ImageOutlinedIcon aria-hidden="true" />}
                </span>
                <span className={styles.rowText}>
                    {!inSection && (
                        <span className={styles.rowTitle}>
                            {title}
                            {size && <span className={styles.rowSize}>{size}</span>}
                        </span>
                    )}
                    <span className={styles.rowDescription}>{description}</span>
                    {!src && <span className={styles.rowEmpty}>{t('settings.images.empty')}</span>}
                </span>
                {/* Only while editing: in read mode the row is a plain record, a press on it points at "Bearbeiten". */}
                {!isDisabled && (
                    <Upload
                        name="upload"
                        className={styles.rowAction}
                        accept={accept}
                        showUploadList={false}
                        beforeUpload={beforeUpload}
                    >
                        {/* antd's text-type Upload expects its own control inside and opens the picker on its click. */}
                        <button type="button" className={styles.rowActionButton}>
                            <FileUploadOutlinedIcon aria-hidden="true" />
                            {t(src ? 'settings.images.replace' : 'settings.images.add', { name: title })}
                        </button>
                    </Upload>
                )}
            </div>
        </div>
    );
};

export const FormFileUploaderField = ({
    name,
    labelKey,
    className,
    allowIcon,
    uploadPolicy,
    tooltip,
    disabled,
    row,
}: FormFileUploaderFieldProps) => {
    const { t } = useTranslation();
    return (
        <Form.Item
            name={name}
            // A row names the image itself; a label above it would say it twice.
            label={row ? undefined : t(labelKey)}
            className={classNames(className, styles.richEditor)}
            tooltip={tooltip}
        >
            {row ? (
                <ImageRowLocal allowIcon={allowIcon} uploadPolicy={uploadPolicy} disabled={disabled} {...row} />
            ) : (
                <FormFileUploaderLocal allowIcon={allowIcon} uploadPolicy={uploadPolicy} disabled={disabled} />
            )}
        </Form.Item>
    );
};
