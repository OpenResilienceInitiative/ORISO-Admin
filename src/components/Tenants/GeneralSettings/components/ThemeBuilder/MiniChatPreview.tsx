import { CSSProperties, useMemo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as AddIcon } from '../../../../../resources/img/svg/theme-preview/add.svg';
import { ReactComponent as AudioCallIcon } from '../../../../../resources/img/svg/theme-preview/audio-call.svg';
import { ReactComponent as AvatarCounselorIcon } from '../../../../../resources/img/svg/theme-preview/avatar-counselor.svg';
import { ReactComponent as BulletListIcon } from '../../../../../resources/img/svg/theme-preview/bullet-list.svg';
import { ReactComponent as CheckmarkIcon } from '../../../../../resources/img/svg/theme-preview/checkmark-a.svg';
import { ReactComponent as EditorCloseIcon } from '../../../../../resources/img/svg/theme-preview/icons-editor.svg';
import { ReactComponent as HeadingIcon } from '../../../../../resources/img/svg/theme-preview/headings.svg';
import { ReactComponent as ArrowDropDownIcon } from '../../../../../resources/img/svg/theme-preview/arrow-drop-down.svg';
import { ReactComponent as ArrowLeftIcon } from '../../../../../resources/img/svg/theme-preview/arrow-left.svg';
import { ReactComponent as MoreVerticalIcon } from '../../../../../resources/img/svg/theme-preview/more-vertical.svg';
import { ReactComponent as MoreVertIcon } from '../../../../../resources/img/svg/theme-preview/more-vert.svg';
import { ReactComponent as RedoIcon } from '../../../../../resources/img/svg/theme-preview/redo.svg';
import { ReactComponent as SendMessageIcon } from '../../../../../resources/img/svg/theme-preview/send-message.svg';
import { ReactComponent as UndoIcon } from '../../../../../resources/img/svg/theme-preview/undo.svg';
import { ReactComponent as VideoCallIcon } from '../../../../../resources/img/svg/theme-preview/video-call.svg';
import { computeOrisoPalette } from '../../../../../utils/theme/orisoScheme';
import { getAccentDark, getAccentLight, TenantSeeds } from '../../../../../utils/themeSeeds';
import styles from './styles.module.scss';

interface MiniChatPreviewProps {
    seeds: TenantSeeds;
    labelKey: string;
    className?: string;
    previewClassName?: string;
    hideLabel?: boolean;
}

export const MiniChatPreview = ({ seeds, labelKey, className, previewClassName, hideLabel }: MiniChatPreviewProps) => {
    const { t } = useTranslation();
    const accentDark = getAccentDark(seeds);
    const accentLight = getAccentLight(seeds);
    const palette = useMemo(() => computeOrisoPalette(seeds), [accentDark, accentLight]);

    return (
        <div className={classNames(styles.previewColumn, className)}>
            {!hideLabel && <span className={styles.previewLabel}>{t(labelKey)}</span>}
            <div className={classNames(styles.preview, previewClassName)} style={palette.tokens as CSSProperties}>
                <header className={styles.roomHeader}>
                    <div className={styles.roomHeaderContent}>
                        <div className={styles.roomHeaderTop}>
                            <strong className={styles.roomTitle}>{t('theme.builder.preview.groupName')}</strong>
                            <span className={styles.roundAction} aria-hidden="true">
                                <AudioCallIcon />
                            </span>
                            <span className={styles.videoAction} aria-hidden="true">
                                <VideoCallIcon />
                            </span>
                            <span className={styles.menuAction} aria-hidden="true">
                                <MoreVerticalIcon />
                            </span>
                        </div>
                        <div className={styles.roomHeaderBottom}>
                            <div className={styles.avatarCluster} aria-hidden="true">
                                <span className={styles.addAvatar}>
                                    <AddIcon />
                                </span>
                                <span className={styles.counsellorAvatar}>
                                    <AvatarCounselorIcon />
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className={styles.topicDivider}>
                    <span>{t('theme.builder.preview.topic')}</span>
                </div>

                <main className={styles.chatCanvas}>
                    <section className={styles.outgoingGroup}>
                        <div className={styles.outgoingBubble}>
                            <p>{t('theme.builder.preview.messageOutLong')}</p>
                            <span className={styles.messageMeta}>
                                22:01 <CheckmarkIcon aria-hidden="true" />
                            </span>
                        </div>
                        <span className={styles.outgoingMenu} aria-hidden="true">
                            <MoreVertIcon />
                        </span>
                        <div className={styles.recipientLine}>
                            <strong>{t('theme.builder.preview.counsellorName')}</strong>
                            <span>{t('theme.builder.preview.agencyName')}</span>
                        </div>
                        <span className={styles.redAvatar} aria-hidden="true">
                            <AvatarCounselorIcon />
                        </span>
                    </section>
                </main>

                <footer className={styles.composer}>
                    <div className={styles.mobileComposerNav} aria-hidden="true">
                        <span>
                            <ArrowLeftIcon />
                        </span>
                        <span className={styles.dragHandle} />
                        <span>
                            <ArrowDropDownIcon />
                        </span>
                    </div>
                    <div className={styles.editorBox}>
                        <div className={styles.editorToolbar} aria-hidden="true">
                            <EditorCloseIcon />
                            <UndoIcon />
                            <RedoIcon />
                            <span className={styles.toolbarDivider} />
                            <span className={styles.toolbarIconWithCaret}>
                                <HeadingIcon />
                            </span>
                            <span className={styles.toolbarIconWithCaret}>
                                <BulletListIcon />
                            </span>
                            <span className={styles.toolbarDivider} />
                            <MoreVertIcon />
                            <strong className={styles.sendAction}>
                                <SendMessageIcon />
                            </strong>
                        </div>
                        <p>{t('theme.builder.preview.inputPlaceholder')}</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};
