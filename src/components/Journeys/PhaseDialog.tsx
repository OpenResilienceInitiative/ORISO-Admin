import { useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Add from '@mui/icons-material/Add';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { ToggleRow } from '../ToggleRow';
import { MODULE_SOURCE_LANGUAGE } from '../ConversationModules/conversationModule';
import {
    addStep,
    canMoveStep,
    isSkipped,
    markChecked,
    missingSafetyAspects,
    moveStep,
    removeStep,
    splitQuestionStep,
    START_OF_PHASE,
    canPreselectTopic,
    firstFreeIndex,
    isTopicPreselected,
    setTopicPreselected,
    updateStep,
    type Journey,
    type JourneyPhase,
    type JourneyStep,
    type NewStep,
} from './journey';
import { AddStepDialog } from './AddStepDialog';
import { nextId } from './ids';
import { PhaseIcon } from './PhaseIcon';
import { StepCard } from './StepCard';
import { StepDialog } from './StepDialog';
import { translateStepMissing, type KeywordSuggester, type Translator } from './journeyTranslation';
import { ProfileDialog } from './ProfileDialog';
import { getTranslationErrorKey } from '../Tenants/LegalSettings/utils/translationErrors';
import { journeyLabel, stepTitle } from './stepText';
import styles from './styles.module.scss';

export interface PhaseDialogProps {
    journey: Journey;
    phase: JourneyPhase;
    /** Machine translation through the Admin endpoint; without it no translation is offered. */
    translator?: Translator;
    /** Suggests search terms (ORISO-Admin#1562); without it none are offered. */
    suggester?: KeywordSuggester;
    /** Building blocks Funktionszugriff switched off. */
    blocked?: readonly string[];
    /** Opens one step, or the "add step" list, right away (stories). */
    initially?: { stepId?: string; adding?: boolean; language?: string };
    onApply: (journey: Journey) => void;
    onClose: () => void;
}

interface DropTarget {
    stepId: string;
    side: 'before' | 'after';
}

/**
 * The steps of one phase, in the order the person meets them. Steps are dragged by their handle
 * or moved with the arrow keys; a must step stays where it is.
 */
export const PhaseDialog = ({
    journey,
    phase,
    translator,
    suggester,
    blocked = [],
    initially,
    onApply,
    onClose,
}: PhaseDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<Journey>(journey);
    const [editingId, setEditingId] = useState<string | undefined>(initially?.stepId);
    /** `null` adds at the end, a step id adds right below that step. */
    const [addingAfter, setAddingAfter] = useState<string | null | undefined>(initially?.adding ? null : undefined);
    const [confirmRemove, setConfirmRemove] = useState<JourneyStep>();
    const [translationError, setTranslationError] = useState<string>();
    const [profileOf, setProfileOf] = useState<string>();
    const [draggedId, setDraggedId] = useState<string>();
    const [drop, setDrop] = useState<DropTarget>();
    const [announcement, setAnnouncement] = useState('');

    const language = MODULE_SOURCE_LANGUAGE;
    const steps = draft.phases[phase];
    const editing = steps.find((step) => step.id === editingId);
    const phaseName = t(`journeys.phase.${phase}`);
    const journeyName = journeyLabel(draft, t);
    const missingSafety = phase === 'flight' ? missingSafetyAspects(draft) : [];

    const moveTo = (step: JourneyStep, toIndex: number) => {
        const next = moveStep(draft, phase, step.id, toIndex);
        if (next === draft) return;
        setDraft(next);
        setAnnouncement(
            t('journeys.step.moved', {
                name: stepTitle(step, language, t),
                position: next.phases[phase].findIndex((candidate) => candidate.id === step.id) + 1,
                total: steps.length,
            }),
        );
    };

    const add = (newStep: NewStep) => {
        const id = nextId('step');
        setDraft((current) => addStep(current, phase, newStep, id, addingAfter ?? undefined, blocked));
        setAddingAfter(undefined);
        // What the platform ships is ready to use; everything else is written first.
        if (newStep.kind !== 'core' && newStep.kind !== 'addon') setEditingId(id);
    };

    const endDrag = () => {
        setDraggedId(undefined);
        setDrop(undefined);
    };

    const onDragOver = (event: DragEvent<HTMLLIElement>, step: JourneyStep) => {
        if (!draggedId || draggedId === step.id) return;
        event.preventDefault();
        const box = event.currentTarget.getBoundingClientRect();
        const side = event.clientY < box.top + box.height / 2 ? 'before' : 'after';
        if (drop?.stepId !== step.id || drop.side !== side) setDrop({ stepId: step.id, side });
    };

    const onDrop = (event: DragEvent<HTMLLIElement>) => {
        event.preventDefault();
        const dragged = steps.find((step) => step.id === draggedId);
        if (dragged && drop) {
            const from = steps.indexOf(dragged);
            const target = steps.findIndex((step) => step.id === drop.stepId) + (drop.side === 'after' ? 1 : 0);
            moveTo(dragged, target > from ? target - 1 : target);
        }
        endDrag();
    };

    return (
        <>
            <Modal
                icon={<PhaseIcon phase={phase} />}
                title={phaseName}
                description={`${journeyName} · ${t(`journeys.phaseHelp.${phase}`)}`}
                descriptionFullWidth
                width={720}
                zIndex={1100}
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
                wrapperTestId={`journey-phase-${phase}`}
                scrollableBody
            >
                <div className={styles.dialogBody}>
                    <p className={styles.srOnly} role="status" aria-live="polite">
                        {announcement}
                    </p>

                    <p className={styles.help}>{t(`journeys.phaseUnit.${phase}`)}</p>

                    {translationError && (
                        <div className={styles.warning} role="alert" data-testid="journey-translation-error">
                            <p>{t(translationError)}</p>
                        </div>
                    )}

                    {missingSafety.length > 0 && (
                        <div className={styles.warning} role="alert" data-testid="journey-safety-warning">
                            <p className={styles.noticeTitle}>{t('conversationModules.safety.title')}</p>
                            <p>
                                {t('conversationModules.safety.text', {
                                    titles: missingSafety
                                        .map((aspect) => aspect.title[language] || aspect.title.de)
                                        .join('“, „'),
                                })}
                            </p>
                        </div>
                    )}

                    {phase === 'arrival' && (
                        <ToggleRow
                            label={t('conversationModules.survey.anonymous')}
                            description={t('conversationModules.survey.anonymousHelp')}
                            checked={draft.survey.anonymous}
                            onCheckedChange={(anonymous) =>
                                setDraft((current) => ({ ...current, survey: { anonymous } }))
                            }
                        />
                    )}

                    {steps.length === 0 ? (
                        <p className={styles.intro}>{t('journeys.phase.empty')}</p>
                    ) : (
                        <>
                            {firstFreeIndex(steps) === 0 && (
                                <button
                                    type="button"
                                    className={classNames(styles.insertLine, styles.insertLineStart, {
                                        [styles.insertLineActive]: addingAfter === START_OF_PHASE,
                                    })}
                                    aria-expanded={addingAfter === START_OF_PHASE}
                                    aria-label={t('journeys.insert.start')}
                                    title={t('journeys.insert.start')}
                                    onClick={() => setAddingAfter(START_OF_PHASE)}
                                >
                                    <span className={styles.insertPlus} aria-hidden>
                                        <Add />
                                    </span>
                                </button>
                            )}
                            <ol className={styles.steps} aria-label={t('journeys.phase.steps', { phase: phaseName })}>
                                {steps.map((step, index) => (
                                    <StepCard
                                        key={step.id}
                                        step={step}
                                        phase={phase}
                                        skipped={isSkipped(step, blocked)}
                                        position={index + 1}
                                        total={steps.length}
                                        language={language}
                                        dragging={draggedId === step.id}
                                        dropLine={drop?.stepId === step.id ? drop.side : undefined}
                                        onOpen={() => setEditingId(step.id)}
                                        onAddBelow={() => setAddingAfter(step.id)}
                                        onMove={(direction) => moveTo(step, index + direction)}
                                        onRemove={() =>
                                            step.core === 'postcode'
                                                ? setConfirmRemove(step)
                                                : setDraft((current) => removeStep(current, phase, step.id))
                                        }
                                        onOpenProfile={() => setProfileOf(step.id)}
                                        onInsertBelow={() => setAddingAfter(step.id)}
                                        insertActive={addingAfter === step.id}
                                        topicPreselect={
                                            step.core === 'topic' && draft.conversationType === 'AGENCY_COUNSELLING'
                                                ? {
                                                      on: isTopicPreselected(draft),
                                                      allowed: canPreselectTopic(draft),
                                                      onToggle: (on: boolean) =>
                                                          setDraft((current) => setTopicPreselected(current, on)),
                                                  }
                                                : undefined
                                        }
                                        onTranslate={
                                            translator
                                                ? async () => {
                                                      setTranslationError(undefined);
                                                      try {
                                                          const translated = await translateStepMissing(
                                                              step,
                                                              translator,
                                                          );
                                                          setDraft((current) =>
                                                              updateStep(current, phase, step.id, translated),
                                                          );
                                                      } catch (error) {
                                                          setTranslationError(getTranslationErrorKey(error));
                                                      }
                                                  }
                                                : undefined
                                        }
                                        onMarkChecked={(code) =>
                                            setDraft((current) =>
                                                updateStep(current, phase, step.id, markChecked(step, code)),
                                            )
                                        }
                                        onDragStart={(event) => {
                                            if (!canMoveStep(step)) return;
                                            // Firefox starts a drag only once data is set.
                                            event.dataTransfer.setData('text/plain', step.id);
                                            // eslint-disable-next-line no-param-reassign -- the DnD API is set this way
                                            event.dataTransfer.effectAllowed = 'move';
                                            setDraggedId(step.id);
                                        }}
                                        onDragOver={(event) => onDragOver(event, step)}
                                        onDragEnd={endDrag}
                                        onDrop={onDrop}
                                    />
                                ))}
                            </ol>
                        </>
                    )}

                    <div className={styles.addStep}>
                        <M3Button variant="tonal" icon={<Add />} onClick={() => setAddingAfter(null)}>
                            {t('journeys.add.title')}
                        </M3Button>
                    </div>
                </div>
            </Modal>
            {profileOf && steps.find((step) => step.id === profileOf) && (
                <ProfileDialog
                    title={stepTitle(steps.find((step) => step.id === profileOf) as JourneyStep, language, t)}
                    profile={steps.find((step) => step.id === profileOf)?.profile}
                    defaultAuthor={t('journeys.profile.platform')}
                    translator={translator}
                    suggester={suggester}
                    onApply={(profile) => {
                        setDraft((current) => updateStep(current, phase, profileOf, { profile }));
                        setProfileOf(undefined);
                    }}
                    onClose={() => setProfileOf(undefined)}
                />
            )}
            {confirmRemove && (
                <Modal
                    titleKey="journeys.removePostcode.title"
                    contentKey="journeys.removePostcode.text"
                    okLabelKey="journeys.removePostcode.ok"
                    cancelLabelKey="journeys.action.cancel"
                    zIndex={1300}
                    onConfirm={() => {
                        setDraft((current) => removeStep(current, phase, confirmRemove.id));
                        setConfirmRemove(undefined);
                    }}
                    onClose={() => setConfirmRemove(undefined)}
                />
            )}
            {addingAfter !== undefined && (
                <AddStepDialog
                    journey={draft}
                    phase={phase}
                    blocked={blocked}
                    onAdd={add}
                    onClose={() => setAddingAfter(undefined)}
                />
            )}
            {editing && (
                <StepDialog
                    key={editing.id}
                    step={editing}
                    phase={phase}
                    context={{ journey: journeyName, position: steps.indexOf(editing) + 1 }}
                    initialLanguage={initially?.stepId === editing.id ? initially.language : undefined}
                    translator={translator}
                    suggester={suggester}
                    onApply={(step) => {
                        setDraft((current) => updateStep(current, phase, step.id, step));
                        setEditingId(undefined);
                    }}
                    onSplit={(step) => {
                        setDraft((current) =>
                            splitQuestionStep(updateStep(current, phase, step.id, step), phase, step.id, () =>
                                nextId('step'),
                            ),
                        );
                        setAnnouncement(t('journeys.stepDialog.splitDone', { count: step.questions?.length ?? 0 }));
                        setEditingId(undefined);
                    }}
                    onClose={() => setEditingId(undefined)}
                />
            )}
        </>
    );
};
