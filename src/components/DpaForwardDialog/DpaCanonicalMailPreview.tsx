import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { emailColor } from '../PlaceholderTemplate/emailKit';
import {
    getAdminDpaMailPreview,
    getPublicDpaMailPreview,
    type DpaMailPreview,
} from '../../api/tenantOnboarding/dpaMailPreview';
import styles from '../PlaceholderTemplate/EmailKitPreview.module.scss';

interface DpaCanonicalMailPreviewProps {
    previewLabel: string;
    surface: 'public' | 'admin';
    inviteToken?: string;
    tenantId?: number;
}

type PreviewStatus = 'loading' | 'ready' | 'failed';

interface PreviewState {
    key: string;
    status: PreviewStatus;
}

interface PreviewContext {
    key: string;
    load: (() => Promise<DpaMailPreview>) | null;
}

const isPositiveTenantId = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * Displays the UserService document that the DPA forward dispatcher uses. No
 * sign link is minted here: rendering is a read-only request. The sandbox lets
 * the parent measure the mail but never runs document scripts or top-level
 * navigation. Ordinary anchors can still navigate inside the frame itself.
 */
export const DpaCanonicalMailPreview = ({
    previewLabel,
    surface,
    inviteToken,
    tenantId,
}: DpaCanonicalMailPreviewProps) => {
    const { t } = useTranslation();
    const frame = useRef<HTMLIFrameElement>(null);
    const [attempt, setAttempt] = useState(0);
    const [height, setHeight] = useState(600);
    const [previews, setPreviews] = useState<Record<string, DpaMailPreview>>({});

    const context = useMemo<PreviewContext>(() => {
        if (surface === 'public') {
            return inviteToken
                ? { key: `public:${inviteToken}`, load: () => getPublicDpaMailPreview(inviteToken) }
                : { key: 'public:missing', load: null };
        }
        if (isPositiveTenantId(tenantId)) {
            return { key: `admin:${tenantId}`, load: () => getAdminDpaMailPreview(tenantId) };
        }
        return { key: 'admin:missing', load: null };
    }, [inviteToken, surface, tenantId]);

    const [state, setState] = useState<PreviewState>(() => ({
        key: context.key,
        status: context.load ? 'loading' : 'failed',
    }));

    const reload = useCallback(() => {
        setState((current) => (current.key === context.key ? { ...current, status: 'loading' } : current));
        setAttempt((current) => current + 1);
    }, [context.key]);

    useEffect(() => {
        let cancelled = false;
        const { key, load } = context;

        if (!load) {
            setState({ key, status: 'failed' });
            return undefined;
        }

        setState((current) => (current.key === key ? { ...current, status: 'loading' } : { key, status: 'loading' }));

        load()
            .then((result) => {
                if (cancelled) return;
                setPreviews((current) => ({ ...current, [key]: result }));
                setState({ key, status: 'ready' });
            })
            .catch(() => {
                if (cancelled) return;
                setState((current) =>
                    current.key === key ? { ...current, status: 'failed' } : { key, status: 'failed' },
                );
            });
        return () => {
            cancelled = true;
        };
    }, [attempt, context]);

    // Effects run after paint. Reject a document from another context during
    // that render too, so tenant A can never flash while tenant B is loading.
    const visibleState: PreviewState =
        state.key === context.key ? state : { key: context.key, status: context.load ? 'loading' : 'failed' };
    const { status } = visibleState;
    const preview = previews[context.key] ?? null;

    const measure = useCallback(() => {
        const document = frame.current?.contentDocument;
        if (!document?.body) return;
        const next = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        if (next > 40) setHeight((current) => (Math.abs(current - next) > 2 ? next : current));
    }, []);

    useEffect(() => {
        measure();
        const timer = window.setTimeout(measure, 250);
        return () => window.clearTimeout(timer);
    }, [measure, preview?.html]);

    return (
        <section aria-label={previewLabel} className={styles.preview} data-testid="dpa-forward-canonical-preview">
            <div className={styles.meta}>
                <span className={styles.metaLabel}>{t('links.templates.field.subject', 'Betreff')}</span>
                <strong className={styles.metaSubject}>
                    {preview?.subject || t('links.templates.previewSubjectHint', 'Betreff der E-Mail')}
                </strong>
            </div>
            <p className={styles.note}>{t('dpaForward.dialog.previewSampleNote')}</p>
            {preview && (
                <iframe
                    ref={frame}
                    className={styles.frame}
                    sandbox="allow-same-origin"
                    srcDoc={preview.html}
                    style={{ height, background: emailColor.canvas, borderColor: emailColor.outline }}
                    title={previewLabel}
                    onLoad={measure}
                />
            )}
            {status === 'loading' && (
                <div className={styles.loading} role="status" data-testid="dpa-forward-preview-loading">
                    {t('dpaForward.dialog.previewLoading')}
                </div>
            )}
            {status === 'failed' && (
                <div className={styles.error} role="status" data-testid="dpa-forward-preview-error">
                    <span>{t('placeholderTemplate.preview.failed', 'Preview could not be rendered.')}</span>
                    <button className={styles.retry} type="button" onClick={reload}>
                        {t('placeholderTemplate.preview.retry', 'Retry')}
                    </button>
                </div>
            )}
        </section>
    );
};
