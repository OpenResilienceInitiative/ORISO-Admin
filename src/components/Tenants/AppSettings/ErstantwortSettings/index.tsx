import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../../M3Button';
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
    changedBausteine,
    collectSourceTexts,
    purgeStaleTranslations,
    ERSTANTWORT_DEADLINE_FIELD,
    translationTargetsFor,
} from './erstantwortPublish';
import { isEmptyHtml } from '../../LegalSettings/utils/legalContentLanguages';
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
    return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? value : undefined;
};

/**
 * The Träger's Erstantwort texts (ADR-018, ORISO-Admin#601). Publishing follows the legal-text
 * editors: the German texts go to POST /tenantadmin/translate in one call, the results are stored
 * with their `<lang>__meta` markers, and the complete content is written with the tenant PUT.
 * Translation is optional; a failure publishes nothing unless the Träger skips it.
 */
const TenantErstantwortSettings = ({ tenantId, readOnly = false }: ErstantwortSettingsProps) => {
    const { t } = useTranslation();
    const { data, isLoading, isError } = useSingleTenantData({ id: tenantId });
    const { mutateAsync: saveTenant, isPending: isSaving } = useTenantAdminDataMutation({
        id: tenantId,
        mutationKey: ['ERSTANTWORT_PUBLISH', tenantId],
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    const { translate, isTranslating } = useTranslateLegalContent();

    const languageFormal = data?.settings?.extendedSettings?.languageFormal;
    const sourceLanguage = germanVariantFor(languageFormal);
    const targetLanguages = useMemo(
        () => translationTargetsFor(data?.settings?.activeLanguages),
        [data?.settings?.activeLanguages],
    );
    const scopeKey = JSON.stringify([tenantId, sourceLanguage, targetLanguages]);
    const scopeRef = useRef({ key: scopeKey, generation: 0 });
    if (scopeRef.current.key !== scopeKey) {
        scopeRef.current = { key: scopeKey, generation: scopeRef.current.generation + 1 };
    }
    const storedContent = useMemo(() => readStoredContent(data?.content), [data?.content]);
    const storedDeadline = readStoredDeadline(data?.content);

    /* Local edits stay on top of the stored texts until a publish succeeds; the cache then
       holds the same values and the edits are dropped. */
    const [edits, setEdits] = useState<ErstantwortContentMap>({});
    const [deadlineEdit, setDeadlineEdit] = useState<{ days: number | undefined } | null>(null);
    const [publishError, setPublishError] = useState(false);
    const [translatedRetry, setTranslatedRetry] = useState<{
        content: ErstantwortContentMap;
        source: string;
    } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalErrorKey, setModalErrorKey] = useState<string | null>(null);

    useLayoutEffect(
        () => () => {
            // A tenant-scoped instance cannot complete work after navigation unmounts it.
            scopeRef.current.generation += 1;
        },
        [],
    );

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
    /* Only changed texts are translated; unchanged ones keep their stored translations. */
    const changedKeys = changedBausteine(content, storedContent, sourceLanguage);
    const sourceTexts = collectSourceTexts(content, sourceLanguage, changedKeys);
    const canTranslate = targetLanguages.length > 0 && Object.keys(sourceTexts).length > 0;
    /* Stale translations of a changed text are removed before anything is published. */
    const purgedContent = purgeStaleTranslations(content, storedContent, sourceLanguage);

    const handleChange = (key: keyof ErstantwortContentMap, language: string, html: string) => {
        setTranslatedRetry(null);
        setPublishError(false);
        setEdits((previous) => ({
            ...previous,
            [key]: { ...(previous[key] ?? storedContent[key] ?? {}), [language]: html },
        }));
    };

    const handleDeadline = (days: number | undefined) => setDeadlineEdit({ days });

    const publish = async (publishedContent: ErstantwortContentMap) => {
        const { generation } = scopeRef.current;
        const deadlinePayload = deadlineEdit ? deadlineEdit.days ?? null : undefined;
        try {
            await saveTenant({
                content: buildErstantwortContentPayload(
                    publishedContent,
                    deadlinePayload,
                ) as TenantAdminData['content'],
            });
            if (scopeRef.current.generation !== generation) return;
            setTranslatedRetry(null);
            setEdits({});
            setDeadlineEdit(null);
        } catch {
            // The tenant mutation already shows the error; the edits stay for another attempt.
        }
    };

    const publishWithoutTranslation = () => {
        setModalOpen(false);
        publish(purgedContent);
    };

    const translateAndPublish = async (languages: string[]) => {
        const { generation } = scopeRef.current;
        setModalErrorKey(null);
        let translated: ErstantwortContentMap;
        try {
            const response = await translate({
                // TenantService accepts at most 10 chars, so the variant 'de@informal' is sent as 'de'.
                sourceLang: 'de',
                targetLangs: languages,
                texts: sourceTexts,
            });
            const selected = Object.fromEntries(
                Object.entries(response.translations ?? {}).filter(([language]) => languages.includes(language)),
            );
            translated = applyTranslations(purgedContent, selected, sourceLanguage, new Date().toISOString());
        } catch (error) {
            if (scopeRef.current.generation !== generation) return;
            setModalErrorKey(getTranslationErrorKey(error));
            return;
        }
        if (scopeRef.current.generation !== generation) return;
        setModalOpen(false);
        // Keep the translated texts on screen if the save fails, so nothing has to be re-translated by hand.
        setEdits(translated);
        setTranslatedRetry({
            content: translated,
            source: JSON.stringify({
                tenantId,
                sourceLanguage,
                targetLanguages,
                texts: collectSourceTexts(content, sourceLanguage),
            }),
        });
        await publish(translated);
    };

    const requestPublish = () => {
        if (isEmptyHtml(content.erstantwortWhoReadsAlong?.[sourceLanguage])) {
            setPublishError(true);
            return;
        }
        setPublishError(false);
        if (
            translatedRetry?.source ===
            JSON.stringify({
                tenantId,
                sourceLanguage,
                targetLanguages,
                texts: collectSourceTexts(content, sourceLanguage),
            })
        ) {
            publish(translatedRetry.content);
            return;
        }
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
            {publishError && (
                <Alert
                    type="error"
                    showIcon
                    role="alert"
                    message={`${t('tenants.erstantwort.whoReadsAlong.label')}: ${t(
                        'tenants.erstantwort.whoReadsAlong.mandatory',
                    )}`}
                />
            )}
            <ErstantwortTextsCard
                contentByBaustein={content}
                responseDeadlineDays={deadlineDays}
                languageFormal={languageFormal}
                onChange={handleChange}
                onDeadlineChange={handleDeadline}
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

/** The key gives every caller an atomic tenant boundary, including cached navigation. */
export const ErstantwortSettings = (props: ErstantwortSettingsProps) => (
    <TenantErstantwortSettings key={props.tenantId} {...props} />
);
