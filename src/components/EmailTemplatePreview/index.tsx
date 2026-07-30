import styles from './styles.module.scss';

export interface EmailTemplatePreviewProps {
    subject: string;
    body: string;
    previewLabel: string;
    code?: string;
    codeLabel?: string;
    supportingText?: string;
    action?: {
        label: string;
        href: string;
    };
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
}: EmailTemplatePreviewProps) => (
    <section className={styles.preview} aria-label={previewLabel}>
        <div className={styles.meta}>
            <span className={styles.metaLabel}>Subject</span>
            <strong>{subject || '—'}</strong>
        </div>
        <div className={styles.canvas}>
            <article className={styles.email}>
                <header className={styles.brand}>ORISO</header>
                <div className={styles.content}>
                    <h2>{subject || 'Email subject'}</h2>
                    <p className={styles.body}>{body ? renderBody(body) : 'Email body'}</p>
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
                <footer className={styles.footer}>ORISO</footer>
            </article>
        </div>
    </section>
);
