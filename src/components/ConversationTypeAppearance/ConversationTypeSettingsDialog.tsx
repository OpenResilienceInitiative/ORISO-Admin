import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { FloatingLabelInput } from '../FloatingLabelInput';
import {
    MODULE_LANGUAGES,
    MODULE_SOURCE_LANGUAGE,
    type ConversationType,
} from '../ConversationModules/conversationModule';
import {
    ICON_VARIANTS,
    nameOf,
    setIcon,
    setName,
    svgDataUrl,
    validateSvg,
    type AppearanceSettings,
    type IconVariant,
} from './appearance';
import { TypeIcon } from './TypeIcon';
import type { Translator } from '../Journeys/journeyTranslation';
import { getTranslationErrorKey } from '../Tenants/LegalSettings/utils/translationErrors';
import { useDiscardGuard } from '../Journeys/useDiscardGuard';
import styles from './styles.module.scss';

export interface ConversationTypeSettingsDialogProps {
    type: ConversationType;
    settings: AppearanceSettings;
    /** Machine translation through the Admin endpoint; without it none is offered. */
    translator?: Translator;
    onSave: (settings: AppearanceSettings) => void;
    onClose: () => void;
}

/**
 * Name and icon of one conversation type (ADR-036 decision 21). Platform admin only; stored in
 * the global configuration. Everything that names the type — Funktionszugriff, Journeys, the
 * advice seeker's app — reads it from there.
 */
