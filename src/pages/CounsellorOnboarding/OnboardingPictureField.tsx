import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Switch } from 'antd';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../components/M3Button';
import styles from './styles.module.scss';

const MAX_BYTES = 5_242_880;
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg']);

export interface OnboardingPictureFieldProps {
    file: File | null;
    publicToAdviceSeekers: boolean;
    disabled?: boolean;
    onChange: (patch: { file?: File | null; publicToAdviceSeekers?: boolean }) => void;
}

/**
 * Issue #1049 — the wizard's picture step. It is purely local: the chosen file travels with the
 * registration submit, because the consultant does not exist yet while this form is being filled
 * in. The same two limits the server enforces are checked here so an obvious refusal is immediate,
 * and the publish switch defaults to off — the photo is internal unless the counsellor says
 * otherwise.
 */
export const OnboardingPictureField = ({
    file,
    publicToAdviceSeekers,
    disabled = false,
    onChange,
}: OnboardingPictureFieldProps) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const objectUrlRef = useRef<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [errorKey, setErrorKey] = useState<string | null>(null);

    useEffect(() => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = file ? URL.createObjectURL(file) : null;
        setPreviewUrl(objectUrlRef.current);
    }, [file]);

    useEffect(
        () => () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        },
        [],
    );

    const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
        const { target } = event;
        const chosen = target.files?.[0] ?? null;
        target.value = '';
        setErrorKey(null);
        if (!chosen) return;
        if (!ACCEPTED_TYPES.has(chosen.type)) {
            setErrorKey('counselor.picture.error.unsupportedType');
            return;
        }
        if (chosen.size > MAX_BYTES) {
            setErrorKey('counselor.picture.error.tooLarge');
            return;
        }
        onChange({ file: chosen });
    };

    const removeFile = () => {
        setErrorKey(null);
        onChange({ file: null, publicToAdviceSeekers: false });
    };

    return (
        <div className={styles.pictureField}>
            {previewUrl && (
                <img className={styles.picturePreview} src={previewUrl} alt={t('counselor.picture.previewAlt')} />
            )}
            <input
                ref={inputRef}
                hidden
                tabIndex={-1}
                type="file"
                accept="image/png,image/jpeg"
                aria-label={t('counselor.picture.choose')}
                disabled={disabled}
                onChange={selectFile}
            />
            <div className={styles.pictureActions}>
                <M3Button variant="outlined" disabled={disabled} onClick={() => inputRef.current?.click()}>
                    {t(file ? 'counsellorOnboarding.picture.replace' : 'counselor.picture.choose')}
                </M3Button>
                {file && (
                    <M3Button variant="text" disabled={disabled} onClick={removeFile}>
                        {t('counselor.picture.remove')}
                    </M3Button>
                )}
            </div>
            {file && (
                <div className={styles.pictureVisibility}>
                    <Switch
                        id="onboarding-picture-visibility"
                        checked={publicToAdviceSeekers}
                        disabled={disabled}
                        onChange={(next) => onChange({ publicToAdviceSeekers: next })}
                        aria-describedby="onboarding-picture-visibility-hint"
                    />
                    <label htmlFor="onboarding-picture-visibility">{t('counselor.picture.visibility.label')}</label>
                    <Typography
                        id="onboarding-picture-visibility-hint"
                        variant="body2"
                        color="text.secondary"
                        className={styles.pictureHint}
                    >
                        {t(
                            publicToAdviceSeekers
                                ? 'counselor.picture.visibility.publicHint'
                                : 'counselor.picture.visibility.internalHint',
                        )}
                    </Typography>
                </div>
            )}
            {errorKey && (
                <Typography role="alert" color="error" variant="body2">
                    {t(errorKey)}
                </Typography>
            )}
        </div>
    );
};
