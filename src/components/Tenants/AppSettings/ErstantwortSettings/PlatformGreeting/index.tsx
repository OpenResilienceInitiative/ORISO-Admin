import { useMemo, useState } from 'react';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import ChatOutlined from '@mui/icons-material/ChatOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Card } from '../../../../Card';
import { M3Button } from '../../../../M3Button';
import { Notify } from '../../../../Notify';
import { M3RichTextEditor, type EditorVersionSection } from '../../../../FormPluginEditor/M3RichTextEditor';
import { LegalContentLanguageSelect } from '../../../LegalSettings/components/LegalContentLanguageSelect';
import { TranslateOnPublishModal } from '../../../LegalSettings/components/TranslateOnPublishModal';
import { getTranslationErrorKey } from '../../../LegalSettings/utils/translationErrors';
import { metaKeyFor } from '../../../LegalSettings/utils/translationMeta';
import {
    useErstantwortPlatformTexts,
    useSaveErstantwortPlatformTexts,
} from '../../../../../hooks/useErstantwortPlatformTexts.hook';
import { useTranslateLegalContent } from '../../../../../hooks/useTranslateLegalContent.hook';
import styles from '../ErstantwortTextsCard/styles.module.scss';
import {
    PLATFORM_GREETING_KEYS,
    PLATFORM_LANGUAGES,
    PLATFORM_SOURCE_LANGUAGE,
    PLATFORM_TRANSLATION_TARGETS,
    applyPlatformTranslations,
    buildPlatformPayload,
    changedPlatformKeys,
    collectPlatformSourceTexts,
    languagesWithoutText,
    purgeStalePlatformTranslations,
    type PlatformGreetingKey,
    type PlatformTextMap,
} from './platformGreeting';

const isGerman = (language: string) => language.startsWith('de');

const escapeHtml = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const plainTextToHtml = (text: string) =>
    text
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => `<p>${escapeHtml(line.trim())}</p>`)
        .join('');

/**
 * Settings → Begrüßung (platform admin). The platform level of the Erstantwort chain (ADR-018 §6):
 * Beratungsstelle → Träger → **platform** → built-in Caritas default. Every install ships the
 * Caritas texts in seven language versions; what is written here replaces them for every Träger
 * that has not written its own text. Publishing follows the Träger editor: a changed formal German
 * text can be machine-translated into the other languages through the configured translation
 * provider (POST /tenantadmin/translate); a language left empty falls back to the Caritas default
 * in that language, never to another language.
 */
