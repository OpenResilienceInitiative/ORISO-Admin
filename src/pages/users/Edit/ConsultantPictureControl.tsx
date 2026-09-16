import { Button, Space } from 'antd';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiErrorReason } from '../../../utils/extractApiErrorMessage';
import { ConsultantPictureErrorReason } from '../../../api/counselor/consultantPicture';
import { useConsultantPicture, useConsultantPictureMutations } from '../../../hooks/useConsultantPicture';
import styles from './ConsultantPictureControl.module.scss';

const MAX_BYTES = 5_242_880;
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg']);

const errorKey = (reason: string | null): string => {
    const knownReason = reason as ConsultantPictureErrorReason | null;
    if (knownReason === 'PICTURE_TOO_LARGE') return 'counselor.picture.error.tooLarge';
    if (knownReason === 'PICTURE_UNSUPPORTED_TYPE') return 'counselor.picture.error.unsupportedType';
    if (knownReason === 'PICTURE_INVALID_IMAGE') return 'counselor.picture.error.invalidImage';
    if (knownReason === 'PICTURE_REJECTED') return 'counselor.picture.error.rejected';
    if (knownReason === 'PICTURE_SCAN_UNAVAILABLE') return 'counselor.picture.error.unavailable';
    return 'counselor.picture.error.failed';
};

export interface ConsultantPictureControlProps {
    consultantId?: string;
    /** The containing Card may already supply the visible heading. */
    showHeading?: boolean;
    disabled: boolean;
    pendingDeletion: boolean;
    onSelectedFileChange?: (file: File | null) => void;
}

