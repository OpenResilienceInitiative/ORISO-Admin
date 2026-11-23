import type { ConversationType } from '../ConversationModules/conversationModule';
import {
    JOURNEY_PHASES,
    addStep,
    assignRegistrationTopic,
    canRemoveStep,
    duplicateJourney,
    editablePhases,
    hasValidOrder,
    moveStep,
    newJourney,
    removeStep,
    setRoutes,
    setTopicPreselected,
    splitQuestionStep,
    unassignRegistrationTopic,
    updateStep,
    type Journey,
    type JourneyLevel,
    type JourneyPhase,
    type JourneyRoutes,
    type JourneyStep,
    type NewStep,
} from './journey';

/**
 * The one way to change journeys. Every dialog sends a command with the editing context and gets
 * the changed journeys back, or a refusal it can show; the save path can run the same check. The
 * rules live here and in `journey.ts`, never in a dialog.
 */

/** Who is editing: the level, and the building blocks Funktionszugriff switched off. */
export interface EditingContext {
    level: JourneyLevel;
    blocked: readonly string[];
}

export const PLATFORM_EDITING: EditingContext = { level: 'platform', blocked: [] };

/** Changes inside one journey. */
export type JourneyCommand =
    | { type: 'addStep'; phase: JourneyPhase; step: NewStep; id: string; after?: string }
    | { type: 'moveStep'; phase: JourneyPhase; stepId: string; toIndex: number }
    | { type: 'removeStep'; phase: JourneyPhase; stepId: string }
    /** The step dialog's result. Its kind and building block cannot change. */
    | { type: 'replaceStep'; phase: JourneyPhase; step: JourneyStep }
    | { type: 'updateStep'; phase: JourneyPhase; stepId: string; patch: Partial<Omit<JourneyStep, 'id' | 'kind'>> }
    | { type: 'splitStep'; phase: JourneyPhase; stepId: string; ids: string[] }
    | { type: 'preselectTopic'; on: boolean }
    | { type: 'rename'; name: string }
    | { type: 'setSurvey'; anonymous: boolean }
    | { type: 'setRoutes'; routes: JourneyRoutes };

/** Changes to the journeys of an installation. */
export type JourneysCommand =
    | { type: 'edit'; journeyId: string; command: JourneyCommand }
    | { type: 'create'; conversationType: ConversationType; id: string }
    | { type: 'duplicate'; sourceId: string; id: string; name: string }
    | { type: 'delete'; journeyId: string }
    | { type: 'assignRegistration'; journeyId: string; topicId: number }
    | { type: 'unassignRegistration'; journeyId: string; topicId: number };

/**
 * Why a change was refused: the phase belongs to a higher level, the journey as a whole is the
 * platform's, or the journey's own rules say no (a must step, the order, a building block).
 */
export type Refusal = 'phaseOfHigherLevel' | 'platformOnly' | 'againstTheRules' | 'unknownJourney';

export type EditResult<T> = { ok: true; value: T } | { ok: false; reason: Refusal };

const refuse = <T>(reason: Refusal): EditResult<T> => ({ ok: false, reason });
const accept = <T>(value: T): EditResult<T> => ({ ok: true, value });

const phaseOf = (command: JourneyCommand): JourneyPhase | undefined => {
    switch (command.type) {
        case 'addStep':
        case 'moveStep':
        case 'removeStep':
        case 'replaceStep':
        case 'updateStep':
        case 'splitStep':
            return command.phase;
        case 'preselectTopic':
            return 'departure';
        default:
            return undefined;
    }
};

const stepIn = (journey: Journey, phase: JourneyPhase, id: string) =>
    journey.phases[phase].find((step) => step.id === id);

/** The model answers an impossible change with the journey unchanged. */
const changed = (before: Journey, after: Journey): EditResult<Journey> =>
    after === before ? refuse('againstTheRules') : accept(after);

const run = (journey: Journey, command: JourneyCommand, context: EditingContext): EditResult<Journey> => {
    switch (command.type) {
        case 'addStep':
            return changed(
                journey,
                addStep(journey, command.phase, command.step, command.id, command.after, context.blocked),
            );
        case 'moveStep':
            return changed(journey, moveStep(journey, command.phase, command.stepId, command.toIndex));
        case 'removeStep':
            return changed(journey, removeStep(journey, command.phase, command.stepId));
        case 'replaceStep': {
            const before = stepIn(journey, command.phase, command.step.id);
            if (
                !before ||
                before.kind !== command.step.kind ||
                before.core !== command.step.core ||
                before.addon !== command.step.addon
            ) {
                return refuse('againstTheRules');
            }
            return accept(updateStep(journey, command.phase, command.step.id, command.step));
        }
        case 'updateStep': {
            if (!stepIn(journey, command.phase, command.stepId)) return refuse('againstTheRules');
            const patch = { ...command.patch } as Partial<JourneyStep>;
            delete patch.core;
            delete patch.addon;
            return accept(updateStep(journey, command.phase, command.stepId, patch));
        }
        case 'splitStep': {
            const next = splitQuestionStep(
                journey,
                command.phase,
                command.stepId,
                (index) => command.ids[index - 1] ?? `${command.stepId}-${index}`,
            );
            return changed(journey, next);
        }
        case 'preselectTopic':
            return changed(journey, setTopicPreselected(journey, command.on));
        case 'rename':
            return accept({ ...journey, name: command.name.trim() });
        case 'setSurvey':
            return accept({ ...journey, survey: { anonymous: command.anonymous } });
        case 'setRoutes':
            return accept(setRoutes(journey, command.routes));
        default:
            return refuse('againstTheRules');
    }
};

