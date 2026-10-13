import { useMemo, useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import { useTranslateLegalContent } from '../../../../hooks/useTranslateLegalContent.hook';
import { getTranslationErrorKey } from '../../LegalSettings/utils/translationErrors';
import { TranslateOnPublishModal } from '../../LegalSettings/components/TranslateOnPublishModal';
import { ERSTANTWORT_BAUSTEINE, germanVariantFor } from './erstantwortBausteine';
import { ErstantwortTextsCard, type ErstantwortContentMap } from './ErstantwortTextsCard';
import {
    applyTranslations,
    buildErstantwortContentPayload,
    collectSourceTexts,
    ERSTANTWORT_DEADLINE_FIELD,
    translationTargetsFor,
} from './erstantwortPublish';
import type { TenantAdminData } from '../../../../types/TenantAdminData';

interface ErstantwortSettingsProps {
    tenantId: string;
    /** A Träger that may only read sees the texts, but cannot publish them. */
    readOnly?: boolean;
}

/** The Bausteine as they are stored in `content`, copied so an edit never reaches the cache. */
const readStoredContent = (content: TenantAdminData['content'] | undefined): ErstantwortContentMap => {
    const record = (content ?? {}) as Record<string, unknown>;
    const stored: ErstantwortContentMap = {};
    ERSTANTWORT_BAUSTEINE.forEach(({ key }) => {
        const value = record[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            stored[key] = { ...(value as Record<string, string>) };
        }
    });
    return stored;
};

const readStoredDeadline = (content: TenantAdminData['content'] | undefined): number | undefined => {
    const value = (content as Record<string, unknown> | undefined)?.[ERSTANTWORT_DEADLINE_FIELD];
    return typeof value === 'number' ? value : undefined;
};

/**
 * The Träger's Erstantwort texts (ADR-018, ORISO-Admin#601). Publishing follows the legal-text
 * editors: the German texts go to POST /tenantadmin/translate in one call, the results are stored
 * with their `<lang>__meta` markers, and the complete content is written with the tenant PUT.
 * Translation is optional; a failure publishes nothing unless the Träger skips it.
 */
export const ErstantwortSettings = ({ tenantId, readOnly = false }: ErstantwortSettingsProps) => {
    const { t } = useTranslation();
    const { data, isLoading, isError } = useSingleTenantData({ id: tenantId });
    const { mutateAsync: saveTenant, isPending: isSaving } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const { translate, isTranslating } = useTranslateLegalContent();

    const languageFormal = data?.settings?.extendedSettings?.languageFormal;
    const sourceLanguage = germanVariantFor(languageFormal);
    const targetLanguages = useMemo(
        () => translationTargetsFor(data?.settings?.activeLanguages),
        [data?.settings?.activeLanguages],
    );
    const storedContent = useMemo(() => readStoredContent(data?.content), [data?.content]);
    const storedDeadline = readStoredDeadline(data?.content);

    /* Local edits stay on top of the stored texts until a publish succeeds; the cache then
       holds the same values and the edits are dropped. */
    const [edits, setEdits] = useState<ErstantwortContentMap>({});
    const [deadlineEdit, setDeadlineEdit] = useState<{ days: number | undefined } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalErrorKey, setModalErrorKey] = useState<string | null>(null);

    const content = useMemo<ErstantwortContentMap>(() => {
        const merged: ErstantwortContentMap = { ...storedContent };
        Object.entries(edits).forEach(([key, map]) => {
            merged[key as keyof ErstantwortContentMap] = {
                ...(storedContent[key as keyof ErstantwortContentMap] ?? {}),
                ...map,
            };
        });
        return merged;
    }, [storedContent, edits]);

    const deadlineDays = deadlineEdit ? deadlineEdit.days : storedDeadline;
    const sourceTexts = collectSourceTexts(content, sourceLanguage);
    const canTranslate = targetLanguages.length > 0 && Object.keys(sourceTexts).length > 0;

    const handleChange = (key: keyof ErstantwortContentMap, language: string, html: string) => {
        setEdits((previous) => ({
            ...previous,
            [key]: { ...(previous[key] ?? storedContent[key] ?? {}), [language]: html },
        }));
    };

    const handleDeadline = (days: number | undefined) => setDeadlineEdit({ days });

    const publish = async (publishedContent: ErstantwortContentMap) => {
        const deadlinePayload = deadlineEdit ? deadlineEdit.days ?? null : undefined;
        try {
            await saveTenant({
                content: buildErstantwortContentPayload(
                    publishedContent,
                    deadlinePayload,
                ) as TenantAdminData['content'],
            });
            setEdits({});
            setDeadlineEdit(null);
        } catch {
            // The tenant mutation already shows the error; the edits stay for another attempt.
        }
    };

    const publishWithoutTranslation = () => {
        setModalOpen(false);
        publish(content);
    };

    const translateAndPublish = async (languages: string[]) => {
        setModalErrorKey(null);
        let translated: ErstantwortContentMap;
        try {
            const response = await translate({
                sourceLang: sourceLanguage,
                targetLangs: languages,
                texts: sourceTexts,
            });
            const selected = Object.fromEntries(
                Object.entries(response.translations ?? {}).filter(([language]) => languages.includes(language)),
            );
            translated = applyTranslations(content, selected, sourceLanguage, new Date().toISOString());
        } catch (error) {
            setModalErrorKey(getTranslationErrorKey(error));
            return;
        }
        setModalOpen(false);
        // Keep the translated texts on screen if the save fails, so nothing has to be re-translated by hand.
        setEdits(translated);
        await publish(translated);
    };

    const requestPublish = () => {
        if (!canTranslate) {
            publishWithoutTranslation();
            return;
        }
        setModalErrorKey(null);
        setModalOpen(true);
    };

    if (isLoading) {
        return <Spin />;
    }
    if (isError || !data) {
        return <Alert type="error" showIcon message={t('message.error.default')} />;
    }

    return (
        <>
            <ErstantwortTextsCard
                contentByBaustein={content}
                responseDeadlineDays={deadlineDays}
                languageFormal={languageFormal}
                onChange={handleChange}
                onDeadlineChange={handleDeadline}
                disabled={readOnly}
            />
            {!readOnly && (
                <Button type="primary" onClick={requestPublish} loading={isSaving} disabled={isTranslating}>
                    {t('tenants.erstantwort.publish')}
                </Button>
            )}
            <TranslateOnPublishModal
                open={modalOpen}
                sourceLanguage={sourceLanguage}
                targetLanguages={targetLanguages}
                translating={isTranslating}
                errorKey={modalErrorKey}
                onConfirm={translateAndPublish}
                onSkip={publishWithoutTranslation}
                onCancel={() => {
                    if (!isTranslating) {
                        setModalOpen(false);
                    }
                }}
            />
        </>
    );
};
