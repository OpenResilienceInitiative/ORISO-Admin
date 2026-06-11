import { useTranslation } from 'react-i18next';
import { PREVIEW_GROUP_NAME } from '../previewData';
import { ChatMessages } from './ChatParts';
import styles from './screens.module.scss';

/** The chat room inside a narrow device frame (mobile end users). */
export const MobileChatScreen = () => {
    const { t } = useTranslation();
    return (
        <div className={styles.deviceWrap}>
            <div className={styles.device} data-testid="app-preview-device">
                <header className={styles.mobileHeader}>
                    <span className={styles.mobileBack} aria-hidden>
                        ‹
                    </span>
                    <span>{PREVIEW_GROUP_NAME}</span>
                </header>
                <ChatMessages compact />
                <div className={styles.mobileInputRow}>
                    <span className={styles.mobileInput}>{t('theme.builder.preview.editor.placeholder')}</span>
                    <span className={styles.mobileSend} aria-hidden>
                        ➤
                    </span>
                </div>
            </div>
        </div>
    );
};
