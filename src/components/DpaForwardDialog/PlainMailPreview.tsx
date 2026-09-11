import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

export interface PlainMailPreviewProps {
    /** Subject with every token already resolved — see `buildForwardMailPreview`. */
    subject: string;
    /** Body with every token already resolved. */
    body: string;
    /** Accessible name of the preview region — the same one the branded preview uses. */
    previewLabel: string;
}

/**
 * Preview of the composed `DPA_FORWARD` mail for surfaces that have **no admin
 * session**, i.e. the public tenant-onboarding wizard.
 *
 * Why this exists (#712): the branded preview is rendered by the backend's own
 * mail renderer behind `POST /service/useradmin/invite-email-templates/preview`,
 * which is admin-only and answers 401 to an anonymous visitor. `fetchData` turns
 * a 401 on a credentialled call into refresh → logout → `/admin/login`, so
 * merely opening the dialog on the public page threw the visitor off it. A
 * public surface must therefore not issue that request at all.
 *
 * Deliberately NOT a second copy of the mail frame: no brand markup, no logo,
 * no CTA button, no colours borrowed from the e-mail kit. It shows the wording
 * the dialog composed itself and says so. Re-implementing the branded frame here
 * would recreate exactly the preview-vs-sent-mail drift that `EmailKitPreview`
 * exists to remove.
 */
export const PlainMailPreview = ({ subject, body, previewLabel }: PlainMailPreviewProps) => {
    const { t } = useTranslation();

    return (
        <section aria-label={previewLabel} className={styles.plainPreview} data-testid="dpa-forward-plain-preview">
            <div className={styles.plainMeta}>
                <span className={styles.plainMetaLabel}>{t('links.templates.field.subject')}</span>
                <strong className={styles.plainMetaSubject}>{subject}</strong>
            </div>
            {/* `white-space: pre-line` keeps the paragraph breaks the composer put
                in, without a per-line element that a screen reader would announce
                as a list of fragments. */}
            <p className={styles.plainBody}>{body}</p>
            <p className={styles.plainNote}>{t('dpaForward.dialog.previewPlainNote')}</p>
        </section>
    );
};
