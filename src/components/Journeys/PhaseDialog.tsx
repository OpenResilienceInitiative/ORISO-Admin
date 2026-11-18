import { useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Add from '@mui/icons-material/Add';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { ToggleRow } from '../ToggleRow';
import { MODULE_SOURCE_LANGUAGE } from '../ConversationModules/conversationModule';
import {
    addStep,
    canMoveStep,
    isSkipped,
    missingSafetyAspects,
    moveStep,
    picksAgencyFromList,
    removeStep,
    translateMissing,
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
import { journeyLabel, stepTitle } from './stepText';
import styles from './styles.module.scss';

export interface PhaseDialogProps {
    journey: Journey;
    phase: JourneyPhase;
    translate?: (text: string, language: string) => string;
    /** Building blocks Funktionszugriff switched off. */
    blocked?: readonly string[];
    /** Opens one step, or the "add step" list, right away (stories). */
    initially?: { stepId?: string; adding?: boolean };
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
    translate,
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
            >
                <div className={styles.dialogBody}>
                    <p className={styles.srOnly} role="status" aria-live="polite">
                        {announcement}
                    </p>

                    <p className={styles.help}>{t(`journeys.phaseUnit.${phase}`)}</p>

                    {phase === 'departure' && draft.conversationType === 'AGENCY_COUNSELLING' && (
                        <div
                            className={styles.notice}
                            data-testid={picksAgencyFromList(draft) ? 'journey-no-postcode' : 'journey-agency-fixed'}
                        >
                            <p className={styles.noticeTitle}>
                                {t(
                                    picksAgencyFromList(draft)
                                        ? 'journeys.noPostcode.title'
                                        : 'journeys.agencyFixed.title',
                                )}
                            </p>
                            <p>
                                {t(
                                    picksAgencyFromList(draft)
                                        ? 'journeys.noPostcode.text'
                                        : 'journeys.agencyFixed.text',
                                )}
                            </p>
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
                                    onRemove={() => setDraft((current) => removeStep(current, phase, step.id))}
                                    onTranslate={
                                        translate
                                            ? () =>
                                                  setDraft((current) =>
                                                      updateStep(
                                                          current,
                                                          phase,
                                                          step.id,
                                                          translateMissing(step, translate),
                                                      ),
                                                  )
                                            : undefined
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
                    )}

                    <div className={styles.addStep}>
                        <M3Button variant="tonal" icon={<Add />} onClick={() => setAddingAfter(null)}>
                            {t('journeys.add.title')}
                        </M3Button>
                    </div>
                </div>
            </Modal>
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
                    translate={translate}
                    onApply={(step) => {
                        setDraft((current) => updateStep(current, phase, step.id, step));
                        setEditingId(undefined);
                    }}
                    onClose={() => setEditingId(undefined)}
                />
            )}
        </>
    );
};
