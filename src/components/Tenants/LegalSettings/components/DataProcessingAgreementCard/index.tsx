import { useState } from 'react';
import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { DpaIcon } from '../../../../CustomIcons/LegalIcons';
import { M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import { EditorHelpText } from '../../../../FormPluginEditor/EditorHelpText';
import { EditorHintSnackbar } from '../../../../FormPluginEditor/EditorHintSnackbar';
import { useLegalHelp } from '../../hooks/useLegalHelp';
import { LegalHelpRole } from '../../utils/legalHelpTexts';
import { LegalVersion } from '../LegalVersionViewer';
import { LegalContentLanguageSelect } from '../LegalContentLanguageSelect';
import { TranslateOnPublishModal } from '../TranslateOnPublishModal';
import { useLegalContentTranslation } from '../../hooks/useLegalContentTranslation';
import { TranslateRequest, TranslateResponse } from '../../../../../types/translation';
import styles from './styles.module.scss';

// "Nicht mehr anzeigen" on the DPA blocker snackbar persists across sessions.
const DPA_BLOCKER_DISMISSED_KEY = 'oriso-admin.legal.dpa.blocker.dismissed';

const isBlockerDismissed = () => {
    try {
        return window.localStorage.getItem(DPA_BLOCKER_DISMISSED_KEY) === 'true';
    } catch {
        return false;
    }
};

const persistBlockerDismissed = () => {
    try {
        window.localStorage.setItem(DPA_BLOCKER_DISMISSED_KEY, 'true');
    } catch {
        // Private mode / storage disabled: the snackbar just reappears next session.
    }
};

interface DataProcessingAgreementCardProps {
    /** The complete stored content map (language -> HTML), including keys we do not render. */
    initialContentByLanguage?: Record<string, string>;
    /** The languages offered for editing (tenant's active languages + stored ones). */
    languages?: string[];
    /** The language shown first (usually the admin's UI language). */
    defaultLanguage?: string;
    /** Previously published versions, newest first — shown read-only in the look-back viewer. */
    versions: LegalVersion[];
    /**
     * Called with the COMPLETE merged content map when the admin publishes: loaded content
     * plus the edited languages — languages the admin did not touch are never dropped.
     */
    onPublish: (contentByLanguage: Record<string, string>) => void;
    publishing?: boolean;
    /**
     * Machine-translation call (wired by the container). When present, publishing offers
     * the translate-on-publish modal and non-source languages get a per-field
     * "translate from the original" button.
     */
    onTranslate?: (request: TranslateRequest) => Promise<TranslateResponse>;
    /**
     * Read-only mode for the agency page: the DPA is managed at tenant (Träger) level,
     * so agency admins only get to look at the published text, not edit it.
     */
    readOnly?: boolean;
    /** Bypass the JWT role lookup for the help texts (Storybook/demo contexts). */
    helpRole?: LegalHelpRole;
}

/**
 * The Auftragsverarbeitungsvertrag (DPA) card: edit the text per language in the TipTap
 * editor and publish the complete language map, with a read-only "look back" at earlier
 * published versions underneath (pick a version from the select → its text is shown read-only).
 * Publishing offers to machine-translate the source text into the other active languages.
 */
export const DataProcessingAgreementCard = ({
    initialContentByLanguage = {},
    languages = ['de'],
    defaultLanguage,
    versions,
    onPublish,
    publishing,
    onTranslate,
    readOnly,
    helpRole,
}: DataProcessingAgreementCardProps) => {
    const { t } = useTranslation();
    const {
        activeLanguage,
        setActiveLanguage,
        currentContent,
        sourceLanguage,
        targetLanguages,
        contentMapWithEdits,
        handleEditorChange,
        requestPublish,
        modalOpen,
        closeModal,
        translating,
        modalErrorKey,
        translateAndPublish,
        publishWithoutTranslation,
        showFieldTranslate,
        fieldTranslateDisabled,
        fieldTranslating,
        fieldErrorKey,
        translateActiveField,
    } = useLegalContentTranslation({
        initialContentByLanguage,
        languages,
        defaultLanguage,
        onTranslate: readOnly ? undefined : onTranslate,
        onPublish,
    });

    // Role/state dependent help texts (Figma 457-13255): description under the
    // header. The platform-admin "no DPA published yet" CTA lives ONLY in the
    // dismissible snackbar (Figma 1229-17864) — once dismissed it is gone for good.
    const help = useLegalHelp('dpa', { empty: versions.length === 0, readOnly: !!readOnly }, helpRole);
    const [blockerHidden, setBlockerHidden] = useState(isBlockerDismissed);
    const isBlockerState = help.keyBase === 'legal.help.dpa.platform.empty';
    const showBlockerSnackbar = isBlockerState && !blockerHidden;

    return (
        <div className={styles.card}>
            <M3RichTextEditor
                title={t('tenants.legal.dataProcessingAgreement.title')}
                icon={DpaIcon}
                value={currentContent}
                onChange={readOnly ? undefined : handleEditorChange}
                readOnly={readOnly}
                publishing={publishing}
                versionLabel={t('legal.m3Editor.versionLabel')}
                versions={versions}
                onRestoreVersion={readOnly ? undefined : handleEditorChange}
                languageSlot={
                    <LegalContentLanguageSelect
                        languages={languages}
                        value={activeLanguage}
                        onChange={setActiveLanguage}
                        sourceLanguage={sourceLanguage}
                        contentMap={contentMapWithEdits}
                    />
                }
                helpSlot={<EditorHelpText text={help.text} hint={isBlockerState ? undefined : help.hint} />}
                snackbarSlot={
                    showBlockerSnackbar && (
                        <EditorHintSnackbar
                            text={help.hint}
                            onClose={() => setBlockerHidden(true)}
                            onDismiss={() => {
                                persistBlockerDismissed();
                                setBlockerHidden(true);
                            }}
                        />
                    )
                }
                aboveEditorSlot={
                    !readOnly &&
                    showFieldTranslate && (
                        <div className={styles.translateField}>
                            <Button
                                size="small"
                                loading={fieldTranslating}
                                disabled={fieldTranslateDisabled}
                                onClick={translateActiveField}
                            >
                                {t('legal.translation.field.button')}
                            </Button>
                            {fieldErrorKey && (
                                <Alert type="error" showIcon message={t(fieldErrorKey)} className={styles.fieldError} />
                            )}
                        </div>
                    )
                }
                onPublish={readOnly ? undefined : () => requestPublish()}
                belowSlot={
                    !readOnly && (
                        <TranslateOnPublishModal
                            open={modalOpen}
                            sourceLanguage={sourceLanguage}
                            targetLanguages={targetLanguages}
                            translating={translating}
                            errorKey={modalErrorKey}
                            onConfirm={translateAndPublish}
                            onSkip={publishWithoutTranslation}
                            onCancel={closeModal}
                        />
                    )
                }
            />
        </div>
    );
};

export default DataProcessingAgreementCard;
