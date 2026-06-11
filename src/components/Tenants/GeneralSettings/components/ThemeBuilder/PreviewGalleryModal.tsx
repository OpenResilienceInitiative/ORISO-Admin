import { Button, Modal, Radio } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TenantSeeds } from '../../../../../utils/themeSeeds';
import { AppPreview, PREVIEW_SCREEN_KEYS } from './AppPreview';
import styles from './styles.module.scss';

interface PreviewGalleryModalProps {
    open: boolean;
    onClose: () => void;
    draftSeeds: TenantSeeds;
    storedSeeds: TenantSeeds;
}

/**
 * The big preview: a modal gallery paging through the app screens
 * (desktop, chat history, mobile chat room, login), each with a
 * Vorher/Nachher comparison of stored vs draft seeds.
 */
export const PreviewGalleryModal = ({ open, onClose, draftSeeds, storedSeeds }: PreviewGalleryModalProps) => {
    const { t } = useTranslation();
    const [screenIndex, setScreenIndex] = useState(0);
    const [view, setView] = useState<'current' | 'new'>('new');
    const screenKey = PREVIEW_SCREEN_KEYS[screenIndex];

    const step = (delta: number) =>
        setScreenIndex((index) => (index + delta + PREVIEW_SCREEN_KEYS.length) % PREVIEW_SCREEN_KEYS.length);

    return (
        <Modal open={open} onCancel={onClose} footer={null} width={1040} destroyOnClose>
            <div className={styles.galleryHeader}>
                <Button data-testid="gallery-prev" onClick={() => step(-1)} aria-label="previous">
                    ‹
                </Button>
                <span className={styles.galleryCaption}>{t(`theme.builder.preview.screen.${screenKey}`)}</span>
                <Button data-testid="gallery-next" onClick={() => step(1)} aria-label="next">
                    ›
                </Button>
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
            <AppPreview seeds={view === 'new' ? draftSeeds : storedSeeds} screen={screenKey} />
            <div className={styles.galleryDots}>
                {PREVIEW_SCREEN_KEYS.map((key, index) => (
                    <span key={key} className={styles.galleryDot} data-selected={index === screenIndex} />
                ))}
            </div>
        </Modal>
    );
};
