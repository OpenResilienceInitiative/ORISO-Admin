import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { M3Select } from '../M3Select';
import { IconButton } from '../IconButton';
import { ToggleRow } from '../ToggleRow';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { M3RichTextEditor } from '../FormPluginEditor/M3RichTextEditor';
import { LegalContentLanguageSelect } from '../Tenants/LegalSettings/components/LegalContentLanguageSelect';
import {
    MODULE_LANGUAGES,
    MODULE_SOURCE_LANGUAGE,
    type LangMap,
    type ModuleSection,
} from '../ConversationModules/conversationModule';
import { QuestionEditor } from '../ConversationModules/QuestionEditor';
import {
    FIXED_TRIGGERS,
    RATING_TYPES,
    SCALES,
    isMustStep,
    scaleOf,
    triggersFor,
    withScale,
    translateMissing,
    type JourneyPhase,
    type JourneyStep,
    type PanelAspect,
    type RatingItem,
    type JourneyTrigger,
    type RatingType,
    type ScaleId,
} from './journey';
import { KIND_ICONS } from './AddStepDialog';
import { nextId } from './ids';
import { stepTitle } from './stepText';
import { TranslationPill } from './TranslationPill';
import styles from './styles.module.scss';

interface StepDialogProps {
    step: JourneyStep;
    phase: JourneyPhase;
    translate?: (text: string, language: string) => string;
    onApply: (step: JourneyStep) => void;
    onClose: () => void;
}

const popupContainer = (node: HTMLElement) => node.parentElement ?? document.body;

/**
 * One step in its own dialog: title and description for every kind, then what the kind holds.
 * A core element or add-on brings its behaviour from the platform; only its wording is edited.
 */
