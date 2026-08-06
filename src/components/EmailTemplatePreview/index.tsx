import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

export interface EmailTemplatePreviewProps {
    subject: string;
    body: string;
    /** Accessible name of the preview region. */
    previewLabel: string;
    code?: string;
    codeLabel?: string;
    supportingText?: string;
    action?: {
        label: string;
        href: string;
    };
    /** Sender name in the mail's header/footer band. Defaults to the platform name. */
    brand?: string;
}

const renderBody = (body: string) =>
    body.split(/({{[^{}]+}})/g).map((part, index) =>
        /^{{[^{}]+}}$/.test(part) ? (
            <code className={styles.token} key={`${part}-${index}`}>
                {part}
            </code>
        ) : (
            part
        ),
    );

export const EmailTemplatePreview = ({
    subject,
    body,
    previewLabel,
    code,
    codeLabel,
    supportingText,
    action,
    brand = 'ORISO',
}: EmailTemplatePreviewProps) => {
    const { t } = useTranslation();

    return (
        <section className={styles.preview} aria-label={previewLabel}>
            <div className={styles.meta}>
                <span className={styles.metaLabel}>{t('links.templates.field.subject', 'Betreff')}</span>
                <strong>{subject || '—'}</strong>
            </div>
            <div className={styles.canvas}>
                <article className={styles.email}>
                    <header className={styles.brand}>{brand}</header>
                    <div className={styles.content}>
                        {/* Empty fields show what WOULD stand there, so the frame
                            never looks broken while the admin is still typing. */}
                        <h2>{subject || t('links.templates.previewSubjectHint', 'Betreff der E-Mail')}</h2>
                        <p className={styles.body}>
                            {body ? renderBody(body) : t('links.templates.previewBodyHint', 'Inhalt der E-Mail')}
                        </p>
                        {code && (
                            <div className={styles.code} aria-label={codeLabel}>
                                {code}
                            </div>
                        )}
                        {action && (
                            <a className={styles.action} href={action.href}>
                                {action.label}
                            </a>
                        )}
                        {supportingText && <p className={styles.supportingText}>{supportingText}</p>}
                    </div>
                    <footer className={styles.footer}>{brand}</footer>
                </article>
            </div>
        </section>
    );
};
