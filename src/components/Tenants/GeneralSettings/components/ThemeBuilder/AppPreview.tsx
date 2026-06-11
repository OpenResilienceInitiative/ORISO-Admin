import { CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { computeOrisoPalette } from '../../../../../utils/theme/orisoScheme';
import { TenantSeeds } from '../../../../../utils/themeSeeds';
import { PREVIEW_GROUP_NAME, PREVIEW_MESSAGES, PREVIEW_SESSIONS, PREVIEW_TOPIC_TAG } from './previewData';
import styles from './AppPreview.module.scss';

interface AppPreviewProps {
    seeds: TenantSeeds;
}

const NAV_ITEMS: Array<{ key: string; icon: string; selected?: boolean }> = [
    { key: 'enquiries', icon: '📥' },
    { key: 'sessions', icon: '💬', selected: true },
    { key: 'timeline', icon: '📈' },
    { key: 'drafts', icon: '📝' },
    { key: 'profile', icon: '👤' },
];

const TOOLBAR_GLYPHS = ['↺', '↻', 'H', 'B', 'I', 'U', '≔', '🔗'];

/**
 * A miniature of the real counselling app — navigation rail, session
 * list with topic chips, chat history and message editor — painted
 * exclusively through the --m3-* custom properties the OrisoScheme
 * engine emits, scoped to this container. Repaints on every seed
 * change; sessions are clickable to walk through the nuances.
 */
export const AppPreview = ({ seeds }: AppPreviewProps) => {
    const { t } = useTranslation();
    const [selectedSession, setSelectedSession] = useState(0);
    const palette = useMemo(() => {
        if (!seeds.primary) {
            return null;
        }
        try {
            return computeOrisoPalette({ primary: seeds.primary, accent: seeds.accent, signal: seeds.signal }, 'light');
        } catch {
            // Mid-drag values can be momentarily invalid — keep the page alive.
            return null;
        }
    }, [seeds.primary, seeds.accent, seeds.signal]);

    if (!palette) {
        return <div className={styles.empty}>{t('theme.builder.preview.empty')}</div>;
    }

    const typeLabel = (type: string) => t(`theme.builder.preview.type.${type}`);

    return (
        <div className={styles.app} style={palette.tokens as CSSProperties} data-testid="app-preview">
            <nav className={styles.navRail}>
                {NAV_ITEMS.map((item) => (
                    <div key={item.key} className={styles.navItem} data-selected={!!item.selected}>
                        <span className={styles.navIcon} aria-hidden>
                            {item.icon}
                        </span>
                        <span className={styles.navLabel}>{t(`theme.builder.preview.nav.${item.key}`)}</span>
                    </div>
                ))}
                <div className={styles.navSpacer} />
                <div className={styles.navItem}>
                    <span className={`${styles.navIcon} ${styles.navIconLive}`} aria-hidden>
                        📡
                    </span>
                    <span className={styles.navLabel}>{t('theme.builder.preview.nav.liveChat')}</span>
                </div>
                <div className={styles.navItem}>
                    <span className={styles.navIcon} aria-hidden>
                        🌐
                    </span>
                    <span className={styles.navLabel}>{t('theme.builder.preview.nav.language')}</span>
                </div>
            </nav>

            <section className={styles.sessionList}>
                <div className={styles.search}>
                    <span>{t('theme.builder.preview.search')}</span>
                    <span aria-hidden>🔍</span>
                </div>
                {PREVIEW_SESSIONS.map((session, index) => (
                    <button
                        key={session.name}
                        type="button"
                        className={styles.session}
                        data-testid="app-preview-session"
                        data-selected={index === selectedSession}
                        onClick={() => setSelectedSession(index)}
                    >
                        <span className={styles.sessionTop}>
                            {session.topic ? (
                                <span className={styles.topicChip}>
                                    {session.topic}
                                    {session.caseId && <span className={styles.caseId}>{session.caseId}</span>}
                                </span>
                            ) : (
                                <span className={styles.groupChip}>+23 👥</span>
                            )}
                            <span className={styles.timestamp}>{t('theme.builder.preview.now')}</span>
                        </span>
                        <span className={styles.sessionName}>
                            <span className={styles.avatar} aria-hidden>
                                {session.avatar}
                            </span>
                            {session.topic ? session.name : `${session.name} Caritas`}
                        </span>
                        <span className={styles.sessionBottom}>
                            <span className={styles.lastMessage}>{session.lastMessage}</span>
                            <span className={styles.sessionType}>{typeLabel(session.type)}</span>
                        </span>
                    </button>
                ))}
            </section>

            <section className={styles.chatPane}>
                <header className={styles.chatHeader}>
                    <span className={styles.memberChip}>+0</span>
                    <span className={styles.groupName}>{PREVIEW_GROUP_NAME}</span>
                    <span className={styles.callIcons} aria-hidden>
                        <span className={styles.callIcon}>🎥</span>
                        <span className={styles.callIcon}>📞</span>
                    </span>
                </header>
                <div className={styles.topicTag}>{PREVIEW_TOPIC_TAG}</div>
                <div className={styles.messages}>
                    {PREVIEW_MESSAGES.map((message) =>
                        message.direction === 'client' ? (
                            <div
                                key={message.text}
                                className={styles.messageClient}
                                data-testid="app-preview-message-client"
                            >
                                <span className={styles.avatar} aria-hidden>
                                    {message.avatar}
                                </span>
                                <span>
                                    <span className={styles.messageAuthor}>{message.author}</span>
                                    <span className={styles.bubbleClient}>{message.text}</span>
                                </span>
                            </div>
                        ) : (
                            <div key={message.text} className={styles.messageOwn} data-testid="app-preview-message-own">
                                <span className={styles.messageAuthor}>{message.author}</span>
                                <span className={styles.bubbleOwn}>{message.text}</span>
                                <span className={styles.sendError}>{t('theme.builder.preview.editor.failed')}</span>
                            </div>
                        ),
                    )}
                </div>
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
            </section>
        </div>
    );
};
