import { Image } from 'antd';
import { cloneElement, isValidElement, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { localizedText, type AddonApp } from '../../addons/addonTypes';
import styles from './addons.module.scss';

const SLOT_LABEL_KEYS: Record<string, string> = {
    'asker.navigation': 'addons.slot.askerNavigation',
    'consultant.navigation': 'addons.slot.consultantNavigation',
    'consultant.session': 'addons.slot.consultantSession',
    'consultant.asker-profile': 'addons.slot.consultantAskerProfile',
    'admin.page': 'addons.slot.adminPage',
};

const isHttps = (url: string) => {
    try {
        return new URL(url).protocol === 'https:';
    } catch {
        return false;
    }
};

interface Thumbnail {
    src: string;
    alt: string;
}

interface AddonFeaturesProps {
    apps: AddonApp[];
}

/** Where each app of an add-on appears, with the screenshots the add-on provides per place. */
export const AddonFeatures = ({ apps }: AddonFeaturesProps) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || 'de';
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    if (apps.length === 0) {
        return null;
    }

    const slotLabel = (slot: string) => (SLOT_LABEL_KEYS[slot] ? String(t(SLOT_LABEL_KEYS[slot])) : slot);

    const thumbnails: Thumbnail[] = [];
    const features = apps.map((app) => {
        const title = localizedText(app.title, language, app.id);
        const slots = (app.slots ?? []).map((slot) => {
            const label = slotLabel(slot);
            const shots = (app.screenshots ?? [])
                .filter((shot) => shot.slot === slot && isHttps(shot.url))
                .map((shot) => {
                    thumbnails.push({
                        src: shot.url,
                        alt: shot.caption ? localizedText(shot.caption, language, '') : `${title}, ${label}`,
                    });
                    return { index: thumbnails.length - 1, ...thumbnails[thumbnails.length - 1] };
                });
            return { slot, label, shots };
        });
        return { id: app.id, title, slots };
    });

    return (
        <div className={styles.apps}>
            <ul className={styles.appList}>
                {features.map((app) => (
                    <li key={app.id}>
                        <strong>{app.title}</strong>
                        <ul className={styles.slotList}>
                            {app.slots.map(({ slot, label, shots }) => (
                                <li key={slot}>
                                    <span title={slot}>{label}</span>
                                    {shots.length > 0 && (
                                        <div className={styles.screenshots}>
                                            {shots.map((shot) => (
                                                <button
                                                    key={shot.index}
                                                    type="button"
                                                    className={styles.screenshot}
                                                    onClick={() => setPreviewIndex(shot.index)}
                                                >
                                                    <img src={shot.src} alt={shot.alt} loading="lazy" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
            {thumbnails.length > 0 && (
                <Image.PreviewGroup
                    items={thumbnails}
                    preview={{
                        visible: previewIndex !== null,
                        current: previewIndex ?? 0,
                        onChange: setPreviewIndex,
                        // rc-image drops the alt of preview items, so it is set again here.
                        imageRender: (node, { current }) =>
                            isValidElement(node)
                                ? cloneElement(node as ReactElement<{ alt?: string }>, {
                                      alt: thumbnails[current]?.alt,
                                  })
                                : node,
                        onVisibleChange: (visible) => {
                            if (!visible) {
                                setPreviewIndex(null);
                            }
                        },
                    }}
                />
            )}
        </div>
    );
};

export default AddonFeatures;
