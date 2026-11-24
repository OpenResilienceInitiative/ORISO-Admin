import { useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Add from '@mui/icons-material/Add';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { ToggleRow } from '../ToggleRow';
import { MODULE_SOURCE_LANGUAGE } from '../ConversationModules/conversationModule';
import {
    canMoveBy,
    canMoveStep,
    editablePhases,
    isSkipped,
    markChecked,
    missingSafetyAspects,
    moveRefusal,
    movesWith,
    type MoveRefusal,
    START_OF_PHASE,
    canPreselectTopic,
    firstFreeIndex,
    isTopicPreselected,
    updateStep,
    type Journey,
    type JourneyLevel,
    type JourneyPhase,
    type JourneyStep,
    type NewStep,
} from './journey';
import { AddStepDialog } from './AddStepDialog';
import { nextId } from './ids';
import { PhaseIcon } from './PhaseIcon';
import { StepCard } from './StepCard';
import { StepDialog } from './StepDialog';
import {
    applyTranslationFill,
    requestStepTranslation,
    type KeywordSuggester,
    type Translator,
} from './journeyTranslation';
import { editJourney, mayEditJourney, type EditingContext, type JourneyCommand } from './journeyEditing';
import { BlockDialog } from './BlockDialog';
import type { ProfileView } from './ProfileDialog';
import { getTranslationErrorKey } from '../Tenants/LegalSettings/utils/translationErrors';
import { blockContext, journeyLabel, stepTitle } from './stepText';
import { useDiscardGuard } from './useDiscardGuard';
import { snackbar } from '../Snackbar';
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
    /** Who edits. A phase of a higher level opens read-only. */
    level?: JourneyLevel;
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
    level = 'platform',
    initially,
    onApply,
    onClose,
}: PhaseDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<Journey>(journey);
    const guard = useDiscardGuard(draft, journey, onClose);
    const [editingId, setEditingId] = useState<string | undefined>(initially?.stepId);
    /** `null` adds at the end, a step id adds right below that step. */
    const [addingAfter, setAddingAfter] = useState<string | null | undefined>(initially?.adding ? null : undefined);
    const [confirmRemove, setConfirmRemove] = useState<JourneyStep>();
    const [translationError, setTranslationError] = useState<string>();
    const [profileOf, setProfileOf] = useState<{ id: string; view: ProfileView }>();
    const [draggedId, setDraggedId] = useState<string>();
    const [drop, setDrop] = useState<DropTarget>();
    const [announcement, setAnnouncement] = useState('');
    const [translatingId, setTranslatingId] = useState<string>();

    const context: EditingContext = { level, blocked };
    const readOnly = !editablePhases(level).includes(phase);
    /** Every change goes through the rules of `journeyEditing`; a refused one changes nothing. */
    const edit = (...commands: JourneyCommand[]) =>
        setDraft((current) =>
            commands.reduce((before, command) => {
                const result = editJourney(before, command, context);
                return result.ok ? result.value : before;
            }, current),
        );

    const language = MODULE_SOURCE_LANGUAGE;
    const steps = draft.phases[phase];
    const editing = steps.find((step) => step.id === editingId);
    const phaseName = t(`journeys.phase.${phase}`);
    const journeyName = journeyLabel(draft, t);
    const profileStep = profileOf && steps.find((step) => step.id === profileOf.id);
    const missingSafety = phase === 'flight' ? missingSafetyAspects(draft) : [];

    /** A refused move says why, visibly (Frank, 2026-11-24): before, the card just did not move. */
    const explainRefusal = (step: JourneyStep, reason: MoveRefusal | undefined) => {
        const name = stepTitle(step, language, t);
        const text =
            reason && reason !== 'edge'
                ? t(`journeys.step.cannotMove.${reason}`, { name })
                : t('journeys.step.cannotMove', { name });
        setAnnouncement(text);
        if (reason === 'edge') return;
        snackbar.info({
            title: t('journeys.step.cannotMove.title'),
            description: text,
            causeKey: `journey-move-refused-${reason ?? 'other'}`,
            testId: 'journey-move-refused',
        });
    };

    const moveTo = (step: JourneyStep, toIndex: number) => {
        const result = editJourney(draft, { type: 'moveStep', phase, stepId: step.id, toIndex }, context);
        if (result.ok === false) {
            explainRefusal(
                step,
                result.reason === 'againstTheRules' ? moveRefusal(draft, phase, step.id, toIndex) : undefined,
            );
            return;
        }
        const next = result.value;
        setDraft(next);
        const together = movesWith(steps, step.id);
        const position = (id: string) => next.phases[phase].findIndex((candidate) => candidate.id === id) + 1;
        setAnnouncement(
            together.length > 1
                ? t('journeys.step.movedPair', {
                      position: position(together[0]),
                      next: position(together[1]),
                      total: steps.length,
                  })
                : t('journeys.step.moved', {
                      name: stepTitle(step, language, t),
                      position: position(step.id),
                      total: steps.length,
                  }),
        );
    };

    const add = (newStep: NewStep) => {
        const id = nextId('step');
        edit({ type: 'addStep', phase, step: newStep, id, after: addingAfter ?? undefined });
        setAddingAfter(undefined);
        // What the platform ships is ready to use; everything else is written first.
        if (newStep.kind !== 'core' && newStep.kind !== 'addon') setEditingId(id);
    };

    const endDrag = () => {
        setDraggedId(undefined);
        setDrop(undefined);
    };

    const onDragOver = (event: DragEvent<HTMLLIElement>, step: JourneyStep) => {
        // The pair moves as one: its own partner is no drop target.
        if (!draggedId || movesWith(steps, draggedId).includes(step.id)) return;
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
                        {!readOnly && (
                            <M3Button
                                variant="filled"
                                disabled={translatingId !== undefined}
                                onClick={() => onApply(draft)}
                            >
                                {t('journeys.action.apply')}
                            </M3Button>
                        )}
                    </div>
                }
                onClose={onClose}
                onDismiss={guard.onDismiss}
                wrapperTestId={`journey-phase-${phase}`}
                scrollableBody
            >
                <div className={styles.dialogBody}>
                    {guard.confirm}
                    <p className={styles.srOnly} role="status" aria-live="polite">
                        {announcement}
                    </p>

                    <p className={styles.help}>{t(`journeys.phaseUnit.${phase}`)}</p>

                    {readOnly && (
                        <div className={styles.notice} data-testid="journey-phase-read-only">
                            <p>{t('journeys.level.departureLocked')}</p>
                        </div>
                    )}

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

                    {phase === 'arrival' && mayEditJourney(draft, { type: 'setSurvey', anonymous: true }, context) && (
                        <ToggleRow
                            label={t('conversationModules.survey.anonymous')}
                            description={t('conversationModules.survey.anonymousHelp')}
                            checked={draft.survey.anonymous}
                            onCheckedChange={(anonymous) => edit({ type: 'setSurvey', anonymous })}
                        />
                    )}

                    {steps.length === 0 ? (
                        <p className={styles.intro}>{t('journeys.phase.empty')}</p>
                    ) : (
                        <>
                            {!readOnly && firstFreeIndex(steps) === 0 && (
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
                                        dragging={
                                            draggedId !== undefined && movesWith(steps, draggedId).includes(step.id)
                                        }
                                        dropLine={drop?.stepId === step.id ? drop.side : undefined}
                                        onOpen={() => setEditingId(step.id)}
                                        onAddBelow={() => setAddingAfter(step.id)}
                                        onMove={(direction) => moveTo(step, index + direction)}
                                        onRemove={() =>
                                            step.core === 'postcode'
                                                ? setConfirmRemove(step)
                                                : edit({ type: 'removeStep', phase, stepId: step.id })
                                        }
                                        onOpenProfile={(view) => setProfileOf({ id: step.id, view })}
                                        onInsertBelow={readOnly ? undefined : () => setAddingAfter(step.id)}
                                        insertActive={addingAfter === step.id}
                                        readOnly={readOnly}
                                        canMoveUp={canMoveBy(draft, phase, step.id, -1)}
                                        canMoveDown={canMoveBy(draft, phase, step.id, 1)}
                                        topicPreselect={
                                            step.core === 'topic' && !readOnly
                                                ? {
                                                      on: isTopicPreselected(draft),
                                                      allowed: canPreselectTopic(draft),
                                                      onToggle: (on: boolean) => edit({ type: 'preselectTopic', on }),
                                                  }
                                                : undefined
                                        }
                                        translating={translatingId === step.id}
                                        onTranslate={
                                            translator && !readOnly
                                                ? async () => {
                                                      setTranslatingId(step.id);
                                                      setTranslationError(undefined);
                                                      try {
                                                          const fill = await requestStepTranslation(step, translator);
                                                          // Into the step as it is now; a step removed meanwhile stays removed.
                                                          setDraft((current) => {
                                                              const now = current.phases[phase].find(
                                                                  (candidate) => candidate.id === step.id,
                                                              );
                                                              return now
                                                                  ? updateStep(
                                                                        current,
                                                                        phase,
                                                                        step.id,
                                                                        applyTranslationFill(now, fill),
                                                                    )
                                                                  : current;
                                                          });
                                                      } catch (error) {
                                                          setTranslationError(getTranslationErrorKey(error));
                                                      } finally {
                                                          setTranslatingId(undefined);
                                                      }
                                                  }
                                                : undefined
                                        }
                                        onMarkChecked={(code) =>
                                            setDraft((current) => {
                                                const now = current.phases[phase].find(
                                                    (candidate) => candidate.id === step.id,
                                                );
                                                return now
                                                    ? updateStep(current, phase, step.id, markChecked(now, code))
                                                    : current;
                                            })
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

                    {!readOnly && (
                        <div className={styles.addStep}>
                            <M3Button variant="tonal" icon={<Add />} onClick={() => setAddingAfter(null)}>
                                {t('journeys.add.title')}
                            </M3Button>
                        </div>
                    )}
                </div>
            </Modal>
            {profileOf && profileStep && (
                <BlockDialog
                    view={profileOf.view}
                    title={stepTitle(profileStep, language, t)}
                    context={blockContext(
                        profileStep,
                        { journey: journeyName, phase, position: steps.indexOf(profileStep) + 1 },
                        t,
                    )}
                    profile={profileStep.profile}
                    defaultAuthor={t('journeys.profile.platform')}
                    translator={translator}
                    suggester={suggester}
                    onApply={(profile) => {
                        edit({ type: 'updateStep', phase, stepId: profileOf.id, patch: { profile } });
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
                        edit({ type: 'removeStep', phase, stepId: confirmRemove.id });
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
                        edit({ type: 'replaceStep', phase, step });
                        setEditingId(undefined);
                    }}
                    onSplit={(step) => {
                        edit(
                            { type: 'replaceStep', phase, step },
                            {
                                type: 'splitStep',
                                phase,
                                stepId: step.id,
                                ids: (step.questions ?? []).slice(1).map(() => nextId('step')),
                            },
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
