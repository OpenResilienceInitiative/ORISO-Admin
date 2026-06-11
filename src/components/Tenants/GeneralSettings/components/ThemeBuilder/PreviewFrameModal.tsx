import { Modal, Radio } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { appURL } from '../../../../../appConfig';
import { TenantSeeds } from '../../../../../utils/themeSeeds';
import { buildPreviewUrl } from './previewUrl';
import styles from './styles.module.scss';

interface PreviewFrameModalProps {
    open: boolean;
    onClose: () => void;
    draftSeeds: TenantSeeds;
    storedSeeds: TenantSeeds;
    /**
     * Origin serving the end-user app. MUST be a different origin than
     * the admin panel (prod: app.oriso.org vs admin.oriso.org) — the
     * same-origin policy is what isolates the frame from admin cookies
     * and Keycloak tokens. Defaults to the configured app base URL.
     */
    appBaseUrl?: string;
}

/**
 * The theme preview: the REAL app's public sign-in screen in a
 * sandboxed iframe, painted by the draft seeds (Vorher/Nachher
 * switch reloads the frame with the stored seeds).
 *
 * Security: sandbox="allow-scripts allow-same-origin" and nothing
 * else — no forms, popups, top navigation or downloads.
 * allow-same-origin is required because the app calls its API
 * same-origin (proxied); an opaque origin would send Origin: null and
 * fail CORS. The admin stays isolated regardless: the app is
 * cross-origin to the admin, so the same-origin policy keeps admin
 * cookies and Keycloak tokens unreachable. A click shield on top makes
 * the frame purely visual; the URL carries bare hex colours only.
 */
export const PreviewFrameModal = ({ open, onClose, draftSeeds, storedSeeds, appBaseUrl }: PreviewFrameModalProps) => {
    const { t } = useTranslation();
    const [view, setView] = useState<'current' | 'new'>('new');
    const base = appBaseUrl ?? appURL;
    const url = buildPreviewUrl(base, view === 'new' ? draftSeeds : storedSeeds);

    return (
        <Modal open={open} onCancel={onClose} footer={null} width={1080} destroyOnClose>
            <div className={styles.galleryHeader}>
                <span className={styles.galleryCaption}>{t('theme.builder.preview.frameTitle')}</span>
                <Radio.Group
                    size="small"
                    optionType="button"
                    buttonStyle="solid"
                    value={view}
                    onChange={(event) => setView(event.target.value)}
                >
                    <Radio.Button value="current">{t('theme.builder.preview.current')}</Radio.Button>
                    <Radio.Button value="new">{t('theme.builder.preview.new')}</Radio.Button>
                </Radio.Group>
            </div>
            {url ? (
                <div className={styles.frameWrap}>
                    <iframe
                        key={url}
                        className={styles.frame}
                        src={url}
                        title={t('theme.builder.preview.frameTitle')}
                        sandbox="allow-scripts allow-same-origin"
                        tabIndex={-1}
                    />
                    {/* purely visual: block every interaction with the frame */}
                    <div className={styles.frameShield} data-testid="preview-frame-shield" />
                </div>
            ) : (
                <div className={styles.frameEmpty}>{t('theme.builder.preview.empty')}</div>
            )}
        </Modal>
    );
};
