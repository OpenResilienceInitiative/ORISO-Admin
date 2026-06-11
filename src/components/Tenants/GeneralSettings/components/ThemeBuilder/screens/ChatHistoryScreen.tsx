import { PREVIEW_GROUP_NAME, PREVIEW_TOPIC_TAG } from '../previewData';
import { ChatMessages, MessageEditor } from './ChatParts';
import styles from './screens.module.scss';

/** The chat history at full size — where the bubbles show best. */
export const ChatHistoryScreen = () => (
    <div className={styles.chatHistory}>
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
        <ChatMessages />
        <MessageEditor />
    </div>
);
