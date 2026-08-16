import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TokenizedText } from './TokenizedText';
import { emailColor, safeLanguageTag, type EmailKitBrand } from './emailKit';
import { ADMIN_EMAIL_SAMPLE_BRAND, renderInviteEmailPreviewHtml } from './invitePreviewMarkup';
import styles from './EmailKitPreview.module.scss';

export interface EmailKitPreviewProps {
    /** Subject with known tokens already substituted (unknown ones stay `{{key}}`). */
    subject: string;
    /** Body with known tokens already substituted (unknown ones stay `{{key}}`). */
    body: string;
    /** Accessible name of the preview region (also the iframe title). */
    previewLabel: string;
    /**
     * BCP-47 tag of the TEMPLATE being edited (e.g. an English template edited in
     * a German session). Drives the document `lang` and the language the preview's
     * own boilerplate is resolved in. Falls back to the admin UI locale.
     */
    language?: string;
}

/** The tenant primary from the admin theme, as a literal the e-mail kit can inline. */
const readTenantPrimary = (): string => {
    const value =
        typeof window === 'undefined'
            ? ''
            : window.getComputedStyle(document.documentElement).getPropertyValue('--m3-primary').trim();
    return value || '#a5000a';
};

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
 * Invite-mail preview in the NEW transactional e-mail design (ORISO-Frontend
 * `src/emails/`, Storybook `Email/*`): branded header, white card, typography
 * and footer exactly as the kit renders them. The document goes into an
 * `<iframe>` because e-mail markup brings its own `<body>` background and a
 * media query that must react to the *frame* width — which also makes the
 * stacked mobile layout honest at 320px.
 */
export const EmailKitPreview = ({ subject, body, previewLabel, language }: EmailKitPreviewProps) => {
    const { t, i18n } = useTranslation();
    // The template's own language wins: previewing an English template in a German
    // session must render English boilerplate and lang="en" (#746 review). Only
    // without one does the preview fall back to the admin UI locale.
    //
    // Validated here as well as at the sink: the template language is free text an
    // admin types, and a malformed value should degrade to the UI locale rather
    // than to the kit's blanket "de" default (#751 review).
    const lang = safeLanguageTag(language, safeLanguageTag(i18n?.language));
    // Read once per mount: the admin theme applies the tenant palette to the
    // document root before any editor screen renders.
    const primaryColor = useMemo(readTenantPrimary, []);

    const brand: EmailKitBrand = useMemo(
        () => ({ ...ADMIN_EMAIL_SAMPLE_BRAND, primaryColor, accentColor: primaryColor }),
        [primaryColor],
    );

    const html = useMemo(
        () =>
            renderInviteEmailPreviewHtml({
                subject,
                body,
                brand,
                lang,
                strings: {
                    // `lng` pins every string to the TEMPLATE's language, not the UI's.
                    subjectHint: t('links.templates.previewSubjectHint', 'Betreff der E-Mail', { lng: lang }),
                    bodyHint: t('links.templates.previewBodyHint', 'Inhalt der E-Mail', { lng: lang }),
                    assurance: t(
                        'placeholderTemplate.preview.assurance',
                        'Wir fragen Sie nie per E-Mail nach Ihrem Passwort. Geben Sie diesen Link an niemanden weiter.',
                        { lng: lang },
                    ),
                    offeredBy: t('placeholderTemplate.preview.offeredBy', '{{platform}} ist ein Angebot von {{org}}.', {
                        platform: brand.platformName,
                        org: brand.orgName,
                        lng: lang,
                    }),
                    linkLabels: [
                        t('placeholderTemplate.preview.privacy', 'Datenschutz', { lng: lang }),
                        t('placeholderTemplate.preview.imprint', 'Impressum', { lng: lang }),
                    ],
                    automatedNote: t(
                        'placeholderTemplate.preview.automatedNote',
                        'Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht darauf.',
                        { lng: lang },
                    ),
                },
            }),
        [subject, body, brand, lang, t],
    );

    const { ref, height, measure } = useFittedFrame(html);

    return (
        <section aria-label={previewLabel} className={styles.preview}>
            <div className={styles.meta}>
                <span className={styles.metaLabel}>{t('links.templates.field.subject', 'Betreff')}</span>
                <strong className={styles.metaSubject}>
                    {subject ? (
                        <TokenizedText text={subject} />
                    ) : (
                        t('links.templates.previewSubjectHint', 'Betreff der E-Mail')
                    )}
                </strong>
            </div>
            <iframe
                ref={ref}
                title={previewLabel}
                // Same-origin is required for useFittedFrame's contentDocument
                // measuring; everything else — scripts above all — stays off
                // (#727 review).
                sandbox="allow-same-origin"
                srcDoc={html}
                onLoad={measure}
                className={styles.frame}
                style={{ height, background: emailColor.canvas, borderColor: emailColor.outline }}
            />
        </section>
    );
};
