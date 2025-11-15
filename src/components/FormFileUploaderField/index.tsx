import classNames from 'classnames';
import { Form, message, Upload } from 'antd';
import { useTranslation } from 'react-i18next';
import { UploadFileProps } from '../../types/uploadFiles';
import decodeHTML from '../../utils/decodeHTML';
import getBase64 from '../../utils/getBase64';
import styles from './styles.module.scss';

interface FormFileUploaderFieldProps {
    className?: string;
    labelKey?: string;
    name?: string | string[];
    allowIcon?: boolean;
    tooltip?: string;
}

interface FormRichTextEditorProps {
    onChange?: (value: string) => void;
    value?: string;
    allowIcon: boolean;
}

const FormFileUploaderLocal = ({ onChange, value, allowIcon }: FormRichTextEditorProps) => {
    const { t } = useTranslation();

    const beforeUpload = (file: UploadFileProps) => {
        const isJpgOrPng =
            file.type === 'image/jpeg' ||
            file.type === 'image/png' ||
            (allowIcon && (file.type === 'image/x-icon' || file.type === 'image/vnd.microsoft.icon'));
        if (!isJpgOrPng) {
            message.error(t('message.error.upload.filetype'));
            return false;
        }
        const isLarger500kb = file.size / 1024 > 512;

        if (isLarger500kb) {
            message.error(t('message.error.upload.filesize'));
            return false;
        }

        getBase64(file, onChange);
        return false;
    };

    return (
        <Upload
            name="upload"
            listType="picture-card"
            className="fileUploader"
            showUploadList={false}
            beforeUpload={beforeUpload}
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
    tooltip,
}: FormFileUploaderFieldProps) => {
    const { t } = useTranslation();
    return (
        <Form.Item
            name={name}
            label={t(labelKey)}
            className={classNames(className, styles.richEditor)}
            tooltip={tooltip}
        >
            <FormFileUploaderLocal allowIcon={allowIcon} />
        </Form.Item>
    );
};
