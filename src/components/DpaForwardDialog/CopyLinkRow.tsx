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
    /** i18n key of the idle copy button. */
    copyKey?: string;
    /** i18n key of the confirmation shown after a successful copy. */
    copiedKey?: string;
}

/** How long the copy button confirms before reverting to its idle label. */
const COPY_FEEDBACK_MS = 2000;

/** Copies via the hidden selection; only for contexts without the Clipboard API (plain http). */
const copyBySelection = (input: HTMLInputElement | null): boolean => {
    if (!input) return false;
    // Focus first: select() alone leaves keyboard focus on the button, and a manual copy
    // would then miss the link.
    input.focus();
    input.select();
    try {
        return typeof document.execCommand === 'function' && document.execCommand('copy');
    } catch {
        return false;
    }
};

/**
 * Labelled read-only link field with a one-click copy action and success
 * feedback — shared by the forward dialog (#723), the pending-signature
 * dialog (#724) and the counsellor's public contact link (ORISO-UserService#1534).
 * Without the Clipboard API it falls back to copying the selected text; when that
 * fails too the text stays selected so a manual copy still works. The action never
 * fails silently.
 */
export const CopyLinkRow = ({
    value,
    labelKey = 'dpaForward.dialog.linkLabel',
    copyKey = 'dpaForward.dialog.copy',
    copiedKey = 'dpaForward.dialog.copied',
}: CopyLinkRowProps) => {
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
            if (copyBySelection(inputRef.current)) setCopied(true);
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
                    {copied ? t(copiedKey) : t(copyKey)}
                </M3Button>
            </div>
            {/* Screen readers do not reliably announce a label change on the focused button. */}
            <span role="status" className={styles.visuallyHidden}>
                {copied ? t(copiedKey) : ''}
            </span>
        </div>
    );
};
