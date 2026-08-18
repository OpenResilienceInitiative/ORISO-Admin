import { useEffect, useId, useRef, useState } from 'react';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../M3Button';
import styles from './styles.module.scss';

export interface CopyLinkRowProps {
    /** The link to show and copy. */
    value: string;
    /** i18n key of the label above the read-only field. */
    labelKey?: string;
}

/** How long the copy button confirms before reverting to its idle label. */
const COPY_FEEDBACK_MS = 2000;

/**
 * Labelled read-only link field with a one-click copy action and success
 * feedback — shared by the forward dialog (#723) and the pending-signature
 * dialog (#724). When the Clipboard API is unavailable the text is selected
 * so a manual copy still works; the action never fails silently.
 */
export const CopyLinkRow = ({ value, labelKey = 'dpaForward.dialog.linkLabel' }: CopyLinkRowProps) => {
    const { t } = useTranslation();
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return undefined;
        const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
        return () => window.clearTimeout(timer);
    }, [copied]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
        } catch {
            inputRef.current?.select();
        }
    };

    return (
        <div className={styles.linkBlock}>
            <label className={styles.linkLabel} htmlFor={id}>
                {t(labelKey)}
            </label>
            <div className={styles.linkRow}>
                <input
                    id={id}
                    ref={inputRef}
                    className={styles.linkInput}
                    value={value}
                    readOnly
                    onFocus={(event) => event.target.select()}
                />
                <M3Button
                    variant="tonal"
                    icon={copied ? <CheckRounded fontSize="small" /> : <ContentCopyRounded fontSize="small" />}
                    onClick={copy}
                >
                    {copied ? t('dpaForward.dialog.copied') : t('dpaForward.dialog.copy')}
                </M3Button>
            </div>
        </div>
    );
};