export const StepDialog = ({ step, phase, translate, onApply, onClose }: StepDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<JourneyStep>(step);
    const [language, setLanguage] = useState<string>(MODULE_SOURCE_LANGUAGE);

    const patch = (change: Partial<JourneyStep>) => setDraft((current) => ({ ...current, ...change }));
    const inLanguage = (text: LangMap | undefined, value: string): LangMap => ({ ...text, [language]: value });

    const fromPlatform = draft.kind === 'core' || draft.kind === 'addon';
    const asksSomething = draft.kind === 'question' || draft.kind === 'rating';

    // The question editor of the conversation modules works on a section; a question step lends it one.
    const questionSection: ModuleSection = {
        id: draft.id,
        kind: 'questions',
        field: 'greeting',
        title: {},
        display: 'open',
        body: {},
        questions: draft.questions ?? [],
    };

    const setRating = (id: string, change: Partial<RatingItem>) =>
        patch({ ratings: draft.ratings?.map((rating) => (rating.id === id ? { ...rating, ...change } : rating)) });

    const setRatingType = (rating: RatingItem, type: RatingType) =>
        setRating(
            rating.id,
            type === 'stars'
                ? { type, min: 1, max: 5, midLabel: undefined }
                : { ...withScale(rating, 'minusFiveToFive'), type },
        );

    const setAspect = (id: string, change: Partial<PanelAspect>) =>
        patch({ aspects: draft.aspects?.map((aspect) => (aspect.id === id ? { ...aspect, ...change } : aspect)) });

    return (
        <Modal
            icon={KIND_ICONS[draft.kind]}
            title={stepTitle(draft, language, t)}
            description={t(isMustStep(draft) ? 'journeys.stepDialog.must' : `journeys.kindHelp.${draft.kind}`)}
            descriptionFullWidth
            width={720}
            zIndex={1200}
            footer={
                <div className={styles.footer}>
                    <M3Button variant="text" onClick={onClose}>
                        {t('journeys.action.cancel')}
                    </M3Button>
                    <M3Button variant="filled" onClick={() => onApply(draft)}>
                        {t('journeys.action.apply')}
                    </M3Button>
                </div>
            }
            onClose={onClose}
            wrapperTestId="journey-step-dialog"
        >
            <div className={styles.dialogBody}>
                <div className={styles.toolbar}>
                    <LegalContentLanguageSelect
                        languages={[...MODULE_LANGUAGES]}
                        value={language}
                        onChange={setLanguage}
                        sourceLanguage={MODULE_SOURCE_LANGUAGE}
                    />
                    <TranslationPill
                        step={draft}
                        onTranslate={
                            translate ? () => setDraft((current) => translateMissing(current, translate)) : undefined
                        }
                    />
                </div>
                {draft.machine && draft.machine.length > 0 && (
                    <p className={styles.help}>
                        {t('journeys.translation.machineHint', {
                            languages: draft.machine.map((code) => t(`language.${code}`, code)).join(', '),
                        })}
                    </p>
                )}

                <FloatingLabelInput
                    label={t('journeys.stepDialog.title')}
                    value={draft.title[language] ?? ''}
                    onChange={(event) => patch({ title: inLanguage(draft.title, event.target.value) })}
                />
                <FloatingLabelInput
                    label={t('journeys.stepDialog.description')}
                    value={draft.description[language] ?? ''}
                    onChange={(event) => patch({ description: inLanguage(draft.description, event.target.value) })}
                />

                {fromPlatform && <p className={styles.help}>{t('journeys.stepDialog.fromPlatform')}</p>}

                {draft.core && FIXED_TRIGGERS[draft.core] && (
                    <p className={styles.help}>
                        {t('journeys.trigger.fixed', {
                            trigger: t(`journeys.trigger.${FIXED_TRIGGERS[draft.core]}`),
                        })}
                    </p>
                )}

                {(asksSomething || draft.kind === 'message') && triggersFor(phase).length > 0 && (
                    <M3Select<JourneyTrigger>
                        aria-label={t('journeys.trigger.label')}
                        value={draft.trigger ?? triggersFor(phase)[0]}
                        options={triggersFor(phase).map((trigger) => ({
                            value: trigger,
                            label: t(`journeys.trigger.${trigger}`),
                        }))}
                        onChange={(trigger: JourneyTrigger) => patch({ trigger })}
                        getPopupContainer={popupContainer}
                    />
                )}

                {draft.kind === 'question' && (
                    <QuestionEditor
                        section={questionSection}
                        language={language}
                        onChange={(section) => patch({ questions: section.questions })}
                    />
                )}

                {draft.kind === 'rating' && (
                    <>
                        {draft.ratings?.map((rating, index) => (
                            <div
                                key={rating.id}
                                className={styles.block}
                                role="group"
                                aria-label={t('journeys.rating.number', { number: index + 1 })}
                                data-testid={`journey-rating-${rating.id}`}
                            >
                                <div className={styles.blockHeader}>
                                    <h3 className={styles.blockTitle}>
                                        {t('journeys.rating.number', { number: index + 1 })}
                                    </h3>
                                    <IconButton
                                        icon={<DeleteOutline />}
                                        ariaLabel={t('journeys.rating.remove')}
                                        onClick={() =>
                                            patch({ ratings: draft.ratings?.filter((entry) => entry.id !== rating.id) })
                                        }
                                    />
                                </div>
                                <FloatingLabelInput
                                    label={t('journeys.rating.label')}
                                    value={rating.label[language] ?? ''}
                                    onChange={(event) =>
                                        setRating(rating.id, { label: inLanguage(rating.label, event.target.value) })
                                    }
                                />
                                <M3Select<RatingType>
                                    aria-label={t('journeys.rating.type')}
                                    value={rating.type}
                                    options={RATING_TYPES.map((type) => ({
                                        value: type,
                                        label: t(`journeys.rating.type.${type}`),
                                    }))}
                                    onChange={(type: RatingType) => setRatingType(rating, type)}
                                    getPopupContainer={popupContainer}
                                />
                                {rating.type === 'range' && (
                                    <>
                                        <M3Select<ScaleId>
                                            aria-label={t('journeys.rating.scale')}
                                            value={scaleOf(rating) ?? 'minusFiveToFive'}
                                            options={(Object.keys(SCALES) as ScaleId[]).map((scale) => ({
                                                value: scale,
                                                label: t(`journeys.rating.scaleName.${scale}`),
                                            }))}
                                            onChange={(scale: ScaleId) =>
                                                setRating(rating.id, withScale(rating, scale))
                                            }
                                            getPopupContainer={popupContainer}
                                        />
                                        <div className={styles.fieldRow}>
                                            <FloatingLabelInput
                                                label={t('journeys.rating.minLabel', {
                                                    value: rating.min < 0 ? `−${-rating.min}` : rating.min,
                                                })}
                                                value={rating.minLabel?.[language] ?? ''}
                                                onChange={(event) =>
                                                    setRating(rating.id, {
                                                        minLabel: inLanguage(rating.minLabel, event.target.value),
                                                    })
                                                }
                                            />
                                            {rating.midLabel && (
                                                <FloatingLabelInput
                                                    label={t('journeys.rating.midLabel')}
                                                    value={rating.midLabel[language] ?? ''}
                                                    onChange={(event) =>
                                                        setRating(rating.id, {
                                                            midLabel: inLanguage(rating.midLabel, event.target.value),
                                                        })
                                                    }
                                                />
                                            )}
                                            <FloatingLabelInput
                                                label={t('journeys.rating.maxLabel', {
                                                    value: rating.min < 0 ? `+${rating.max}` : rating.max,
                                                })}
                                                value={rating.maxLabel?.[language] ?? ''}
                                                onChange={(event) =>
                                                    setRating(rating.id, {
                                                        maxLabel: inLanguage(rating.maxLabel, event.target.value),
                                                    })
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                                <ToggleRow
                                    label={t('journeys.rating.required')}
                                    checked={rating.required}
                                    onCheckedChange={(required) => setRating(rating.id, { required })}
                                />
                            </div>
                        ))}
                        <div>
                            <M3Button
                                variant="outlined"
                                icon={<Add />}
                                onClick={() =>
                                    patch({
                                        ratings: [
                                            ...(draft.ratings ?? []),
                                            {
                                                id: nextId('rating'),
                                                type: 'range',
                                                label: {},
                                                ...SCALES.minusFiveToFive,
                                                midLabel: { de: 'normal', en: 'normal' },
                                                required: false,
                                                version: 1,
                                            },
                                        ],
                                    })
                                }
                            >
                                {t('journeys.rating.add')}
                            </M3Button>
                        </div>
                    </>
                )}

                {draft.kind === 'panel' && (
                    <>
                        <ToggleRow
                            label={t('conversationModules.section.startsCollapsed')}
                            checked={draft.display === 'collapsed'}
                            onCheckedChange={(collapsed) => patch({ display: collapsed ? 'collapsed' : 'open' })}
                        />
                        {draft.aspects?.map((aspect, index) => (
                            <div
                                key={aspect.id}
                                className={styles.block}
                                role="group"
                                aria-label={t('journeys.aspect.number', { number: index + 1 })}
                                data-testid={`journey-aspect-${aspect.prototypeId ?? aspect.id}`}
                            >
                                <div className={styles.blockHeader}>
                                    <h3 className={styles.blockTitle}>
                                        {t('journeys.aspect.number', { number: index + 1 })}
                                        {aspect.safety && (
                                            <>
                                                {' '}
                                                <span className={`${styles.chip} ${styles.chipMust}`}>
                                                    {t('conversationModules.safety.badge')}
                                                </span>
                                            </>
                                        )}
                                    </h3>
                                    <IconButton
                                        icon={<DeleteOutline />}
                                        ariaLabel={t('journeys.aspect.remove')}
                                        onClick={() =>
                                            patch({ aspects: draft.aspects?.filter((entry) => entry.id !== aspect.id) })
                                        }
                                    />
                                </div>
                                <FloatingLabelInput
                                    label={t('journeys.stepDialog.title')}
                                    value={aspect.title[language] ?? ''}
                                    onChange={(event) =>
                                        setAspect(aspect.id, { title: inLanguage(aspect.title, event.target.value) })
                                    }
                                />
                                <M3RichTextEditor
                                    title={t('conversationModules.section.body')}
                                    value={aspect.body[language] ?? ''}
                                    contentLanguage={language}
                                    languageSlot={<span />}
                                    fluid
                                    hideHeader
                                    plainText
                                    enableAnchors={false}
                                    versionLabel={t('legal.m3Editor.versionLatest')}
                                    onChange={(html: string) =>
                                        setAspect(aspect.id, { body: inLanguage(aspect.body, html) })
                                    }
                                />
                            </div>
                        ))}
                        <div>
                            <M3Button
                                variant="outlined"
                                icon={<Add />}
                                onClick={() =>
                                    patch({
                                        aspects: [
                                            ...(draft.aspects ?? []),
                                            { id: nextId('aspect'), title: {}, body: {} },
                                        ],
                                    })
                                }
                            >
                                {t('journeys.aspect.add')}
                            </M3Button>
                        </div>
                    </>
                )}

                {draft.kind === 'message' && (
                    <M3RichTextEditor
                        title={t('conversationModules.section.body')}
                        value={draft.body?.[language] ?? ''}
                        contentLanguage={language}
                        languageSlot={<span />}
                        fluid
                        hideHeader
                        plainText
                        enableAnchors={false}
                        versionLabel={t('legal.m3Editor.versionLatest')}
                        onChange={(html: string) => patch({ body: inLanguage(draft.body, html) })}
                    />
                )}
            </div>
        </Modal>
    );
};
