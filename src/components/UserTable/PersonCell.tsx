import { useTranslation } from 'react-i18next';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { message } from 'antd';
import styles from './personCell.module.scss';

export interface PersonCellProps {
    name: string;
    email: string;
    username?: string;
    /** E.g. „Auch Träger-Admin"; shown as a chip next to the name. */
    alsoLabel?: string;
}

/** Line 1: name + role chip. Line 2: e-mail, copy, @username. Long values are cut; the tooltip has them in full. */
export const PersonCell = ({ name, email, username, alsoLabel }: PersonCellProps) => {
    const { t } = useTranslation();
    const title = name || email;
    const usernameLabel = t('userTable.person.username', 'Benutzername');

    const copyEmail = () =>
        navigator.clipboard
            .writeText(email)
            .then(() => message.success(t('userTable.person.emailCopied', 'E-Mail kopiert')))
            .catch(() => message.error(t('links.copyFailed', 'Kopieren fehlgeschlagen')));

    return (
        <div className={styles.person}>
            <div className={styles.line}>
                <span className={styles.name} title={title}>
                    {title}
                </span>
                {alsoLabel && <span className={styles.also}>{alsoLabel}</span>}
            </div>
            {(email || username) && (
                <div className={styles.line}>
                    {name && (
                        <span className={styles.email} title={email}>
                            {email}
                        </span>
                    )}
                    {email && (
                        <button
                            type="button"
                            className={styles.copy}
                            aria-label={t('userTable.person.copyEmail', 'E-Mail kopieren')}
                            onClick={copyEmail}
                        >
                            <ContentCopyOutlinedIcon aria-hidden />
                        </button>
                    )}
                    {username && (
                        <span className={styles.username} title={`${usernameLabel}: @${username}`}>
                            @{username}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
