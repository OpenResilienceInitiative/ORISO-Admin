import { message, Form, Upload } from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import getBase64 from '../../utils/getBase64';
import { UploadFileProps } from '../../types/uploadFiles';

const { Item } = Form;

const FileUploader = ({
    name,
    label,
    getValueFromEvent,
    imageUrl,
    setImageUrl,
}: {
    name: string;
    label: string;
    getValueFromEvent: (e: any) => void;
    imageUrl: string | '';
    setImageUrl: (fileBase64: any) => void;
}) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const beforeUpload = (file: UploadFileProps) => {
        const isJpgOrPng =
            file.type === 'image/jpeg' ||
            file.type === 'image/png' ||
            (name === 'favicon' && (file.type === 'image/x-icon' || file.type === 'image/vnd.microsoft.icon'));
        if (!isJpgOrPng) {
            message.error(t('message.error.upload.filetype'));
            return false;
        }
        const isLarger500kb = file.size / 1024 > 512;

        if (isLarger500kb) {
            message.error(t('message.error.upload.filesize'));
            return false;
        }

        getBase64(file, (imgUrl1: string | ArrayBuffer | null) => {
            setLoading(false);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore

            setImageUrl(imgUrl1);
        });
        // NOT really upload a file since we use the base64 as string :O)
        return false;
    };

    return (
        <Item label={label} getValueFromEvent={getValueFromEvent} className="block">
            <Upload
                name="upload"
                listType="picture-card"
                className="fileUploader"
                showUploadList={false}
                beforeUpload={beforeUpload}
            >
                {imageUrl ? (
                    <img src={imageUrl} alt={name} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                ) : (
                    <div>
                        {loading ? <LoadingOutlined /> : <PlusOutlined />}
                        <div style={{ marginTop: 8 }}>{t('btn.upload')}</div>
                    </div>
                )}
            </Upload>
        </Item>
    );
};

export default FileUploader;