export const PlatformGreetingSettings = () => {
    const { t } = useTranslation();
    const { data, isLoading, isError } = useErstantwortPlatformTexts();
    const { mutateAsync: save, isPending: isSaving } = useSaveErstantwortPlatformTexts();
    const { translate, isTranslating } = useTranslateLegalContent();

    const stored = useMemo<PlatformTextMap>(() => data?.texts ?? {}, [data?.texts]);
    const [edits, setEdits] = useState<PlatformTextMap>({});
    const [language, setLanguage] = useState<string>(PLATFORM_SOURCE_LANGUAGE);
    const [openKey, setOpenKey] = useState<PlatformGreetingKey>(PLATFORM_GREETING_KEYS[0]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalErrorKey, setModalErrorKey] = useState<string | null>(null);

    const content = useMemo<PlatformTextMap>(() => {
        const merged: PlatformTextMap = { ...stored };
        (Object.keys(edits) as PlatformGreetingKey[]).forEach((key) => {
            merged[key] = { ...(stored[key] ?? {}), ...edits[key] };
        });
        return merged;
    }, [stored, edits]);

    const changed = changedPlatformKeys(content, stored);
    const sourceTexts = collectPlatformSourceTexts(content, changed);
    const purged = purgeStalePlatformTranslations(content, stored);

    const handleChange = (key: PlatformGreetingKey, html: string) => {
        setEdits((previous) => {
            const next = { ...(previous[key] ?? stored[key] ?? {}), [language]: html };
            // A hand edit of a translation makes it the admin's own text, no longer a machine one.
            if (!isGerman(language) && metaKeyFor(language) in next) next[metaKeyFor(language)] = '';
            return { ...previous, [key]: next };
        });
    };

    const resetToDefault = (key: PlatformGreetingKey) => {
        const current = content[key] ?? {};
        setEdits((previous) => ({
            ...previous,
            [key]: Object.fromEntries(Object.keys(current).map((k) => [k, ''])),
        }));
    };

    const publish = async (published: PlatformTextMap) => {
        const sent = edits;
        try {
            await save(buildPlatformPayload(published));
            // A keystroke during the request replaces `edits`. Clearing only the map we sent keeps that keystroke.
            setEdits((current) => (current === sent ? {} : current));
        } catch {
            // The edits stay on screen for another attempt.
        }
    };

    const requestPublish = () => {
        if (Object.keys(sourceTexts).length === 0) {
            publish(purged);
            return;
        }
        setModalErrorKey(null);
        setModalOpen(true);
    };

    const translateAndPublish = async (languages: string[]) => {
        setModalErrorKey(null);
        let translated: PlatformTextMap;
        try {
            const response = await translate({
                sourceLang: PLATFORM_SOURCE_LANGUAGE,
                targetLangs: languages,
                texts: sourceTexts,
            });
            const selected = Object.fromEntries(
                Object.entries(response.translations ?? {}).filter(([target]) => languages.includes(target)),
            );
            translated = applyPlatformTranslations(purged, selected, new Date().toISOString());
        } catch (error) {
            setModalErrorKey(getTranslationErrorKey(error));
            return;
        }
        setModalOpen(false);
        setEdits(translated);
        await publish(translated);
    };

    if (isLoading) return <Spin />;
    if (isError || !data) {
        return (
            <div id="platform-greeting-state">
                <Notify
                    title={t('notify.title.erstantwort')}
                    severity="error"
                    quietText={t('notify.tile.notLoaded')}
                    causeKey="platform-greeting:load"
                    jump="platform-greeting-state"
                    retry
                >
                    {t('message.error.default')}
                </Notify>
            </div>
        );
    }

    const builtInSections = (key: PlatformGreetingKey, text: string | undefined): EditorVersionSection[] => {
        const label = t('settings.greeting.loadBuiltIn');
        return [
            {
                key: 'built-in',
                title: t('settings.greeting.builtInSection'),
                versions: text
                    ? [
                          {
                              id: `built-in:${key}:${language}`,
                              label,
                              name: label,
                              detail: t('settings.greeting.builtInDetail'),
                              content: plainTextToHtml(text),
                              restorable: true,
                          },
                      ]
                    : [],
                emptyLabel: t('settings.greeting.noBuiltIn'),
            },
        ];
    };

    return (
        <>
            <Card
                headerIcon={<ChatOutlined />}
                titleKey="settings.greeting.title"
                variant="dialog"
                autoHeight
                className={styles.card}
                dataTestId="platform-greeting-card"
                footer={
                    <M3Button variant="filled" onClick={requestPublish} loading={isSaving} disabled={isTranslating}>
                        {t('settings.greeting.publish')}
                    </M3Button>
                }
            >
                <div className={styles.body}>
                    <section className={styles.section}>
                        <p className={styles.help}>{t('settings.greeting.intro')}</p>
                        <LegalContentLanguageSelect
                            languages={[...PLATFORM_LANGUAGES]}
                            value={language}
                            onChange={setLanguage}
                            sourceLanguage={PLATFORM_SOURCE_LANGUAGE}
                            contentMap={content[openKey]}
                        />
                    </section>
                    {PLATFORM_GREETING_KEYS.map((key) => {
                        const open = openKey === key;
                        const panelId = `platform-greeting-panel-${key}`;
                        const builtInText = data.builtIn?.[key]?.[language];
                        const missing = languagesWithoutText(content[key]);
                        const hasOwnText = missing.length < PLATFORM_LANGUAGES.length;
                        return (
                            <section key={key} id={`platform-greeting-section-${key}`} className={styles.section}>
                                <button
                                    type="button"
                                    className={styles.sectionToggle}
                                    aria-expanded={open}
                                    aria-controls={panelId}
                                    onClick={() => setOpenKey(key)}
                                >
                                    <span className={styles.sectionToggleTitle}>
                                        {t(`settings.greeting.${key}.label`)}
                                    </span>
                                    <ExpandMoreIcon
                                        className={classNames(styles.chevron, { [styles.chevronOpen]: open })}
                                    />
                                </button>
                                {open && (
                                    <div className={styles.panel} id={panelId}>
                                        <M3RichTextEditor
                                            title={t(`settings.greeting.${key}.label`)}
                                            value={content[key]?.[language] ?? ''}
                                            contentLanguage={language}
                                            /* One language picker for the whole card (top), not one per editor. */
                                            languageSlot={<span data-testid="platform-greeting-no-editor-language" />}
                                            fluid
                                            hideHeader
                                            plainText
                                            versionLabel={t('legal.m3Editor.versionLatest')}
                                            versionSections={builtInSections(key, builtInText)}
                                            onRestoreVersion={(html: string) => handleChange(key, html)}
                                            enableAnchors={false}
                                            onChange={(html: string) => handleChange(key, html)}
                                        />
                                        <p className={styles.help}>{t(`settings.greeting.${key}.help`)}</p>
                                        {builtInText && (
                                            <div
                                                className={styles.platformPreview}
                                                data-testid="platform-greeting-builtin"
                                            >
                                                <span className={styles.platformPreviewLabel}>
                                                    {t('settings.greeting.builtInLabel')}
                                                </span>
                                                <p className={styles.platformPreviewText}>{builtInText}</p>
                                            </div>
                                        )}
                                        {hasOwnText && missing.length > 0 && (
                                            <p className={styles.help}>
                                                {t('settings.greeting.missingLanguages', {
                                                    languages: missing
                                                        .map((code) => t(`language.${code}`, code))
                                                        .join(', '),
                                                })}
                                            </p>
                                        )}
                                        {hasOwnText && (
                                            <M3Button variant="text" onClick={() => resetToDefault(key)}>
                                                {t('settings.greeting.reset')}
                                            </M3Button>
                                        )}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            </Card>
            <TranslateOnPublishModal
                open={modalOpen}
                sourceLanguage={PLATFORM_SOURCE_LANGUAGE}
                targetLanguages={[...PLATFORM_TRANSLATION_TARGETS]}
                translating={isTranslating}
                errorKey={modalErrorKey}
                onConfirm={translateAndPublish}
                onSkip={() => {
                    setModalOpen(false);
                    publish(purged);
                }}
                onCancel={() => {
                    if (!isTranslating) setModalOpen(false);
                }}
            />
        </>
    );
};
