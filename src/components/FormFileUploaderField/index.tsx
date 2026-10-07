import classNames from 'classnames';
import { ConfigProvider, Form, message, Upload } from 'antd';
import { useTranslation } from 'react-i18next';
import { UploadFileProps } from '../../types/uploadFiles';
import decodeHTML from '../../utils/decodeHTML';
import getBase64 from '../../utils/getBase64';
import { normalizeIconDataUrl } from '../../utils/normalizeIconDataUrl';
import styles from './styles.module.scss';

interface FormFileUploaderFieldProps {
    className?: string;
    labelKey?: string;
    name?: string | string[];
    allowIcon?: boolean;
    allowAssistantIcon?: boolean;
    tooltip?: string;
    disabled?: boolean;
}

interface FormRichTextEditorProps {
    onChange?: (value: string) => void;
    value?: string;
    allowIcon: boolean;
    allowAssistantIcon?: boolean;
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

const FormFileUploaderLocal = ({
    onChange,
    value,
    allowIcon,
    allowAssistantIcon,
    disabled,
}: FormRichTextEditorProps) => {
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
        if (
            !(allowAssistantIcon ? ['image/png', 'image/svg+xml'].includes(file.type) : isAcceptedFile(file, allowIcon))
        ) {
            message.error(t(allowAssistantIcon ? 'settings.assistant.invalid' : 'message.error.upload.filetype'));
            return false;
        }
        const isLarger500kb = file.size / 1024 > 512;

        if (isLarger500kb) {
            message.error(t('message.error.upload.filesize'));
            return false;
        }

        // The stored value is what later becomes `link[rel=icon][href]`, so an
        // .ico whose MIME type the host could not map has to be relabelled here
        // rather than admitted by loosening `getSafeFaviconUrl`.
        getBase64(file, (result) => {
            if (allowAssistantIcon && file.type === 'image/svg+xml') {
                const source = new TextDecoder().decode(
                    Uint8Array.from(atob(result.split(',')[1]), (character) => character.charCodeAt(0)),
                );
                const document = new DOMParser().parseFromString(source, 'image/svg+xml');
                const allowed = new Set([
                    'svg',
                    'g',
                    'path',
                    'rect',
                    'circle',
                    'ellipse',
                    'line',
                    'polyline',
                    'polygon',
                    'title',
                    'desc',
                ]);
                const attributes = new Set([
                    'xmlns',
                    'viewBox',
                    'width',
                    'height',
                    'x',
                    'y',
                    'x1',
                    'x2',
                    'y1',
                    'y2',
                    'cx',
                    'cy',
                    'r',
                    'rx',
                    'ry',
                    'd',
                    'points',
                    'fill',
                    'fill-rule',
                    'clip-rule',
                    'stroke',
                    'stroke-width',
                    'stroke-linecap',
                    'stroke-linejoin',
                    'opacity',
                    'fill-opacity',
                    'stroke-opacity',
                    'transform',
                    'version',
                    'id',
                ]);
                const safe =
                    !/<!DOCTYPE|<!ENTITY/i.test(source) &&
                    document.documentElement.tagName === 'svg' &&
                    Array.from(document.querySelectorAll('*')).every(
                        (element) =>
                            allowed.has(element.tagName) &&
                            Array.from(element.attributes).every(
                                (attribute) =>
                                    attributes.has(attribute.name) && !/url\(|javascript:/i.test(attribute.value),
                            ),
                    );
                if (!safe) {
                    message.error(t('settings.assistant.invalid'));
                    return;
                }
            }
            onChange(normalizeIconDataUrl(result, file.name));
        });
        return false;
    };

    return (
        <Upload
            name="upload"
            listType="picture-card"
            className="fileUploader"
            accept={allowAssistantIcon ? '.svg,.png,image/svg+xml,image/png' : acceptedFormats(allowIcon)}
            showUploadList={false}
            beforeUpload={beforeUpload}
            disabled={isDisabled}
        >
            {value ? (
                <img src={decodeHTML(value)} className={styles.image} alt="" />
            ) : (
                <div className={styles.uploadButton}>{t('btn.upload')}</div>
            )}
        </Upload>
    );
};

export const FormFileUploaderField = ({
    name,
    labelKey,
    className,
    allowIcon,
    allowAssistantIcon,
    tooltip,
    disabled,
}: FormFileUploaderFieldProps) => {
    const { t } = useTranslation();
    return (
        <Form.Item
            name={name}
            label={t(labelKey)}
            className={classNames(className, styles.richEditor)}
            tooltip={tooltip}
        >
            <FormFileUploaderLocal allowIcon={allowIcon} allowAssistantIcon={allowAssistantIcon} disabled={disabled} />
        </Form.Item>
    );
};