/** Internal-only consultant image control. It never puts an authenticated endpoint into an img URL. */
const PictureControlForOwner = ({
    consultantId,
    showHeading = true,
    disabled,
    pendingDeletion,
    onSelectedFileChange,
}: ConsultantPictureControlProps) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const chooseButtonRef = useRef<HTMLButtonElement>(null);
    const restoreFocusRef = useRef(false);
    const activeRef = useRef(true);
    const busyRef = useRef(false);
    const [pendingAction, setPendingAction] = useState<'upload' | 'remove' | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [statusKey, setStatusKey] = useState<string | null>(null);
    const [errorKeyValue, setErrorKeyValue] = useState<string | null>(null);
    const picture = useConsultantPicture(consultantId);
    const { upload, remove } = useConsultantPictureMutations(consultantId);
    const mutationsDisabled = disabled || pendingDeletion || !!pendingAction || upload.isPending || remove.isPending;

    const replacePreview = (blob: Blob | null) => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = blob ? URL.createObjectURL(blob) : null;
        setPreviewUrl(objectUrlRef.current);
    };

    useEffect(() => {
        // A selected replacement is newer than an in-flight GET. Do not let that GET restore an old preview.
        if (!selectedFile) replacePreview(picture.isError ? null : picture.data ?? null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [picture.data, picture.isError, selectedFile]);

    useEffect(() => {
        activeRef.current = true;
        return () => {
            activeRef.current = false;
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        };
    }, []);

    useEffect(() => {
        if (!pendingAction && restoreFocusRef.current && !mutationsDisabled) {
            restoreFocusRef.current = false;
            chooseButtonRef.current?.focus();
        }
    }, [pendingAction, mutationsDisabled]);

    const selectFile = (file: File | null) => {
        if (mutationsDisabled || busyRef.current) return;
        setErrorKeyValue(null);
        setStatusKey(null);
        if (!file) return;
        if (!ACCEPTED_TYPES.has(file.type)) {
            setErrorKeyValue('counselor.picture.error.unsupportedType');
            return;
        }
        if (file.size > MAX_BYTES) {
            setErrorKeyValue('counselor.picture.error.tooLarge');
            return;
        }
        setSelectedFile(file);
        replacePreview(file);
        onSelectedFileChange?.(file);
    };

    const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { target } = event;
        const file = target.files?.[0] ?? null;
        target.value = '';
        selectFile(file);
    };

    const uploadSelectedFile = async () => {
        if (!selectedFile || !consultantId || mutationsDisabled || busyRef.current) return;
        busyRef.current = true;
        restoreFocusRef.current = true;
        setPendingAction('upload');
        setErrorKeyValue(null);
        setStatusKey('counselor.picture.status.uploading');
        try {
            await upload.mutateAsync(selectedFile);
            if (!activeRef.current) return;
            setSelectedFile(null);
            onSelectedFileChange?.(null);
            setStatusKey('counselor.picture.status.saved');
        } catch (error) {
            const reason = await extractApiErrorReason(error);
            if (!activeRef.current) return;
            // A failed replacement must show the last clean server image again, not the rejected local candidate.
            setSelectedFile(null);
            onSelectedFileChange?.(null);
            setErrorKeyValue(errorKey(reason));
            setStatusKey(null);
        } finally {
            if (activeRef.current) {
                busyRef.current = false;
                setPendingAction(null);
            }
        }
    };

    const removePicture = async () => {
        if (!consultantId || mutationsDisabled || busyRef.current) return;
        busyRef.current = true;
        restoreFocusRef.current = true;
        setPendingAction('remove');
        setErrorKeyValue(null);
        setStatusKey('counselor.picture.status.removing');
        try {
            await remove.mutateAsync();
            if (!activeRef.current) return;
            replacePreview(null);
            setStatusKey('counselor.picture.status.removed');
        } catch (error) {
            const reason = await extractApiErrorReason(error);
            if (!activeRef.current) return;
            setErrorKeyValue(errorKey(reason));
            setStatusKey(null);
        } finally {
            if (activeRef.current) {
                busyRef.current = false;
                setPendingAction(null);
            }
        }
    };

    let loadErrorKey: string | null = null;
    if (picture.isError) {
        loadErrorKey =
            picture.error instanceof Error && picture.error.message === 'NOT_ALLOWED'
                ? 'counselor.picture.error.forbidden'
                : 'counselor.picture.error.readFailed';
    }

    // Keep a failed freshness read visible after a successful write. Specific write
    // refusals take precedence, but a stale preview must never be announced as fresh.
    const feedbackKey =
        errorKeyValue && errorKeyValue !== 'counselor.picture.error.failed'
            ? errorKeyValue
            : loadErrorKey || errorKeyValue || statusKey;
    const loading = !!consultantId && picture.isPending;
    const confirmedEmpty = !consultantId || (!picture.isError && !loading && picture.data === null);

    return (
        <section
            className={styles.control}
            aria-labelledby={showHeading ? 'consultant-picture-heading' : undefined}
            aria-label={showHeading ? undefined : t('counselor.picture.title')}
        >
            {showHeading && <h3 id="consultant-picture-heading">{t('counselor.picture.title')}</h3>}
            <p>{t('counselor.picture.hint')}</p>
            {previewUrl && <img className={styles.preview} src={previewUrl} alt={t('counselor.picture.previewAlt')} />}
            {!previewUrl && confirmedEmpty && <p>{t('counselor.picture.empty')}</p>}
            {loading && <p role="status">{t('counselor.picture.loading')}</p>}
            <input
                ref={inputRef}
                hidden
                tabIndex={-1}
                type="file"
                accept="image/png,image/jpeg"
                aria-label={t('counselor.picture.choose')}
                disabled={mutationsDisabled}
                onChange={onFileChange}
            />
            <Space wrap>
                <Button ref={chooseButtonRef} onClick={() => inputRef.current?.click()} disabled={mutationsDisabled}>
                    {t('counselor.picture.choose')}
                </Button>
                {consultantId && selectedFile && (
                    <Button
                        type="primary"
                        loading={pendingAction === 'upload'}
                        onClick={uploadSelectedFile}
                        disabled={mutationsDisabled}
                    >
                        {t('counselor.picture.upload')}
                    </Button>
                )}
                {consultantId && previewUrl && !selectedFile && (
                    <Button
                        danger
                        loading={pendingAction === 'remove'}
                        onClick={removePicture}
                        disabled={mutationsDisabled}
                    >
                        {t('counselor.picture.remove')}
                    </Button>
                )}
            </Space>
            {pendingDeletion && <p role="status">{t('counselor.picture.deleting')}</p>}
            {feedbackKey && <p role={errorKeyValue || loadErrorKey ? 'alert' : 'status'}>{t(feedbackKey)}</p>}
        </section>
    );
};

// Route identity is also local-state identity: old completions cannot alter a new owner's selection.
export const ConsultantPictureControl = (props: ConsultantPictureControlProps) => (
    <PictureControlForOwner key={props.consultantId ?? 'new'} {...props} />
);
