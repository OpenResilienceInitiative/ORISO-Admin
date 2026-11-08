import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import { useId, useRef, type ChangeEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { assistantIconUploadPolicy } from '../../utils/assistantIconUploadPolicy';
import styles from './styles.module.scss';

/**
 * Icons are SVG or PNG and small: they are shown at most 40 x 40 px. An SVG is only accepted when it holds
 * nothing but plain shapes (the same allowlist as the assistant icon); anything else counts as a wrong type.
 */
export const ICON_TYPES = assistantIconUploadPolicy.mimeTypes;
/** "100 KB" in the texts is meant as 100 000 bytes. */
export const ICON_MAX_BYTES = 100 * 1000;

export type IconProblem = 'type' | 'size' | 'read';

export interface TopicIconSlotProps {
    /** Data URL or address of the topic's own icon; without it the standard icon is shown. */
    icon?: string | null;
    topicName: string;
    /** Stable id of what the icon belongs to (`topic-7`, `group-health`); two items may share a name. */
    slotId?: string;
    /** Edit mode: the slot becomes the "+" that uploads an icon. */
    editable?: boolean;
    disabled?: boolean;
    onPick?: (file: File, dataUrl: string) => void;
    onRemove?: () => void;
    onProblem?: (problem: IconProblem, topicName: string) => void;
    /** Shown while there is no own icon and the slot is not editable. Topics get a label icon; categories show nothing. */
    placeholder?: ReactNode | null;
}

const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

export const TopicIconSlot = ({
    icon,
    topicName,
    slotId,
    editable,
    disabled,
    onPick,
    onRemove,
    onProblem,
    placeholder,
}: TopicIconSlotProps) => {
    const { t } = useTranslation();
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    const fallback = placeholder === undefined ? <LabelOutlinedIcon aria-hidden /> : placeholder;
    const picture = icon ? <img className={styles.iconImage} src={icon} alt="" /> : fallback;

    if (!editable) {
        return picture ? <span className={styles.iconSlot}>{picture}</span> : null;
    }

    const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Allows choosing the same file again after a problem.
        const input = event.target;
        if (!file) return;
        if (!ICON_TYPES.includes(file.type)) onProblem?.('type', topicName);
        else if (file.size > ICON_MAX_BYTES) onProblem?.('size', topicName);
        else {
            try {
                const dataUrl = await readAsDataUrl(file);
                if (assistantIconUploadPolicy.validate?.(dataUrl, file) === false) onProblem?.('type', topicName);
                else onPick?.(file, dataUrl);
            } catch {
                onProblem?.('read', topicName);
            }
        }
        input.value = '';
    };

    return (
        <span className={styles.iconEdit}>
            <input
                ref={inputRef}
                id={inputId}
                className={styles.srOnly}
                type="file"
                accept={ICON_TYPES.join(',')}
                tabIndex={-1}
                aria-label={t('topicCatalogue.iconUpload', { name: topicName })}
                disabled={disabled}
                data-testid={`icon-input-${slotId ?? topicName}`}
                onChange={onChange}
            />
            <button
                type="button"
                className={styles.iconUpload}
                aria-label={t(icon ? 'topicCatalogue.iconReplace' : 'topicCatalogue.iconUpload', { name: topicName })}
                title={t('topicCatalogue.iconHint')}
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
            >
                {icon ? picture : <AddPhotoAlternateOutlinedIcon aria-hidden />}
            </button>
            {icon && (
                <button
                    type="button"
                    className={styles.iconRemove}
                    aria-label={t('topicCatalogue.iconRemove', { name: topicName })}
                    disabled={disabled}
                    onClick={onRemove}
                >
                    <CloseIcon aria-hidden />
                </button>
            )}
        </span>
    );
};
