import { useEffect, useMemo, useState } from 'react';
import { TranslateRequest, TranslateResponse } from '../../../../types/translation';
import { isEmptyHtml, mergeLegalContentMap } from '../utils/legalContentLanguages';
import {
    LEGAL_SOURCE_LANGUAGE,
    LEGAL_TRANSLATION_FIELD_KEY,
    buildTranslationMeta,
    metaKeyFor,
} from '../utils/translationMeta';
import { getTranslationErrorKey } from '../utils/translationErrors';

interface UseLegalContentTranslationArgs {
    /** The complete stored content map (language -> HTML), including keys we do not render. */
    initialContentByLanguage: Record<string, string>;
    /** The languages offered for editing. */
    languages: string[];
    /**
     * Explicit override of the language shown first. Without it the editor opens on the
     * legal source language ("Rechtssprache") — NOT on the admin's UI language: the legal
     * texts are authored in the source language, and an editor that opens elsewhere lets
     * an admin publish into a language their advice seekers never read (#718). When the
     * source language is not offered either, the first offered language is shown.
     */
    defaultLanguage?: string;
    /** Translate call (usually useTranslateLegalContent().translate). Absent = no translation UI. */
    onTranslate?: (request: TranslateRequest) => Promise<TranslateResponse>;
    /** Publishes the complete merged content map. */
    onPublish: (contentByLanguage: Record<string, string>) => void;
}

/**
 * Shared editing + machine-translation state of the legal cards (DPA and department
 * data privacy policy):
 *
 * - tracks per-language edits and the "fresh" `__meta` entries of languages that were
 *   machine-translated in this session (a manual edit of such a language drops its fresh
 *   meta again; stored meta always passes through unchanged — the backend clears it on a
 *   manual save),
 * - drives the translate-on-publish modal: translate the source text into the selected
 *   target languages with ONE call, merge results + meta into the complete map, publish;
 *   or publish without translation (skip / no targets),
 * - drives the per-field "translate this language from the source" button,
 * - maps backend error codes to human i18n message keys (never raw codes).
 */
