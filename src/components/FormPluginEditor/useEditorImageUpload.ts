import { notification } from 'antd';
import type { Editor } from '@tiptap/react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadTenantMedia } from '../../api/tenant/uploadTenantMedia';

/** Mirrors the server-side rules (TenantMediaService): PNG/JPEG/WebP, max 2 MB. */
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const IMAGE_UPLOAD_ACCEPT = SUPPORTED_IMAGE_TYPES.join(',');
export const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;

/** Image files from a drop/paste/file-picker list; everything else is ignored. */
export const imageFilesFrom = (files: FileList | File[] | undefined): File[] =>
    Array.from(files ?? []).filter((file) => file.type.startsWith('image/'));

/**
 * Upload-and-insert for the TipTap editors: sends images to the tenant media endpoint
 * and inserts the served `/media/{id}` url as an image node. Client-side checks mirror
 * the server rules for fast feedback — the server stays authoritative (magic bytes).
 */
export const useEditorImageUpload = (getEditor: () => Editor | null) => {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);

    const uploadAndInsert = useCallback(
        async (files: FileList | File[]) => {
            const uploadOne = async (file: File) => {
                if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
                    notification.error({
                        message: t('editor.image.upload.unsupportedType'),
                        duration: 5,
                    });
                    return;
                }
                if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
                    notification.error({ message: t('editor.image.upload.tooLarge'), duration: 5 });
                    return;
                }
                setUploading(true);
                try {
                    const media = await uploadTenantMedia(file);
                    getEditor()?.chain().focus().setImage({ src: media.url }).run();
                } catch {
                    notification.error({ message: t('editor.image.upload.failed'), duration: 5 });
                } finally {
                    setUploading(false);
                }
            };
            // sequential on purpose: multi-file drops keep their document order
            await Array.from(files).reduce((chain, file) => chain.then(() => uploadOne(file)), Promise.resolve());
        },
        [getEditor, t],
    );

    const openImagePicker = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = IMAGE_UPLOAD_ACCEPT;
        input.onchange = () => {
            if (input.files?.length) {
                uploadAndInsert(input.files);
            }
        };
        input.click();
    }, [uploadAndInsert]);

    return { uploading, uploadAndInsert, openImagePicker };
};

/**
 * ProseMirror editorProps handlers for dropping/pasting images into the editor.
 * `moved` drops (dragging content within the document) stay with the default handling.
 */
export const createImageDropPasteHandlers = (onImageFiles: (files: File[]) => void) => ({
    handleDrop: (_view: unknown, event: DragEvent, _slice: unknown, moved: boolean): boolean => {
        if (moved) {
            return false;
        }
        const files = imageFilesFrom(event.dataTransfer?.files);
        if (!files.length) {
            return false;
        }
        event.preventDefault();
        onImageFiles(files);
        return true;
    },
    handlePaste: (_view: unknown, event: ClipboardEvent): boolean => {
        const files = imageFilesFrom(event.clipboardData?.files);
        if (!files.length) {
            return false;
        }
        event.preventDefault();
        onImageFiles(files);
        return true;
    },
});
