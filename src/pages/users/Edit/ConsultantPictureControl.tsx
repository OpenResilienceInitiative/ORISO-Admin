import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConsultantPictureBusy, ConsultantPictureField } from '../../../components/ConsultantPictureField';
import { pictureWriteErrorKey } from '../../../api/counselor/consultantPicture';
import { FETCH_ERRORS } from '../../../api/fetchData';
import {
    useConsultantPicture,
    useConsultantPictureMutations,
    useConsultantPictureVisibility,
} from '../../../hooks/useConsultantPicture';

export interface ConsultantPictureControlProps {
    /** Absent while a new consultant is created: the file is then handed to the form. */
    consultantId?: string;
    disabled: boolean;
    pendingDeletion?: boolean;
    /** Create mode: the chosen file, stored by the form right after the account exists. */
    onSelectedFileChange?: (file: File | null) => void;
}

type Feedback = { tone: 'error' | 'status'; key: string } | null;

/** A local object URL for a Blob/File, revoked when it changes or the control unmounts. */
const useObjectUrl = (blob: Blob | null | undefined) => {
    const [url, setUrl] = useState<string>();
    useEffect(() => {
        if (!blob) {
            setUrl(undefined);
            return undefined;
        }
        const next = URL.createObjectURL(blob);
        setUrl(next);
        return () => URL.revokeObjectURL(next);
    }, [blob]);
    return url;
};

const ControlForConsultant = ({
    consultantId,
    disabled,
    pendingDeletion = false,
    onSelectedFileChange,
}: ConsultantPictureControlProps) => {
    const { t } = useTranslation();
    const uploadButtonRef = useRef<HTMLButtonElement>(null);
    const mounted = useRef(true);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [busy, setBusy] = useState<ConsultantPictureBusy>(null);
    const [feedback, setFeedback] = useState<Feedback>(null);

    const picture = useConsultantPicture(consultantId);
    const storedPicture = picture.isError ? null : picture.data ?? null;
    const visibility = useConsultantPictureVisibility(consultantId, !!storedPicture);
    const { upload, remove, publish } = useConsultantPictureMutations();
    const previewSrc = useObjectUrl(pendingFile ?? storedPicture);

    useEffect(
        () => () => {
            mounted.current = false;
        },
        [],
    );

    const choose = (file: File) => {
        setFeedback(null);
        setPendingFile(file);
        onSelectedFileChange?.(file);
    };

    const discard = () => {
        setPendingFile(null);
        onSelectedFileChange?.(null);
        uploadButtonRef.current?.focus();
    };

    /** Runs one picture write; focus goes back to the choose button so keyboard users keep their place. */
    const run = async (
        kind: Exclude<ConsultantPictureBusy, null>,
        progressKey: string,
        write: () => Promise<string>,
    ) => {
        if (!consultantId || busy) return;
        setBusy(kind);
        setFeedback({ tone: 'status', key: progressKey });
        try {
            const doneKey = await write();
            if (mounted.current) setFeedback({ tone: 'status', key: doneKey });
        } catch (error) {
            const key =
                kind === 'visibility' ? 'counselor.picture.error.visibilityFailed' : await pictureWriteErrorKey(error);
            if (mounted.current) setFeedback({ tone: 'error', key });
        } finally {
            if (mounted.current) {
                setBusy(null);
                if (kind !== 'visibility') requestAnimationFrame(() => uploadButtonRef.current?.focus());
            }
        }
    };

    const save = () =>
        run('upload', 'counselor.picture.status.uploading', async () => {
            try {
                await upload.mutateAsync({ id: consultantId as string, picture: pendingFile as File });
            } finally {
                // A refused file is dropped too: the preview must show the photo the server still holds.
                setPendingFile(null);
            }
            return 'counselor.picture.status.saved';
        });

    const removePicture = () =>
        run('remove', 'counselor.picture.status.removing', async () => {
            await remove.mutateAsync({ id: consultantId as string });
            return 'counselor.picture.status.removed';
        });

    const changeVisibility = (internalOnly: boolean) =>
        run(
            'visibility',
            internalOnly ? 'counselor.picture.status.withdrawing' : 'counselor.picture.status.publishing',
            async () => {
                await publish.mutateAsync({ id: consultantId as string, internalOnly });
                return internalOnly ? 'counselor.picture.status.withdrawn' : 'counselor.picture.status.published';
            },
        );

    let readErrorKey: string | null = null;
    if (picture.isError) {
        readErrorKey =
            picture.error instanceof Error && picture.error.message === FETCH_ERRORS.NOT_ALLOWED
                ? 'counselor.picture.error.forbidden'
                : 'counselor.picture.error.readFailed';
    }
    // A write error is newer than the read state; otherwise a failed read must stay visible.
    let shown: Feedback = feedback;
    if (readErrorKey && feedback?.tone !== 'error') shown = { tone: 'error', key: readErrorKey };

    const createMode = !consultantId;
    let note: string | undefined;
    if (pendingDeletion) note = t('counselor.picture.deleting');
    else if (createMode && pendingFile) note = t('counselor.picture.selectedOnCreate');
    else if (pendingFile) note = t('counselor.picture.selected');

    return (
        <ConsultantPictureField
            previewSrc={previewSrc}
            loading={!createMode && picture.isPending}
            empty={createMode || (picture.isSuccess && picture.data === null)}
            disabled={disabled || pendingDeletion || picture.isError}
            busy={busy}
            hasPendingFile={!!pendingFile}
            onFileChosen={choose}
            onSave={createMode ? undefined : save}
            onDiscard={discard}
            onRemove={createMode ? undefined : removePicture}
            visibility={
                storedPicture
                    ? {
                          // Unknown reads as internal: the switch never claims a photo is public on a guess.
                          internalOnly: visibility.data !== false,
                          onChange: changeVisibility,
                          disabled: !visibility.isSuccess,
                      }
                    : undefined
            }
            feedback={shown ? { tone: shown.tone, text: t(shown.key) } : null}
            note={note}
            uploadButtonRef={uploadButtonRef}
        />
    );
};

/** The consultant photo in the create/edit form. A new consultant id gives a fresh, unshared state. */
export const ConsultantPictureControl = (props: ConsultantPictureControlProps) => (
    <ControlForConsultant key={props.consultantId ?? 'new'} {...props} />
);