export const ConversationTypeSettingsDialog = ({
    type,
    settings,
    translator,
    onSave,
    onClose,
}: ConversationTypeSettingsDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<AppearanceSettings>(settings);
    const guard = useDiscardGuard(draft, settings, onClose);
    const [errors, setErrors] = useState<Partial<Record<IconVariant, string>>>({});
    const inputs = useRef<Partial<Record<IconVariant, HTMLInputElement | null>>>({});

    const shipped = t(`conversationModules.type.${type}`);
    const name = draft[type]?.name ?? {};
    const missing = MODULE_LANGUAGES.filter((code) => !name[code]?.trim());
    const german = name.de?.trim();

    const [translationError, setTranslationError] = useState<string>();
    const [translating, setTranslating] = useState(false);
    const translateMissing = async () => {
        if (!translator || !german) return;
        setTranslating(true);
        setTranslationError(undefined);
        try {
            const response = await translator({
                sourceLang: MODULE_SOURCE_LANGUAGE,
                targetLangs: missing,
                texts: { name: german },
            });
            // Only names still empty when the answer arrives: a name typed meanwhile stays, and a
            // German name changed meanwhile is not answered with the old one's translation.
            setDraft((current) => {
                if (current[type]?.name?.de?.trim() !== german) return current;
                return missing.reduce((next, code) => {
                    const translated = response.translations[code]?.name;
                    return translated && !next[type]?.name?.[code]?.trim()
                        ? setName(next, type, code, translated)
                        : next;
                }, current);
            });
        } catch (error) {
            setTranslationError(getTranslationErrorKey(error));
        } finally {
            setTranslating(false);
        }
    };

    const upload = async (variant: IconVariant, event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // eslint-disable-next-line no-param-reassign -- lets the same file be chosen again
        event.target.value = '';
        if (!file) return;
        const check = validateSvg(await file.text());
        if ('reason' in check) {
            const message = t(`typeAppearance.error.${check.reason}`);
            setErrors((current) => ({ ...current, [variant]: message }));
            return;
        }
        setErrors((current) => ({ ...current, [variant]: undefined }));
        const { svg } = check;
        setDraft((current) => setIcon(current, type, variant, svg));
    };

    const shownName = nameOf(draft, type, MODULE_SOURCE_LANGUAGE, shipped);

    return (
        <Modal
            icon={<TuneOutlined />}
            title={t('typeAppearance.title', { type: nameOf(settings, type, MODULE_SOURCE_LANGUAGE, shipped) })}
            descriptionKey="typeAppearance.description"
            descriptionFullWidth
            width={720}
            zIndex={1100}
            footer={
                <div className={styles.footer}>
                    <M3Button variant="text" onClick={onClose}>
                        {t('journeys.action.cancel')}
                    </M3Button>
                    <M3Button variant="filled" onClick={() => onSave(draft)}>
                        {t('journeys.action.save')}
                    </M3Button>
                </div>
            }
            onClose={onClose}
            onDismiss={guard.onDismiss}
            wrapperTestId="type-appearance-dialog"
            scrollableBody
        >
            {guard.confirm}
            <div className={styles.body}>
                <section className={styles.section} aria-labelledby="type-appearance-name">
                    <div className={styles.row}>
                        <h3 className={styles.sectionTitle} id="type-appearance-name">
                            {t('typeAppearance.name')}
                        </h3>
                        {translator && missing.length > 0 && (
                            <M3Button
                                variant="text"
                                icon={<AutoAwesomeOutlined />}
                                disabled={!german}
                                loading={translating}
                                onClick={translateMissing}
                            >
                                {t('journeys.translation.ai')}
                            </M3Button>
                        )}
                    </div>
                    {translationError && (
                        <p className={styles.error} role="alert">
                            {t(translationError)}
                        </p>
                    )}
                    <div className={styles.names}>
                        {MODULE_LANGUAGES.map((code) => (
                            <FloatingLabelInput
                                key={code}
                                label={t(`language.${code}`, code)}
                                placeholder={code === MODULE_SOURCE_LANGUAGE ? shipped : german || shipped}
                                value={name[code] ?? ''}
                                onChange={(event) =>
                                    setDraft((current) => setName(current, type, code, event.target.value))
                                }
                            />
                        ))}
                    </div>
                    <p className={styles.help}>
                        {missing.length === 0
                            ? t('typeAppearance.allLanguages')
                            : t('typeAppearance.missingLanguages', {
                                  languages: missing.map((code) => t(`language.${code}`, code)).join(', '),
                              })}
                    </p>
                </section>

                <section className={styles.section} aria-labelledby="type-appearance-icons">
                    <h3 className={styles.sectionTitle} id="type-appearance-icons">
                        {t('typeAppearance.icons')}
                    </h3>
                    <p className={styles.help}>{t('typeAppearance.iconsHelp')}</p>
                    <div className={styles.icons}>
                        {ICON_VARIANTS.map((variant) => {
                            const svg = draft[type]?.icons[variant];
                            return (
                                <div key={variant} className={styles.icon} data-testid={`type-icon-${variant}`}>
                                    <span className={styles.iconTitle}>{t(`typeAppearance.variant.${variant}`)}</span>
                                    <span className={styles.iconPreview}>
                                        {svg ? (
                                            <img
                                                src={svgDataUrl(svg)}
                                                alt={t(`typeAppearance.variant.${variant}`)}
                                                width={40}
                                                height={40}
                                            />
                                        ) : (
                                            <span className={styles.iconEmpty}>{t('typeAppearance.noIcon')}</span>
                                        )}
                                    </span>
                                    <span className={styles.help}>{t(`typeAppearance.variantHelp.${variant}`)}</span>
                                    <input
                                        ref={(node) => {
                                            inputs.current[variant] = node;
                                        }}
                                        type="file"
                                        accept=".svg,image/svg+xml"
                                        className={styles.fileInput}
                                        aria-label={t(`typeAppearance.variant.${variant}`)}
                                        data-testid={`type-icon-input-${variant}`}
                                        onChange={(event) => upload(variant, event)}
                                    />
                                    {errors[variant] && (
                                        <p className={styles.error} role="alert">
                                            {errors[variant]}
                                        </p>
                                    )}
                                    <div className={styles.iconActions}>
                                        <M3Button
                                            variant="outlined"
                                            icon={<FileUploadOutlined />}
                                            onClick={() => inputs.current[variant]?.click()}
                                        >
                                            {t(svg ? 'typeAppearance.replace' : 'typeAppearance.upload')}
                                        </M3Button>
                                        {svg && (
                                            <M3Button
                                                variant="text"
                                                onClick={() =>
                                                    setDraft((current) => setIcon(current, type, variant, undefined))
                                                }
                                            >
                                                {t('typeAppearance.remove')}
                                            </M3Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className={styles.section} aria-labelledby="type-appearance-preview">
                    <h3 className={styles.sectionTitle} id="type-appearance-preview">
                        {t('typeAppearance.preview')}
                    </h3>
                    <div className={styles.preview} data-testid="type-appearance-preview">
                        <span className={styles.previewItem}>
                            <TypeIcon type={type} appearance={draft} variant="outline200" />
                            {shownName}
                        </span>
                        <span className={styles.previewItem}>
                            <TypeIcon type={type} appearance={draft} variant="outline400" />
                            {shownName}
                        </span>
                        <span className={classNames(styles.previewItem, styles.previewSelected)}>
                            <TypeIcon type={type} appearance={draft} variant="filled" />
                            {shownName}
                        </span>
                    </div>
                    <p className={styles.help}>{t('typeAppearance.previewHelp')}</p>
                </section>
            </div>
        </Modal>
    );
};
