import { CSSProperties, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { computeOrisoPalette } from '../../../../../utils/theme/orisoScheme';
import { TenantSeeds } from '../../../../../utils/themeSeeds';
import styles from './styles.module.scss';

interface MiniChatPreviewProps {
    seeds: TenantSeeds;
    labelKey: string;
}

/**
 * Static mini chat mock, painted exclusively through the --m3-* custom
 * properties that the OrisoScheme engine emits — the same names the
 * live app consumes, scoped to this container. Repaints on every seed
 * change because the palette is recomputed from the props.
 */
export const MiniChatPreview = ({ seeds, labelKey }: MiniChatPreviewProps) => {
    const { t } = useTranslation();
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

    return (
        <div className={styles.previewColumn}>
            <span className={styles.previewLabel}>{t(labelKey)}</span>
            {palette ? (
                <div className={styles.preview} style={palette.tokens as CSSProperties} data-testid="mini-chat-preview">
                    <div className={styles.previewHeader}>{t('theme.builder.preview.headline')}</div>
                    <div className={styles.previewBody}>
                        <div className={styles.bubbleCounsellor}>{t('theme.builder.preview.messageIn')}</div>
                        <div className={styles.bubbleUser}>{t('theme.builder.preview.messageOut')}</div>
                        <div className={styles.errorHint}>{t('theme.builder.preview.error')}</div>
                    </div>
                    <div className={styles.previewFooter}>
                        <span className={styles.inputMock}>{t('theme.builder.preview.inputPlaceholder')}</span>
                        <span className={styles.sendButton}>{t('theme.builder.preview.send')}</span>
                    </div>
                </div>
            ) : (
                <div className={styles.previewEmpty}>{t('theme.builder.preview.empty')}</div>
            )}
        </div>
    );
};
