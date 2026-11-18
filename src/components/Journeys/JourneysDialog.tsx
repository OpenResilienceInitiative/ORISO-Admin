import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Add from '@mui/icons-material/Add';
import ConnectingAirports from '@mui/icons-material/ConnectingAirports';
import { Modal } from '../Modal';
import { M3Button } from '../M3Button';
import { FloatingLabelInput } from '../FloatingLabelInput';
import type { ConversationType } from '../ConversationModules/conversationModule';
import { FlightPath } from './FlightPath';
import {
    duplicateJourney,
    hasRegistrationRoute,
    journeysOf,
    newJourney,
    phasesOf,
    prepareJourneyForPublish,
    topicsWithoutRoute,
    type Journey,
    type JourneyLevel,
    type JourneyPhase,
    type JourneyTopic,
} from './journey';
import { DestinationsDialog } from './DestinationsDialog';
import { nextId } from './ids';
import { JourneyCard } from './JourneyCard';
import { PhaseDialog } from './PhaseDialog';
import { journeyLabel } from './stepText';
import styles from './styles.module.scss';

export interface JourneysDialogOpen {
    journeyId: string;
    phase?: JourneyPhase;
    stepId?: string;
    adding?: boolean;
    destinations?: boolean;
}

export interface JourneysDialogProps {
    type: ConversationType;
    /** The name the platform gave the conversation type; the shipped one without. */
    typeName?: string;
    /** The journeys of every conversation type; this dialog edits the ones of `type`. */
    journeys: Journey[];
    topics: JourneyTopic[];
    translate?: (text: string, language: string) => string;
    /** Which level edits: below the platform the check-in is the platform's (decision 29). */
    level?: JourneyLevel;
    /** Building blocks Funktionszugriff switched off. */
    blocked?: readonly string[];
    /** Opens a phase, a step or the destinations of one journey right away (stories). */
    initially?: JourneysDialogOpen;
    onSave: (journeys: Journey[]) => void;
    onClose: () => void;
}

/**
 * The journeys of one conversation type. Opened from the Journeys section and from the tile of
 * the conversation type in Funktionszugriff.
 */
