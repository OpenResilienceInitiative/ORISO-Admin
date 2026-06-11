import { useTranslation } from 'react-i18next';
import { PREVIEW_MESSAGES } from '../previewData';
import styles from './screens.module.scss';

/**
 * Chat history with the REAL app's bubble anatomy (lifted from
 * ORISO-Frontend message.styles.scss): incoming bubbles 0/12/12/12 on
 * the lowest container, own bubbles 12/12/0 on the light brand tint
 * (Primary Fixed), username rows in low emphasis, centred day divider.
 */
export const ChatMessages = ({ compact = false }: { compact?: boolean }) => {
    const { t } = useTranslation();
    return (
        <div className={compact ? `${styles.messages} ${styles.messagesCompact}` : styles.messages}>
            <div className={styles.dayDivider}>{t('theme.builder.preview.today')}</div>
            {PREVIEW_MESSAGES.map((message) =>
                message.direction === 'client' ? (
                    <div key={message.text} className={styles.messageRow} data-testid="app-preview-message-client">
                        <span className={styles.username}>
                            <span className={styles.avatar} aria-hidden>
                                {message.avatar}
                            </span>
                            {message.author}
                        </span>
                        <span className={styles.bubbleIncoming}>{message.text}</span>
                    </div>
                ) : (
                    <div
                        key={message.text}
                        className={`${styles.messageRow} ${styles.messageRowOwn}`}
                        data-testid="app-preview-message-own"
                    >
                        <span className={styles.username}>{message.author}</span>
                        <span className={styles.bubbleOwn}>{message.text}</span>
                        <span className={styles.sendError}>{t('theme.builder.preview.editor.failed')}</span>
                    </div>
                ),
            )}
        </div>
    );
};

const TOOLBAR_GLYPHS = ['↺', '↻', 'H', 'B', 'I', 'U', '≔', '🔗'];

export const MessageEditor = () => {
    const { t } = useTranslation();
    return (
        <footer className={styles.editor}>
            <div className={styles.toolbar} aria-hidden>
                {TOOLBAR_GLYPHS.map((glyph, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <span key={index} className={styles.toolbarGlyph}>
                        {glyph}
                    </span>
                ))}
                <span className={styles.sendButton}>{t('theme.builder.preview.editor.send')}</span>
            </div>
            <div className={styles.editorInput}>{t('theme.builder.preview.editor.placeholder')}</div>
        </footer>
    );
};
