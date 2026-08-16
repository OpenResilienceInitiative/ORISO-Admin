import { useCallback, useMemo, useState } from 'react';
import { Button, Modal, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { DpiaIcon } from '../../../../CustomIcons/LegalIcons';
import { M3RichTextEditor } from '../../../../FormPluginEditor/M3RichTextEditor';
import { EditorHelpText } from '../../../../FormPluginEditor/EditorHelpText';
import { DpiaSectionSelect } from '../DpiaSectionSelect';
import {
    DEFAULT_DPIA_SECTION_ID,
    DpiaPublicationStatus,
    DpiaTextMap,
    findDpiaSection,
    hasDpiaText,
} from '../../utils/dpiaSections';
import styles from './styles.module.scss';

// Re-exported for existing consumers: the type is owned by the data layer (`dpiaSections.ts`)
// since the API gateway needs it too and must not depend on a UI module.
export type { DpiaPublicationStatus };

export interface DpiaTextEditorProps {
    /** Stored text per section id; missing keys are sections nobody has written yet. */
    initialTexts?: DpiaTextMap;
    /** Section opened first — defaults to chapter 4 (governance). */
    defaultSectionId?: string;
    /** Publication status per section id; absent means DRAFT. */
    statusBySection?: Record<string, DpiaPublicationStatus>;
    /**
     * Persist the edited texts: publish=true finalises, publish=false stores a draft.
     * Always receives the COMPLETE map (loaded texts + every edit made in this session), so
     * switching chapters and saving once never drops the chapters edited earlier.
     */
    onSave: (texts: DpiaTextMap, publish: boolean) => void;
    saving?: boolean;
    /** Read-only mode for roles that may look at the DSFA but not author it. */
    readOnly?: boolean;
}

/**
 * Editor for the operator-specific free texts of the Datenschutz-Folgenabschätzung (DSFA),
 * built from the same M3 editor shell as the Impressum/DPA cards but navigating a fixed set of
 * document chapters instead of languages and versions (Docs#80, living DPIA epic).
 *
 * This is a VARIANT of the legal editor, deliberately not a change to it: the legal cards edit
 * one text in many languages, this one edits many texts in one language, and folding both into
 * one component would make each harder to reason about.
 *
 * Unsaved-changes guard: switching chapters with a dirty draft opens a modal offering
 * save-and-switch, discard-and-switch, or cancel. The guard is a modal rather than an inline
 * banner because the editor shell has a fixed height and an `aboveEditorSlot` banner pushes the
 * text area out of the card.
 */
export const DpiaTextEditor = ({
    initialTexts = {},
    defaultSectionId = DEFAULT_DPIA_SECTION_ID,
    statusBySection = {},
    onSave,
    saving,
    readOnly,
}: DpiaTextEditorProps) => {
    const { t } = useTranslation();
    const [sectionId, setSectionId] = useState(defaultSectionId);
    // Edits made in this session, keyed by section id. Kept separate from `initialTexts` so the
    // dirty check is a plain comparison against what was loaded.
    const [edits, setEdits] = useState<DpiaTextMap>({});
    // Section the admin asked to switch to while the current one was dirty.
    const [pendingSectionId, setPendingSectionId] = useState<string>();

    const section = findDpiaSection(sectionId);
    const texts = useMemo(() => ({ ...initialTexts, ...edits }), [initialTexts, edits]);
    const currentContent = texts[sectionId] ?? '';
    const isDirty = Object.prototype.hasOwnProperty.call(edits, sectionId)
        ? edits[sectionId] !== (initialTexts[sectionId] ?? '')
        : false;

    const filledSectionIds = useMemo(
        () =>
            Object.entries(texts)
                .filter(([, html]) => hasDpiaText(html))
                .map(([id]) => id),
        [texts],
    );

    const handleChange = useCallback(
        (html: string) => setEdits((previous) => ({ ...previous, [sectionId]: html })),
        [sectionId],
    );

    const requestSection = useCallback(
        (nextSectionId: string) => {
            if (nextSectionId === sectionId) return;
            if (isDirty) {
                setPendingSectionId(nextSectionId);
                return;
            }
            setSectionId(nextSectionId);
        },
        [isDirty, sectionId],
    );

    const closeGuard = () => setPendingSectionId(undefined);

    const discardAndSwitch = () => {
        if (!pendingSectionId) return;
        // Drop only THIS section's edit — chapters edited earlier keep their unsaved text.
        setEdits(({ [sectionId]: _discarded, ...rest }) => rest);
        setSectionId(pendingSectionId);
        closeGuard();
    };

    const saveAndSwitch = () => {
        if (!pendingSectionId) return;
        onSave(texts, false);
        setSectionId(pendingSectionId);
        closeGuard();
    };

    const status = statusBySection[sectionId] ?? 'DRAFT';
    const published = status === 'PUBLISHED';

    return (
        <div className={styles.card}>
            <M3RichTextEditor
                title={section ? `${t('dpia.editor.title')} — ${t(section.titleKey)}` : t('dpia.editor.title')}
                icon={DpiaIcon}
                /*
                 * Remount on chapter switch. The shell does sync a changed `value` into the
                 * document, but TipTap keeps its undo history across that swap — so without a
                 * remount a Ctrl+Z after switching chapters would pull the PREVIOUS chapter's
                 * text into the current one. A fresh editor per chapter is the cheap fix.
                 */
                key={sectionId}
                /*
                 * Anchors OFF, and not merely because chapter navigation replaces them: the
                 * anchor extension writes `id`s into the headings on mount, which fires
                 * `onChange` before the admin has touched anything. The section would count as
                 * dirty from the first render and the unsaved-changes guard would interrupt
                 * every chapter switch. Re-enabling anchors means fixing that coupling first.
                 */
                enableAnchors={false}
                value={currentContent}
                onChange={readOnly ? undefined : handleChange}
                readOnly={readOnly}
                publishing={saving}
                placeholder={section ? t(section.helpKey) : undefined}
                topicSlot={
                    <DpiaSectionSelect
                        value={sectionId}
                        onChange={requestSection}
                        filledSectionIds={filledSectionIds}
                        // A save's payload is fixed the moment it fires; switching chapters (and
                        // possibly discarding what's about to be persisted) can't stop it, so
                        // switching is blocked until the in-flight save settles.
                        disabled={saving}
                    />
                }
                helpSlot={
                    <>
                        <div className={styles.header}>
                            {section && (
                                <span className={styles.chapter}>
                                    {section.chapter === 'A'
                                        ? t('dpia.sections.annexPrefix')
                                        : `${t('dpia.editor.chapter')} ${section.chapter}`}
                                </span>
                            )}
                            <Tag color={published ? 'green' : 'default'}>
                                {published ? t('dpia.editor.status.published') : t('dpia.editor.status.draft')}
                            </Tag>
                            {isDirty && <Tag color="orange">{t('dpia.editor.status.unsaved')}</Tag>}
                        </div>
                        <EditorHelpText text={section ? t(section.helpKey) : ''} />
                    </>
                }
                onPublish={readOnly ? undefined : () => onSave(texts, true)}
                onSaveDraft={readOnly ? undefined : () => onSave(texts, false)}
                belowSlot={
                    !readOnly && (
                        <Modal
                            open={!!pendingSectionId}
                            title={t('dpia.editor.guard.title')}
                            onCancel={closeGuard}
                            footer={[
                                <Button key="cancel" onClick={closeGuard}>
                                    {t('dpia.editor.guard.cancel')}
                                </Button>,
                                <Button key="discard" danger disabled={saving} onClick={discardAndSwitch}>
                                    {t('dpia.editor.guard.discard')}
                                </Button>,
                                <Button key="save" type="primary" loading={saving} onClick={saveAndSwitch}>
                                    {t('dpia.editor.guard.save')}
                                </Button>,
                            ]}
                        >
                            {t('dpia.editor.guard.description')}
                        </Modal>
                    )
                }
            />
        </div>
    );
};

export default DpiaTextEditor;