export const useLegalContentTranslation = ({
    initialContentByLanguage,
    languages,
    defaultLanguage,
    onTranslate,
    onPublish,
}: UseLegalContentTranslationArgs) => {
    // v1: the platform's legal source language ("Rechtssprache") is always German.
    const sourceLanguage = languages.includes(LEGAL_SOURCE_LANGUAGE) ? LEGAL_SOURCE_LANGUAGE : languages[0];
    const preferredLanguage = defaultLanguage && languages.includes(defaultLanguage) ? defaultLanguage : sourceLanguage;

    const [edits, setEdits] = useState<Record<string, string>>({});
    const [freshMeta, setFreshMeta] = useState<Record<string, string>>({});
    const [activeLanguage, setActiveLanguage] = useState(preferredLanguage);
    // Whether the admin engaged with the shown language (picked one or edited it) —
    // only then may a late change of the offered languages not switch it away.
    const [languageEngaged, setLanguageEngaged] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [sourceWarningOpen, setSourceWarningOpen] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [modalErrorKey, setModalErrorKey] = useState<string | null>(null);
    const [fieldTranslating, setFieldTranslating] = useState(false);
    const [fieldErrorKey, setFieldErrorKey] = useState<string | null>(null);
    const targetLanguages = useMemo(
        () => languages.filter((language) => language !== sourceLanguage),
        [languages, sourceLanguage],
    );

    // The offered languages can change after mount (tenant settings and stored content
    // load asynchronously) while useState evaluates its initializer only once. Re-run
    // the automatic selection then — but never switch away from a language the admin
    // engaged with, unless it stopped being offered altogether.
    useEffect(() => {
        if (!languages.includes(activeLanguage)) {
            setActiveLanguage(preferredLanguage);
            setLanguageEngaged(false);
        } else if (!languageEngaged && activeLanguage !== preferredLanguage) {
            setActiveLanguage(preferredLanguage);
        }
    }, [languages, activeLanguage, preferredLanguage, languageEngaged]);

    const currentContent = edits[activeLanguage] ?? initialContentByLanguage[activeLanguage] ?? '';
    const sourceContent = edits[sourceLanguage] ?? initialContentByLanguage[sourceLanguage] ?? '';

    /** Edits plus the fresh `__meta` entries of this session's machine translations. */
    const editsWithMeta = useMemo(() => {
        const withMeta: Record<string, string> = { ...edits };
        Object.entries(freshMeta).forEach(([language, meta]) => {
            withMeta[metaKeyFor(language)] = meta;
        });
        return withMeta;
    }, [edits, freshMeta]);

    /** The complete current map (stored + edited) — also used for the status labels. */
    const contentMapWithEdits = useMemo(
        () => mergeLegalContentMap(initialContentByLanguage, editsWithMeta),
        [initialContentByLanguage, editsWithMeta],
    );

    const selectLanguage = (language: string) => {
        setLanguageEngaged(true);
        setActiveLanguage(language);
    };

    const handleEditorChange = (html: string) => {
        setLanguageEngaged(true);
        setEdits((prev) => ({ ...prev, [activeLanguage]: html }));
        // A manual edit replaces a translation made in this session, so its fresh
        // meta must not be published. Stored meta is untouched (backend clears it).
        setFreshMeta((prev) => {
            if (!(activeLanguage in prev)) {
                return prev;
            }
            const { [activeLanguage]: dropped, ...rest } = prev;
            return rest;
        });
        setFieldErrorKey(null);
    };

    const buildPublishMap = () => mergeLegalContentMap(initialContentByLanguage, editsWithMeta);

    const canTranslate = !!onTranslate && targetLanguages.length > 0 && !isEmptyHtml(sourceContent);

    // Non-source languages the admin authored by hand this session. Machine
    // translations (still carrying their fresh meta) came FROM the source text, so
    // they are no evidence of authoring into the wrong language.
    const editedNonSourceLanguages = useMemo(
        () => Object.keys(edits).filter((language) => language !== sourceLanguage && !(language in freshMeta)),
        [edits, freshMeta, sourceLanguage],
    );
    // The #718 failure shape: translations were edited while the variant the advice
    // seekers actually read stayed untouched. Publishing stays possible — the warning
    // modal only makes the gap explicit before it goes live (#720).
    const sourceUntouchedOnPublish = editedNonSourceLanguages.length > 0 && !(sourceLanguage in edits);

    /** Continues into the regular publish flow (translate modal when possible). */
    const proceedToPublish = () => {
        if (!canTranslate) {
            onPublish(buildPublishMap());
            return;
        }
        setModalErrorKey(null);
        setModalOpen(true);
    };

    /** Publish entry point: warns first when the source language was left untouched. */
    const requestPublish = () => {
        if (sourceUntouchedOnPublish) {
            setSourceWarningOpen(true);
            return;
        }
        proceedToPublish();
    };

    /** Source-warning confirm: publish anyway. */
    const confirmSourceWarning = () => {
        setSourceWarningOpen(false);
        proceedToPublish();
    };

    /** Source-warning cancel: back to the editor, nothing published. */
    const cancelSourceWarning = () => setSourceWarningOpen(false);

    /** "Publish without translation" (modal skip button) — also used when nothing is selected. */
    const publishWithoutTranslation = () => {
        setModalOpen(false);
        onPublish(buildPublishMap());
    };

    const closeModal = () => {
        if (!translating) {
            setModalOpen(false);
        }
    };

    /** Modal confirm: ONE translate call for all selected languages, then merge + publish. */
    const translateAndPublish = async (selectedLanguages: string[]) => {
        if (!onTranslate || selectedLanguages.length === 0) {
            publishWithoutTranslation();
            return;
        }
        setTranslating(true);
        setModalErrorKey(null);
        try {
            const response = await onTranslate({
                sourceLang: sourceLanguage,
                targetLangs: selectedLanguages,
                texts: { [LEGAL_TRANSLATION_FIELD_KEY]: sourceContent },
            });
            const at = new Date().toISOString();
            const additions: Record<string, string> = {};
            selectedLanguages.forEach((language) => {
                const html = response.translations?.[language]?.[LEGAL_TRANSLATION_FIELD_KEY];
                if (html) {
                    additions[language] = html;
                    additions[metaKeyFor(language)] = buildTranslationMeta(sourceLanguage, at);
                }
            });
            setModalOpen(false);
            // Deselected languages stay untouched (not stored -> user app falls back to the original).
            onPublish({ ...buildPublishMap(), ...additions });
        } catch (error) {
            setModalErrorKey(getTranslationErrorKey(error));
        } finally {
            setTranslating(false);
        }
    };

    /** Per-field button: translate ONLY the active language from the source into the editor. */
    const translateActiveField = async () => {
        if (!onTranslate || activeLanguage === sourceLanguage) {
            return;
        }
        setFieldTranslating(true);
        setFieldErrorKey(null);
        try {
            const response = await onTranslate({
                sourceLang: sourceLanguage,
                targetLangs: [activeLanguage],
                texts: { [LEGAL_TRANSLATION_FIELD_KEY]: sourceContent },
            });
            const html = response.translations?.[activeLanguage]?.[LEGAL_TRANSLATION_FIELD_KEY];
            if (html) {
                const translatedLanguage = activeLanguage;
                setEdits((prev) => ({ ...prev, [translatedLanguage]: html }));
                setFreshMeta((prev) => ({ ...prev, [translatedLanguage]: buildTranslationMeta(sourceLanguage) }));
            }
        } catch (error) {
            setFieldErrorKey(getTranslationErrorKey(error));
        } finally {
            setFieldTranslating(false);
        }
    };

    return {
        activeLanguage,
        setActiveLanguage: selectLanguage,
        currentContent,
        sourceLanguage,
        targetLanguages,
        contentMapWithEdits,
        handleEditorChange,
        buildPublishMap,
        // publish + modal
        requestPublish,
        sourceWarningOpen,
        editedNonSourceLanguages,
        confirmSourceWarning,
        cancelSourceWarning,
        modalOpen,
        closeModal,
        translating,
        modalErrorKey,
        translateAndPublish,
        publishWithoutTranslation,
        // per-field translate
        showFieldTranslate: !!onTranslate && activeLanguage !== sourceLanguage,
        fieldTranslateDisabled: isEmptyHtml(sourceContent),
        fieldTranslating,
        fieldErrorKey,
        translateActiveField,
    };
};
