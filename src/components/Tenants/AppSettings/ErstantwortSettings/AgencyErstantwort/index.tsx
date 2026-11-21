import { useMemo, useState } from 'react';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../../../M3Button';
import { Notify } from '../../../../Notify';
import { TranslateOnPublishModal } from '../../../LegalSettings/components/TranslateOnPublishModal';
import { getTranslationErrorKey } from '../../../LegalSettings/utils/translationErrors';
import { useAgencyErstantwort, useSaveAgencyErstantwort } from '../../../../../hooks/useAgencyErstantwort.hook';
import { useErstantwortDefaults } from '../../../../../hooks/useErstantwortDefaults.hook';
import { useTranslateLegalContent } from '../../../../../hooks/useTranslateLegalContent.hook';
import { AGENCY_ERSTANTWORT_BAUSTEINE, germanVariantFor, type ErstantwortBausteinKey } from '../erstantwortBausteine';
import { ErstantwortTextsCard, type ErstantwortContentMap } from '../ErstantwortTextsCard';
import {
    applyTranslations,
    buildErstantwortContentPayload,
    changedBausteine,
    collectSourceTexts,
    purgeStaleTranslations,
    translationTargetsFor,
} from '../erstantwortPublish';
import styles from '../ErstantwortTextsCard/styles.module.scss';

const htmlToPlainText = (html: string | undefined): string => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html.replace(/<\/p>/g, '</p>\n'), 'text/html');
    return (doc.body.textContent ?? '').trim();
};

interface AgencyErstantwortSettingsProps {
    agencyId: string;
    /** The Träger's `languageFormal`: the centre writes the same single German variant. */
    languageFormal?: boolean;
    /** The Träger's active languages; translation targets are all of them except German. */
    activeLanguages?: string[];
    readOnly?: boolean;
    /** The Träger's stored Erstantwort maps, when the caller may read them: shown as what applies. */
    traegerContent?: ErstantwortContentMap;
}

/**
 * The Beratungsstelle level of the Erstantwort (ADR-018 §6: Beratungsstelle → Träger → platform →
 * built-in). Each text written here replaces the Träger's for this centre only; an empty field
 * keeps the Träger's text. Publishing follows the Träger editor (machine translation optional).
 */
export const AgencyErstantwortSettings = ({
    agencyId,
    languageFormal,
    activeLanguages,
    readOnly = false,
    traegerContent,
}: AgencyErstantwortSettingsProps) => {
    const { t } = useTranslation();
    const { data, isLoading, isError } = useAgencyErstantwort(agencyId);
    const { mutateAsync: save, isPending: isSaving } = useSaveAgencyErstantwort(agencyId);
    const { translate, isTranslating } = useTranslateLegalContent();
    const { data: platformDefaults } = useErstantwortDefaults(languageFormal === false);
    const sourceLanguage = germanVariantFor(languageFormal);
    const targetLanguages = useMemo(() => translationTargetsFor(activeLanguages), [activeLanguages]);

    const stored = useMemo<ErstantwortContentMap>(() => data ?? {}, [data]);
    /* What applies while a field stays empty: the Träger's own text, else the platform text. */
    const inherited = useMemo(() => {
        const texts: Partial<Record<ErstantwortBausteinKey, string>> = { ...(platformDefaults?.texts ?? {}) };
        AGENCY_ERSTANTWORT_BAUSTEINE.forEach(({ key }) => {
            const plain = htmlToPlainText(traegerContent?.[key]?.[sourceLanguage]);
            if (plain) texts[key] = plain;
        });
        return { texts, emergencyNumbers: platformDefaults?.emergencyNumbers };
    }, [platformDefaults, traegerContent, sourceLanguage]);
    const [edits, setEdits] = useState<ErstantwortContentMap>({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalErrorKey, setModalErrorKey] = useState<string | null>(null);

    const content = useMemo<ErstantwortContentMap>(() => {
        const merged: ErstantwortContentMap = { ...stored };
        (Object.keys(edits) as ErstantwortBausteinKey[]).forEach((key) => {
            merged[key] = { ...(stored[key] ?? {}), ...edits[key] };
        });
        return merged;
    }, [stored, edits]);

    const changedKeys = changedBausteine(content, stored, sourceLanguage);
    const sourceTexts = collectSourceTexts(content, sourceLanguage, changedKeys);
    const purged = purgeStaleTranslations(content, stored, sourceLanguage);

    const publish = async (published: ErstantwortContentMap, sent: ErstantwortContentMap = edits) => {
        try {
            await save(buildErstantwortContentPayload(published, undefined));
            // A keystroke during the request replaces `edits`. Clearing only the map we sent keeps that keystroke.
            setEdits((current) => (current === sent ? {} : current));
        } catch {
            // The edits stay on screen for another attempt.
        }
    };

    const requestPublish = () => {
        if (targetLanguages.length === 0 || Object.keys(sourceTexts).length === 0) {
            publish(purged);
            return;
        }
        setModalErrorKey(null);
        setModalOpen(true);
    };

    const translateAndPublish = async (languages: string[]) => {
        setModalErrorKey(null);
        let translated: ErstantwortContentMap;
        try {
            const response = await translate({ sourceLang: 'de', targetLangs: languages, texts: sourceTexts });
            const selected = Object.fromEntries(
                Object.entries(response.translations ?? {}).filter(([language]) => languages.includes(language)),
            );
            translated = applyTranslations(purged, selected, sourceLanguage, new Date().toISOString());
        } catch (error) {
            setModalErrorKey(getTranslationErrorKey(error));
            return;
        }
        setModalOpen(false);
        setEdits(translated);
        await publish(translated, translated);
    };

    if (isLoading) return <Spin />;
    if (isError || !data) {
        return (
            <div id="agency-erstantwort-state">
                <Notify
                    title={t('notify.title.erstantwort')}
                    severity="error"
                    quietText={t('notify.tile.notLoaded')}
                    causeKey={`agency-erstantwort:load:${agencyId}`}
                    jump="agency-erstantwort-state"
                    retry
                >
                    {t('message.error.default')}
                </Notify>
            </div>
        );
    }

    return (
        <>
            <ErstantwortTextsCard
                titleKey="agency.erstantwort.title"
                intro={<p className={styles.help}>{t('agency.erstantwort.intro')}</p>}
                bausteine={AGENCY_ERSTANTWORT_BAUSTEINE}
                hideDeadline
                contentByBaustein={content}
                languageFormal={languageFormal}
                platformDefaults={inherited}
                previewLabelKey="agency.erstantwort.inherited.label"
                onChange={(key, language, html) =>
                    setEdits((previous) => ({
                        ...previous,
                        [key]: { ...(previous[key] ?? stored[key] ?? {}), [language]: html },
                    }))
                }
                onDeadlineChange={() => undefined}
                disabled={readOnly}
                footer={
                    readOnly ? undefined : (
                        <M3Button variant="filled" onClick={requestPublish} loading={isSaving} disabled={isTranslating}>
                            {t('tenants.erstantwort.publish')}
                        </M3Button>
                    )
                }
            />
            <TranslateOnPublishModal
                open={modalOpen}
                sourceLanguage={sourceLanguage}
                targetLanguages={targetLanguages}
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
