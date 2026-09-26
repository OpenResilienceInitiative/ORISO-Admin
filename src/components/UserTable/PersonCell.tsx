import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import EditorHintSnackbar from '../FormPluginEditor/EditorHintSnackbar';
import styles from './personCell.module.scss';

const SNACKBAR_MS = 4000;

export interface PersonCellProps {
    name: string;
    email: string;
    username?: string;
    /** E.g. „Auch Träger-Admin"; shown as a chip next to the name. */
    alsoLabel?: string;
}

/**
 * Line 1: name + role chip. Line 2: e-mail, copy, @username. When tight, chip and
 * username wrap below instead of cutting the name; long values are cut, the tooltip has them in full.
 */
export const PersonCell = ({ name, email, username, alsoLabel }: PersonCellProps) => {
    const { t } = useTranslation();
    const title = name || email;
    const usernameLabel = t('userTable.person.username', 'Benutzername');

    const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);

    useEffect(() => {
        if (!copied) return undefined;
        const timer = setTimeout(() => setCopied(null), SNACKBAR_MS);
        return () => clearTimeout(timer);
    }, [copied]);

    const copyEmail = () =>
        navigator.clipboard
            .writeText(email)
            .then(() => setCopied('ok'))
            .catch(() => setCopied('failed'));

    return (
        <div className={styles.person}>
            <div className={styles.line}>
                <span className={styles.name} title={title}>
                    {title}
                </span>
                {alsoLabel && (
                    <span className={styles.also} title={alsoLabel}>
                        {alsoLabel}
                    </span>
                )}
            </div>
            {(email || username) && (
                <div className={styles.line}>
                    {email && (
                        <span className={styles.contact}>
                            {name && (
                                <span className={styles.email} title={email}>
                                    {email}
                                </span>
                            )}
                            <button
                                type="button"
                                className={styles.copy}
                                aria-label={t('userTable.person.copyEmail', 'E-Mail von {{name}} kopieren', {
                                    name: title,
                                })}
                                onClick={copyEmail}
                            >
                                <ContentCopyOutlinedIcon aria-hidden />
                            </button>
                        </span>
                    )}
                    {username && (
                        <span className={styles.username} title={`${usernameLabel}: @${username}`}>
                            @{username}
                        </span>
                    )}
                </div>
            )}
            {copied &&
                createPortal(
                    <div className={styles.snackbarSlot} data-testid="person-copy-snackbar">
                        <EditorHintSnackbar
                            tone={copied === 'ok' ? 'success' : 'error'}
                            text={
                                copied === 'ok'
                                    ? t('userTable.person.emailCopied', 'E-Mail kopiert')
                                    : t('links.copyFailed', 'Kopieren fehlgeschlagen')
                            }
                            onClose={() => setCopied(null)}
                        />
                    </div>,
                    document.body,
                )}
        </div>
    );
};
