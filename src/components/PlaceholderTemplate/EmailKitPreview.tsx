import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TokenizedText } from './TokenizedText';
import { emailColor, safeLanguageTag } from './emailKit';
import {
    previewInviteEmailTemplateContent,
    type InviteEmailPreviewDTO,
    type InviteEmailTemplateKind,
} from '../../api/accountInvites/accountInvites';
import styles from './EmailKitPreview.module.scss';

export interface EmailKitPreviewProps {
    /**
     * Subject **as authored**, tokens still unresolved. Substitution happens in
     * the backend renderer, not here — see the component doc.
     */
    subject: string;
    /** Body **as authored**, tokens still unresolved. */
    body: string;
    /** Accessible name of the preview region (also the iframe title). */
    previewLabel: string;
    /**
     * BCP-47 tag of the TEMPLATE being edited (e.g. an English template edited in
     * a German session). Drives the language the mail is rendered in. Falls back
     * to the admin UI locale. Validated here because it is free text an admin
     * types (#751 review), and now also because it goes over the wire.
     */
    language?: string;
    /** Template kind, so the backend picks the matching sample content. */
    kind?: InviteEmailTemplateKind;
    /** Preview a specific tenant's branding instead of the platform default. */
    tenantId?: number;
    /** Stored template the draft belongs to, for the renderer's context. */
    templateId?: number;
    /**
     * Renderer seam. Defaults to the real endpoint; Storybook injects a static
     * document so the stories stay deterministic and offline. Production code
     * must not pass this — a second renderer is the defect, not the fix.
     */
    renderPreview?: typeof previewInviteEmailTemplateContent;
}

/** Keystrokes are cheap, mail renders are not — coalesce a burst of typing. */
const PREVIEW_DEBOUNCE_MS = 300;

/**
 * Grows the frame to fit the rendered document, so the preview shows the whole
 * mail instead of a scroll stub. Ported from the e-mail kit's Storybook
 * harness (ORISO-Frontend `src/emails/preview/EmailPreview.tsx`); re-measures
 * once late because fonts settle after load.
 */
const useFittedFrame = (dependency: string) => {
    const ref = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(600);

    const measure = useCallback(() => {
        const doc = ref.current?.contentDocument;
        if (!doc?.body) {
            return;
        }
        const next = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
        if (next > 40) {
            setHeight((current) => (Math.abs(next - current) > 2 ? next : current));
        }
    }, []);

    useEffect(() => {
        measure();
        const timer = window.setTimeout(measure, 250);
        return () => window.clearTimeout(timer);
    }, [dependency, measure]);

    return { ref, height, measure };
};

/**
 * Invite-mail preview rendered by **the backend's own mail renderer**
 * (`POST /service/useradmin/invite-email-templates/preview`,
 * `InviteEmailPreviewService`), which is the very renderer
 * `InviteMailDispatchService` runs when the mail is actually sent.
 *
 * This used to be a client-side re-implementation of the mail frame
 * (`invitePreviewMarkup.renderInviteEmailPreviewHtml`) with its own brand
 * constants, its own token substitution and no CTA — which is exactly why the
 * composed preview and the received mail disagreed (finding E2: „Das Muster und
 * was versendet wird unterscheiden sich"). An Admin-side copy of the mail frame
 * can only ever drift; the endpoint cannot, because it *is* the send path.
 *
 * Consequences worth knowing:
 * - subject/body go over the wire **raw**; the backend substitutes the sample
 *   values, so the preview shows the same substitution the recipient gets.
 * - the returned document is shown verbatim in a sandboxed `<iframe>`. It is
 *   never re-styled and never rebuilt from the fields.
 * - a failed render is shown as a failed render (with a retry), never as a
 *   plausible-looking local approximation. A silent fallback would recreate the
 *   defect this component exists to remove.
 */
export const EmailKitPreview = ({
    subject,
    body,
    previewLabel,
    language,
    kind,
    tenantId,
    templateId,
    renderPreview = previewInviteEmailTemplateContent,
}: EmailKitPreviewProps) => {
    const { t, i18n } = useTranslation();
    // The template's own language wins: previewing an English template in a German
    // session must render an English mail (#746 review). Only without one does the
    // preview fall back to the admin UI locale. Validated rather than forwarded
    // raw — it is free text an admin types, and it now reaches a backend.
    const lang = safeLanguageTag(language, safeLanguageTag(i18n?.language));

    const [preview, setPreview] = useState<InviteEmailPreviewDTO | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const timer = window.setTimeout(() => {
            renderPreview({ body, kind, language: lang, subject, templateId, tenantId })
                .then((result) => {
                    if (cancelled) return;
                    setPreview(result);
                    setFailed(false);
                })
                .catch(() => {
                    if (cancelled) return;
                    setFailed(true);
                });
        }, PREVIEW_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
        // The cleanup runs before every re-request, so a response that arrives
        // late for older input finds `cancelled` set and is dropped: a stale
        // render can never win the race against a newer one.
    }, [attempt, body, kind, lang, renderPreview, subject, templateId, tenantId]);

    const retry = useCallback(() => {
        setFailed(false);
        setAttempt((current) => current + 1);
    }, []);

    const html = preview?.html ?? '';
    const renderedSubject = preview?.subject ?? '';
    const { ref, height, measure } = useFittedFrame(html);

    return (
        <section aria-label={previewLabel} className={styles.preview}>
            <div className={styles.meta}>
                <span className={styles.metaLabel}>{t('links.templates.field.subject', 'Betreff')}</span>
                <strong className={styles.metaSubject}>
                    {renderedSubject ? (
                        <TokenizedText text={renderedSubject} />
                    ) : (
                        t('links.templates.previewSubjectHint', 'Betreff der E-Mail')
                    )}
                </strong>
            </div>
            {failed ? (
                <div className={styles.error} role="status">
                    <span>{t('placeholderTemplate.preview.failed', 'Preview could not be rendered.')}</span>
                    <button className={styles.retry} type="button" onClick={retry}>
                        {t('placeholderTemplate.preview.retry', 'Retry')}
                    </button>
                </div>
            ) : (
                <iframe
                    ref={ref}
                    className={styles.frame}
                    /*
                     * DANGER, read before changing: `allow-same-origin` WITHOUT
                     * `allow-scripts` is the safe half of the pair — no script in
                     * the mail document ever executes, but the parent can read the
                     * document to size the frame to its content (useFittedFrame,
                     * #727 review).
                     *
                     * Adding `allow-scripts` alongside it defeats the sandbox
                     * entirely: the frame would then be same-origin AND scriptable
                     * and could reach into this app. If you are here to "make the
                     * links in the preview clickable", the answer is no.
                     */
                    sandbox="allow-same-origin"
                    srcDoc={html}
                    style={{ height, background: emailColor.canvas, borderColor: emailColor.outline }}
                    title={previewLabel}
                    onLoad={measure}
                />
            )}
        </section>
    );
};
