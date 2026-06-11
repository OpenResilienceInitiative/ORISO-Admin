import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PREVIEW_GROUP_NAME, PREVIEW_SESSIONS, PREVIEW_TOPIC_TAG } from '../previewData';
import { ChatMessages, MessageEditor } from './ChatParts';
import shell from '../AppPreview.module.scss';
import styles from './screens.module.scss';

const NAV_ITEMS: Array<{ key: string; icon: string; selected?: boolean }> = [
    { key: 'enquiries', icon: '📥' },
    { key: 'sessions', icon: '💬', selected: true },
    { key: 'timeline', icon: '📈' },
    { key: 'drafts', icon: '📝' },
    { key: 'profile', icon: '👤' },
];

/**
 * The whole desktop app at a glance: navigation rail, session list
 * with Beratungsthema chips, chat pane. Sessions are clickable to walk
 * through the nuances.
 */
export const DesktopScreen = () => {
    const { t } = useTranslation();
    const [selectedSession, setSelectedSession] = useState(0);

    const typeLabel = (type: string) => t(`theme.builder.preview.type.${type}`);

    return (
        <div className={shell.desktop}>
            <nav className={shell.navRail}>
                {NAV_ITEMS.map((item) => (
                    <div key={item.key} className={shell.navItem} data-selected={!!item.selected}>
                        <span className={shell.navIcon} aria-hidden>
                            {item.icon}
                        </span>
                        <span className={shell.navLabel}>{t(`theme.builder.preview.nav.${item.key}`)}</span>
                    </div>
                ))}
                <div className={shell.navSpacer} />
                <div className={shell.navItem}>
                    <span className={`${shell.navIcon} ${shell.navIconLive}`} aria-hidden>
                        📡
                    </span>
                    <span className={shell.navLabel}>{t('theme.builder.preview.nav.liveChat')}</span>
                </div>
                <div className={shell.navItem}>
                    <span className={shell.navIcon} aria-hidden>
                        🌐
                    </span>
                    <span className={shell.navLabel}>{t('theme.builder.preview.nav.language')}</span>
                </div>
            </nav>

            <section className={shell.sessionList}>
                <div className={shell.search}>
                    <span>{t('theme.builder.preview.search')}</span>
                    <span aria-hidden>🔍</span>
                </div>
                {PREVIEW_SESSIONS.map((session, index) => (
                    <button
                        key={session.name}
                        type="button"
                        className={shell.session}
                        data-testid="app-preview-session"
                        data-selected={index === selectedSession}
                        onClick={() => setSelectedSession(index)}
                    >
                        <span className={shell.sessionTop}>
                            {session.topic ? (
                                <span className={shell.topicChip}>
                                    {session.topic}
                                    {session.caseId && <span className={shell.caseId}>{session.caseId}</span>}
                                </span>
                            ) : (
                                <span className={shell.groupChip}>+23 👥</span>
                            )}
                            <span className={shell.timestamp}>{t('theme.builder.preview.now')}</span>
                        </span>
                        <span className={shell.sessionName}>
                            <span className={shell.avatar} aria-hidden>
                                {session.avatar}
                            </span>
                            {session.topic ? session.name : `${session.name} Caritas`}
                        </span>
                        <span className={shell.sessionBottom}>
                            <span className={shell.lastMessage}>{session.lastMessage}</span>
                            <span className={shell.sessionType}>{typeLabel(session.type)}</span>
                        </span>
                    </button>
                ))}
            </section>

            <section className={shell.chatPane}>
                <header className={styles.chatHeader}>
                    <span className={styles.memberChip}>+0</span>
                    <span className={styles.groupName}>{PREVIEW_GROUP_NAME}</span>
                    <span className={styles.callIcon} aria-hidden>
                        🎥
                    </span>
                    <span className={styles.callIcon} aria-hidden>
                        📞
                    </span>
                </header>
                <div className={styles.topicTag}>{PREVIEW_TOPIC_TAG}</div>
                <ChatMessages compact />
                <MessageEditor />
            </section>
        </div>
    );
};
