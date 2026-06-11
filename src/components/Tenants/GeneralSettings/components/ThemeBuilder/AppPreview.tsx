import { CSSProperties, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { computeOrisoPalette } from '../../../../../utils/theme/orisoScheme';
import { TenantSeeds } from '../../../../../utils/themeSeeds';
import { ChatHistoryScreen } from './screens/ChatHistoryScreen';
import { DesktopScreen } from './screens/DesktopScreen';
import { LoginScreen } from './screens/LoginScreen';
import { MobileChatScreen } from './screens/MobileChatScreen';
import styles from './AppPreview.module.scss';

export type PreviewScreenKey = 'desktop' | 'chatHistory' | 'mobile' | 'login';

export const PREVIEW_SCREEN_KEYS: PreviewScreenKey[] = ['desktop', 'chatHistory', 'mobile', 'login'];

const SCREENS: Record<PreviewScreenKey, () => JSX.Element> = {
    desktop: DesktopScreen,
    chatHistory: ChatHistoryScreen,
    mobile: MobileChatScreen,
    login: LoginScreen,
};

interface AppPreviewProps {
    seeds: TenantSeeds;
    screen?: PreviewScreenKey;
}

/**
 * Paints one screen of the counselling app exclusively through the
 * --m3-* custom properties the OrisoScheme engine emits, scoped to the
 * frame. Repaints on every seed change — the live wire between the
 * pickers and the preview.
 */
export const AppPreview = ({ seeds, screen = 'desktop' }: AppPreviewProps) => {
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

    if (!palette) {
        return <div className={styles.empty}>{t('theme.builder.preview.empty')}</div>;
    }

    const Screen = SCREENS[screen];

    return (
        <div className={styles.frame} style={palette.tokens as CSSProperties} data-testid="app-preview">
            <Screen />
        </div>
    );
};
