import { ChangeEvent, Ref, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageUploadField } from '../ImageUploadField';
import { M3Button } from '../M3Button';
import { ToggleRow } from '../ToggleRow';
import { HintText } from '../HintText';
import styles from './styles.module.scss';

/** Same limits as UserService `PictureIntake`: an obvious refusal is shown before any upload. */
export const PICTURE_MAX_BYTES = 5 * 1024 * 1024;
export const PICTURE_ACCEPTED_TYPES = ['image/png', 'image/jpeg'];

/** Returns the message key for a file the server would refuse anyway, or `null` when it may be sent. */
export const localPictureErrorKey = (file: File): string | null => {
    if (!PICTURE_ACCEPTED_TYPES.includes(file.type)) return 'counselor.picture.error.unsupportedType';
    if (file.size > PICTURE_MAX_BYTES) return 'counselor.picture.error.tooLarge';
    return null;
};

export type ConsultantPictureBusy = 'upload' | 'remove' | 'visibility' | null;

export interface ConsultantPictureFieldProps {
    /** Object URL of the stored photo or of the newly chosen file. */
    previewSrc?: string;
    /** The stored photo is still being read. */
    loading?: boolean;
    /** Confirmed: no photo is stored (never shown while loading or after a failed read). */
    empty?: boolean;
    /** Read-only form, missing permission, or a pending account save. */
    disabled?: boolean;
    /** The running picture operation; it locks the other picture actions. */
    busy?: ConsultantPictureBusy;
    /** A chosen file that is not stored yet. */
    hasPendingFile?: boolean;
    onFileChosen: (file: File) => void;
    /** Stores the chosen file now. Absent when the file travels with a later submit. */
    onSave?: () => void;
    /** Drops the chosen, not yet stored file. */
    onDiscard?: () => void;
    /** Deletes the stored photo. */
    onRemove?: () => void;
    /** The publish decision, shown once there is a photo. `internalOnly` true = advice seekers do not see it. */
    visibility?: {
        internalOnly: boolean;
        onChange: (internalOnly: boolean) => void;
        disabled?: boolean;
    };
    /** Outcome of the last operation: errors are announced assertively, progress politely. */
    feedback?: { tone: 'error' | 'status'; text: string } | null;
    /** A standing explanation (e.g. pending deletion). */
    note?: string;
    uploadButtonRef?: Ref<HTMLButtonElement>;
}

/**
 * The consultant photo: preview, choose, save, remove, and the "visible internally only" switch
 * (Figma Admin.ORISO Avatar card, "Own picture" 1-34788). Purely presentational: the admin form
 * stores each step at once, the onboarding wizard keeps the file until registration.
 */
export const ConsultantPictureField = ({
    previewSrc,
    loading = false,
    empty = false,
    disabled = false,
    busy = null,
    hasPendingFile = false,
    onFileChosen,
    onSave,
    onDiscard,
    onRemove,
    visibility,
    feedback,
    note,
    uploadButtonRef,
}: ConsultantPictureFieldProps) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);
    const locked = disabled || !!busy;

    const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { target } = event;
        const file = target.files?.[0];
        // Reset so choosing the same file again after a refusal still fires a change.
        target.value = '';
        if (!file) return;
        const errorKey = localPictureErrorKey(file);
        setLocalErrorKey(errorKey);
        if (!errorKey) onFileChosen(file);
    };

    const shownFeedback = localErrorKey ? { tone: 'error' as const, text: t(localErrorKey) } : feedback;

    return (
        <div className={styles.field}>
            <input
                ref={inputRef}
                className={styles.fileInput}
                type="file"
                tabIndex={-1}
                aria-hidden
                accept={PICTURE_ACCEPTED_TYPES.join(',')}
                disabled={locked}
                onChange={onInputChange}
                data-testid="consultant-picture-input"
            />
            <ImageUploadField
                shape="circle"
                previewSrc={previewSrc}
                alt={previewSrc ? t('counselor.picture.previewAlt') : ''}
                title={t('cards.avatarName.ownPicture')}
                uploadLabel={t(previewSrc ? 'counselor.picture.replace' : 'counselor.picture.choose')}
                onUpload={() => inputRef.current?.click()}
                disabled={locked}
                uploadButtonRef={uploadButtonRef}
                helper={t('counselor.picture.hint')}
                actions={
                    <>
                        {hasPendingFile && onSave && (
                            <M3Button variant="filled" onClick={onSave} disabled={locked} loading={busy === 'upload'}>
                                {t('counselor.picture.upload')}
                            </M3Button>
                        )}
                        {hasPendingFile && onDiscard && (
                            <M3Button variant="text" onClick={onDiscard} disabled={locked}>
                                {t('counselor.picture.discard')}
                            </M3Button>
                        )}
                        {!hasPendingFile && previewSrc && onRemove && (
                            <M3Button variant="text" onClick={onRemove} disabled={locked} loading={busy === 'remove'}>
                                {t('counselor.picture.remove')}
                            </M3Button>
                        )}
                    </>
                }
            />
            {loading && (
                <HintText role="status" aria-live="polite">
                    {t('counselor.picture.loading')}
                </HintText>
            )}
            {!loading && empty && !previewSrc && <HintText>{t('counselor.picture.empty')}</HintText>}
            {visibility && (
                <ToggleRow
                    label={t('cards.avatarName.ownPictureInternalOnly')}
                    description={
                        <>
                            {t(
                                visibility.internalOnly
                                    ? 'counselor.picture.visibility.internalHint'
                                    : 'counselor.picture.visibility.publicHint',
                            )}
                            {/* Replacing a published photo: the server stores every new photo as internal
                                again, so say so before the save. (Not in the wizard, where the switch
                                applies to the new photo itself.) */}
                            {hasPendingFile && onSave && !visibility.internalOnly && (
                                <> {t('counselor.picture.visibility.resetHint')}</>
                            )}
                        </>
                    }
                    checked={visibility.internalOnly}
                    // Not disabled while the visibility save runs: a disabled switch drops keyboard focus.
                    switchDisabled={disabled || busy === 'upload' || busy === 'remove' || !!visibility.disabled}
                    onCheckedChange={(internalOnly) => {
                        if (!busy) visibility.onChange(internalOnly);
                    }}
                />
            )}
            {note && <HintText role="status">{note}</HintText>}
            {shownFeedback && (
                <HintText
                    role={shownFeedback.tone === 'error' ? 'alert' : 'status'}
                    tone={shownFeedback.tone === 'error' ? 'error' : 'default'}
                    data-testid="consultant-picture-feedback"
                >
                    {shownFeedback.text}
                </HintText>
            )}
        </div>
    );
};