export const JourneysDialog = ({
    type,
    typeName,
    journeys: stored,
    topics,
    translate,
    level = 'platform',
    blocked = [],
    initially,
    onSave,
    onClose,
}: JourneysDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<Journey[]>(stored);
    const [phaseOf, setPhaseOf] = useState(
        initially?.phase ? { id: initially.journeyId, phase: initially.phase } : undefined,
    );
    const [destinationsOf, setDestinationsOf] = useState(initially?.destinations ? initially.journeyId : undefined);
    const [renaming, setRenaming] = useState<{ id: string; name: string }>();
    const [removingId, setRemovingId] = useState<string>();

    const own = journeysOf(draft, type);
    const typeLabel = typeName ?? t(`conversationModules.type.${type}`);
    const unrouted = hasRegistrationRoute(type) ? topicsWithoutRoute(draft, type, topics) : [];
    const find = (id: string | undefined) => draft.find((journey) => journey.id === id);
    const replace = (journey: Journey) =>
        setDraft((current) => current.map((candidate) => (candidate.id === journey.id ? journey : candidate)));

    const phaseJourney = find(phaseOf?.id);
    const removing = find(removingId);

    const save = () =>
        onSave(
            draft.map((journey) => {
                const before = stored.find((candidate) => candidate.id === journey.id);
                return before ? prepareJourneyForPublish(journey, before) : journey;
            }),
        );

    return (
        <>
            <Modal
                icon={<ConnectingAirports />}
                title={t('journeys.dialog.title', { type: typeLabel })}
                descriptionKey="journeys.dialog.description"
                descriptionFullWidth
                width={1080}
                footer={
                    <div className={styles.footer}>
                        <M3Button variant="text" onClick={onClose}>
                            {t('journeys.action.cancel')}
                        </M3Button>
                        <M3Button variant="filled" onClick={save}>
                            {t('journeys.action.save')}
                        </M3Button>
                    </div>
                }
                onClose={onClose}
                wrapperTestId="journeys-dialog"
            >
                <div className={styles.dialogBody}>
                    <FlightPath available={phasesOf(type)} captions />
                    {unrouted.length > 0 && (
                        <div className={styles.notice} data-testid="journeys-unrouted">
                            <p className={styles.noticeTitle}>
                                {t('journeys.unrouted.title', { count: unrouted.length })}
                            </p>
                            <p>
                                {t('journeys.unrouted.text', {
                                    topics: unrouted.map((topic) => topic.name).join(', '),
                                })}
                            </p>
                        </div>
                    )}
                    {own.length === 0 ? (
                        <p className={styles.intro}>{t('journeys.dialog.empty')}</p>
                    ) : (
                        <ul className={styles.journeys} aria-label={t('journeys.dialog.title', { type: typeLabel })}>
                            {own.map((journey) => (
                                <JourneyCard
                                    key={journey.id}
                                    journey={journey}
                                    topics={topics}
                                    level={level}
                                    onOpenPhase={(phase) => setPhaseOf({ id: journey.id, phase })}
                                    onOpenDestinations={() => setDestinationsOf(journey.id)}
                                    onRename={() => setRenaming({ id: journey.id, name: journey.name })}
                                    onDuplicate={() =>
                                        setDraft((current) => {
                                            const copy = duplicateJourney(current, journey.id, nextId('journey'));
                                            return copy ? [...current, copy] : current;
                                        })
                                    }
                                    onRemove={() => setRemovingId(journey.id)}
                                />
                            ))}
                        </ul>
                    )}
                    <div>
                        <M3Button
                            variant="tonal"
                            icon={<Add />}
                            onClick={() =>
                                setDraft((current) => [...current, newJourney(current, type, nextId('journey'))])
                            }
                        >
                            {t('journeys.dialog.add')}
                        </M3Button>
                    </div>
                </div>
            </Modal>

            {phaseOf && phaseJourney && (
                <PhaseDialog
                    key={`${phaseOf.id}-${phaseOf.phase}`}
                    journey={phaseJourney}
                    phase={phaseOf.phase}
                    translate={translate}
                    blocked={blocked}
                    initially={
                        initially?.journeyId === phaseOf.id && initially.phase === phaseOf.phase
                            ? { stepId: initially.stepId, adding: initially.adding }
                            : undefined
                    }
                    onApply={(journey) => {
                        replace(journey);
                        setPhaseOf(undefined);
                    }}
                    onClose={() => setPhaseOf(undefined)}
                />
            )}

            {destinationsOf && (
                <DestinationsDialog
                    journeys={draft}
                    journeyId={destinationsOf}
                    topics={topics}
                    onApply={(next) => {
                        setDraft(next);
                        setDestinationsOf(undefined);
                    }}
                    onClose={() => setDestinationsOf(undefined)}
                />
            )}

            {renaming && (
                <Modal
                    titleKey="journeys.journey.rename"
                    okLabelKey="journeys.action.apply"
                    cancelLabelKey="journeys.action.cancel"
                    zIndex={1100}
                    onConfirm={() => {
                        const journey = find(renaming.id);
                        if (journey) replace({ ...journey, name: renaming.name.trim() });
                        setRenaming(undefined);
                    }}
                    onClose={() => setRenaming(undefined)}
                >
                    <FloatingLabelInput
                        label={t('journeys.journey.name')}
                        value={renaming.name}
                        onChange={(event) => setRenaming({ id: renaming.id, name: event.target.value })}
                    />
                </Modal>
            )}

            {removing && (
                <Modal
                    titleKey="journeys.journey.removeTitle"
                    titleKeyOptions={{ journey: journeyLabel(removing, t) }}
                    contentKey="journeys.journey.removeText"
                    okLabelKey="journeys.journey.remove"
                    cancelLabelKey="journeys.action.cancel"
                    zIndex={1100}
                    onConfirm={() => {
                        setDraft((current) => current.filter((journey) => journey.id !== removing.id));
                        setRemovingId(undefined);
                    }}
                    onClose={() => setRemovingId(undefined)}
                />
            )}
        </>
    );
};