/** Below the platform only the steps of the phases that level owns change; the rest is the platform's. */
const allowedAtLevel = (command: JourneyCommand, context: EditingContext): Refusal | undefined => {
    if (context.level === 'platform') return undefined;
    const phase = phaseOf(command);
    if (phase === undefined) return 'platformOnly';
    return editablePhases(context.level).includes(phase) ? undefined : 'phaseOfHigherLevel';
};

/** Applies one change to one journey, or says why not. */
export const editJourney = (
    journey: Journey,
    command: JourneyCommand,
    context: EditingContext = PLATFORM_EDITING,
): EditResult<Journey> => {
    const denied = allowedAtLevel(command, context);
    if (denied) return refuse(denied);
    const result = run(journey, command, context);
    if (!result.ok) return result;
    return JOURNEY_PHASES.every((phase) => hasValidOrder(result.value.phases[phase]))
        ? result
        : refuse('againstTheRules');
};

/** Applies one change to the journeys of an installation, or says why not. */
export const editJourneys = (
    journeys: Journey[],
    command: JourneysCommand,
    context: EditingContext = PLATFORM_EDITING,
): EditResult<Journey[]> => {
    if (command.type === 'edit') {
        const journey = journeys.find((candidate) => candidate.id === command.journeyId);
        if (!journey) return refuse('unknownJourney');
        const result = editJourney(journey, command.command, context);
        if (result.ok === false) return refuse(result.reason);
        return accept(journeys.map((candidate) => (candidate.id === journey.id ? result.value : candidate)));
    }
    if (context.level !== 'platform') return refuse('platformOnly');
    switch (command.type) {
        case 'create':
            return accept([...journeys, newJourney(journeys, command.conversationType, command.id)]);
        case 'duplicate': {
            const copy = duplicateJourney(journeys, command.sourceId, command.id, command.name);
            return copy ? accept([...journeys, copy]) : refuse('unknownJourney');
        }
        case 'delete':
            return journeys.some((journey) => journey.id === command.journeyId)
                ? accept(journeys.filter((journey) => journey.id !== command.journeyId))
                : refuse('unknownJourney');
        case 'assignRegistration': {
            const next = assignRegistrationTopic(journeys, command.journeyId, command.topicId);
            return next === journeys ? refuse('againstTheRules') : accept(next);
        }
        case 'unassignRegistration':
            return accept(unassignRegistrationTopic(journeys, command.journeyId, command.topicId));
        default:
            return refuse('againstTheRules');
    }
};

/** Whether a change would be accepted: for showing or hiding the control that sends it. */
export const mayEditJourney = (journey: Journey, command: JourneyCommand, context: EditingContext) =>
    editJourney(journey, command, context).ok;

export const mayEditJourneys = (journeys: Journey[], command: JourneysCommand, context: EditingContext) =>
    editJourneys(journeys, command, context).ok;

/** Whether this level may remove the step at all (independent of the step's position). */
export const mayRemove = (step: JourneyStep, phase: JourneyPhase, context: EditingContext) =>
    canRemoveStep(step) && (context.level === 'platform' || editablePhases(context.level).includes(phase));

// ---- layers below the platform ------------------------------------------------------------------

/**
 * What a Träger or a Beratungsstelle changed in a platform journey: only the phases its level may
 * edit, stored on their own (ADR-036 decision 29). The platform journey itself never changes.
 */
export interface JourneyLayer {
    journeyId: string;
    level: Exclude<JourneyLevel, 'platform'>;
    /** The Träger (tenant) or Beratungsstelle (agency) the layer belongs to. */
    ownerId: string;
    phases: Partial<Record<JourneyPhase, JourneyStep[]>>;
}

const LEVEL_ORDER: Record<JourneyLevel, number> = { platform: 0, tenant: 1, agency: 2 };

/**
 * The journeys a level sees: the platform's, with the Träger layer on top and the Beratungsstelle
 * layer on top of that. Pass only the layers of the viewer's own Träger and centre.
 */
export const effectiveJourneys = (platform: Journey[], layers: JourneyLayer[]): Journey[] => {
    const ordered = [...layers].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
    return platform.map((journey) =>
        ordered
            .filter((layer) => layer.journeyId === journey.id)
            .reduce<Journey>((current, layer) => {
                const phases = { ...current.phases };
                editablePhases(layer.level).forEach((phase) => {
                    const steps = layer.phases[phase];
                    if (steps) phases[phase] = steps;
                });
                return { ...current, phases };
            }, journey),
    );
};

/**
 * The layers to store after a lower level edited: for each journey, the phases of that level that
 * differ from what it inherits (`inherited`: the platform journeys with the layers of the levels
 * above, without its own). A phase put back to the inherited one drops out of the layer. Every
 * platform journey stays as it was.
 */
export const layersFrom = (
    edited: Journey[],
    inherited: Journey[],
    level: Exclude<JourneyLevel, 'platform'>,
    ownerId: string,
): JourneyLayer[] =>
    edited.flatMap((journey) => {
        const before = inherited.find((candidate) => candidate.id === journey.id);
        if (!before) return [];
        const phases: JourneyLayer['phases'] = {};
        editablePhases(level).forEach((phase) => {
            if (JSON.stringify(journey.phases[phase]) !== JSON.stringify(before.phases[phase])) {
                phases[phase] = journey.phases[phase];
            }
        });
        return Object.keys(phases).length > 0 ? [{ journeyId: journey.id, level, ownerId, phases }] : [];
    });

/** What a level inherits: the platform journeys with the layers of the levels above it. */
export const inheritedJourneys = (platform: Journey[], layers: JourneyLayer[], level: JourneyLevel): Journey[] =>
    effectiveJourneys(
        platform,
        layers.filter((layer) => LEVEL_ORDER[layer.level] < LEVEL_ORDER[level]),
    );
