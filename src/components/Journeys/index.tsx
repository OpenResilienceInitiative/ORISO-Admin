import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import { Card } from '../Card';
import { M3Button } from '../M3Button';
import { CONVERSATION_TYPES, type ConversationType } from '../ConversationModules/conversationModule';
import { nameOf, type AppearanceSettings } from '../ConversationTypeAppearance/appearance';
import { ConversationTypeSettingsDialog } from '../ConversationTypeAppearance/ConversationTypeSettingsDialog';
import { TypeIcon } from '../ConversationTypeAppearance/TypeIcon';
import {
    coveredTopicsOf,
    hasRegistrationRoute,
    journeysOf,
    phasesOf,
    topicsWithoutRoute,
    typeSummary,
    type Journey,
    type JourneyLevel,
    type JourneyTopic,
} from './journey';
import { FlightPath } from './FlightPath';
import { JourneysDialog, type JourneysDialogOpen } from './JourneysDialog';
import type { KeywordSuggester, Translator } from './journeyTranslation';
import type { JourneyLayer } from './journeyEditing';
import { memoryJourneyStore, type JourneyStore } from './journeyStore';
import { useJourneyWorkspace, type JourneyBase, type JourneyScope } from './useJourneyWorkspace';
import styles from './styles.module.scss';

const NO_LAYERS: JourneyLayer[] = [];

/** Topic chips on a tile before the rest is folded into "+ n". */
const SHOWN_TOPICS = 5;

interface JourneyTileEntryProps {
    type: ConversationType;
    journeys: Journey[];
    topics: JourneyTopic[];
    /** Without it the journeys are shown only (e.g. below the platform before it stored any). */
    onOpen?: () => void;
    /** Platform admin only: name and icon of the conversation type. */
    onEditAppearance?: () => void;
}

/**
 * The journeys of a conversation type on its tile: what a journey is (drawn as a flight), how
 * many there are, which topics they reach, and the way in. Used in the Journeys section and on
 * the conversation type's tile in Funktionszugriff.
 */
export const JourneyTileEntry = ({ type, journeys, topics, onOpen, onEditAppearance }: JourneyTileEntryProps) => {
    const { t } = useTranslation();
    const summary = typeSummary(journeys, type);
    const nameOfTopic = (id: number) => topics.find((topic) => topic.id === id)?.name ?? `#${id}`;
    const covered = coveredTopicsOf(journeysOf(journeys, type));
    const unrouted = hasRegistrationRoute(type) ? topicsWithoutRoute(journeys, type, topics) : [];

    return (
        <div className={styles.entry} data-testid={`journeys-entry-${type}`}>
            <FlightPath available={phasesOf(type)} />
            <p className={styles.entryCount}>
                <strong>{summary.journeys}</strong> {t('journeys.entry.journeys', { count: summary.journeys })}
                <span aria-hidden> · </span>
                <strong>{summary.destinations}</strong>{' '}
                {t('journeys.entry.destinations', { count: summary.destinations })}
            </p>
            {covered.length > 0 && (
                <ul className={styles.chips} aria-label={t('journeys.entry.topics')}>
                    {covered.slice(0, SHOWN_TOPICS).map(({ topicId, via }) => (
                        <li key={topicId} className={styles.chip}>
                            {via === 'registration' ? <HowToRegOutlined aria-hidden /> : <LinkOutlined aria-hidden />}
                            <span className={styles.srOnly}>{t(`journeys.entry.via.${via}`)}</span>
                            {nameOfTopic(topicId)}
                        </li>
                    ))}
                    {covered.length > SHOWN_TOPICS && (
                        <li className={styles.chip}>
                            {t('journeys.destinations.more', { count: covered.length - SHOWN_TOPICS })}
                        </li>
                    )}
                </ul>
            )}
            {unrouted.length > 0 && (
                <p className={styles.entryWarning}>
                    <WarningAmberOutlined aria-hidden />
                    {t('journeys.unrouted.title', { count: unrouted.length })}
                </p>
            )}
            <p className={styles.help}>{t(`journeys.entry.what.${phasesOf(type).length === 3 ? 'all' : 'groups'}`)}</p>
            <div className={styles.entryActions}>
                {onOpen && (
                    <M3Button variant="tonal" icon={<EditOutlined />} onClick={onOpen}>
                        {t('journeys.entry.open')}
                    </M3Button>
                )}
                {onEditAppearance && (
                    <M3Button variant="text" icon={<TuneOutlined />} onClick={onEditAppearance}>
                        {t('typeAppearance.open')}
                    </M3Button>
                )}
            </div>
        </div>
    );
};

export interface JourneysSettingsProps {
    /** Topics of the installation; they are what journeys lead to. */
    topics: JourneyTopic[];
    /**
     * Where the journeys live. Without one, a store in memory is made from `journeys` and `layers`
     * (stories, tests); the section saves exactly as Funktionszugriff does (`useJourneyWorkspace`).
     */
    store?: JourneyStore;
    /** The platform's journeys of every conversation type, for the memory store. Without any, the shipped ones are shown. */
    journeys?: Journey[];
    /** The layers of the viewer's Träger and Beratungsstelle, for the memory store (decision 29). */
    layers?: JourneyLayer[];
    /** Below the platform: the Träger or Beratungsstelle whose layer is edited. */
    ownerId?: string;
    /** Name and icon per conversation type, from the global configuration. */
    appearance?: AppearanceSettings;
    /** Only the platform admin renames conversation types and changes their icons. */
    canEditAppearance?: boolean;
    /** Machine translation through the Admin endpoint (`adminTranslator`); without it none is offered. */
    translator?: Translator;
    /** Suggests search terms (ORISO-Admin#1562); without it none are offered. */
    suggester?: KeywordSuggester;
    /** Which level edits. Below the platform the check-in is the platform's (decision 29). */
    level?: JourneyLevel;
    /** Building blocks Funktionszugriff switched off, e.g. the e-mail step (decision 31). */
    blocked?: readonly string[];
    /** Opens one dialog right away (stories). */
    initiallyOpen?: { type: ConversationType; appearance?: boolean } & Partial<JourneysDialogOpen>;
    /** Platform: the stored platform journeys after a save. */
    onSave?: (journeys: Journey[]) => void;
    /** Below the platform: the viewer's own stored layers after a save. */
    onSaveLayers?: (layers: JourneyLayer[]) => void;
    onSaveAppearance?: (appearance: AppearanceSettings) => void;
}

/** Below the platform, which Träger a level builds on: its own id, or the Träger of the layers given. */
const scopeOf = (level: JourneyLevel, ownerId: string, layers: JourneyLayer[]): JourneyScope => {
    if (level === 'platform') return { level };
    if (level === 'tenant') return { level, tenantId: ownerId };
    return { level, agencyId: ownerId, tenantId: layers.find((layer) => layer.level === 'tenant')?.ownerId ?? '-' };
};

/**
 * The Journeys section: one tile per conversation type with its journeys and destinations. A view
 * over `useJourneyWorkspace`, the one module that loads, layers and saves journeys.
 */
export const JourneysSettings = ({
    topics,
    store: given,
    journeys: initial,
    layers: initialLayers = NO_LAYERS,
    ownerId = '',
    appearance: initialAppearance = {},
    canEditAppearance = false,
    translator,
    suggester,
    level = 'platform',
    blocked = [],
    initiallyOpen,
    onSave,
    onSaveLayers,
    onSaveAppearance,
}: JourneysSettingsProps) => {
    const { t, i18n } = useTranslation();
    const [store] = useState(() => given ?? memoryJourneyStore(initial ?? [], initialLayers));
    const [scope] = useState(() => scopeOf(level, ownerId, initialLayers));
    const workspace = useJourneyWorkspace(store, scope, topics);
    const { journeys } = workspace;
    const [appearance, setAppearance] = useState<AppearanceSettings>(initialAppearance);
    const [open, setOpen] = useState<ConversationType | undefined>(
        initiallyOpen && !initiallyOpen.appearance ? initiallyOpen.type : undefined,
    );
    // The dialog edits what was there when it opened and saves against exactly those versions.
    const [base, setBase] = useState<JourneyBase>();
    const ready = workspace.status === 'ready';
    const openType = ready ? open : undefined;
    const openBase = openType ? base ?? workspace.base : undefined;
    const [editingAppearance, setEditingAppearance] = useState<ConversationType | undefined>(
        initiallyOpen?.appearance ? initiallyOpen.type : undefined,
    );
    const typeName = (type: ConversationType) =>
        nameOf(appearance, type, i18n.language, t(`conversationModules.type.${type}`));
    // The page names every deleted topic; with a dialog open, only those of its type.
    const pruned = openType
        ? workspace.prunedTopicsOf(openType)
        : CONVERSATION_TYPES.reduce((sum, type) => sum + workspace.prunedTopicsOf(type), 0);

    return (
        <div className={styles.page}>
            <p className={styles.intro}>{t('journeys.intro')}</p>
            {pruned > 0 && (
                <div className={styles.notice} role="status" data-testid="journeys-pruned-topics">
                    <p>{t('journeys.prunedTopics', { count: pruned })}</p>
                </div>
            )}
            <div className={styles.grid}>
                {CONVERSATION_TYPES.map((type) => (
                    <Card
                        key={type}
                        variant="dialog"
                        headerIcon={<TypeIcon type={type} appearance={appearance} />}
                        titleKey={`conversationModules.type.${type}`}
                        title={typeName(type)}
                        dataTestId={`journeys-tile-${type}`}
                    >
                        <JourneyTileEntry
                            type={type}
                            journeys={journeys}
                            topics={topics}
                            onOpen={
                                workspace.platformMissing
                                    ? undefined
                                    : () => {
                                          setBase(workspace.base);
                                          setOpen(type);
                                      }
                            }
                            onEditAppearance={canEditAppearance ? () => setEditingAppearance(type) : undefined}
                        />
                    </Card>
                ))}
            </div>
            {openType && openBase && (
                <JourneysDialog
                    key={openType}
                    type={openType}
                    typeName={typeName(openType)}
                    journeys={journeys}
                    topics={topics}
                    translator={translator}
                    suggester={suggester}
                    level={level}
                    blocked={blocked}
                    saving={workspace.saving}
                    saveBlocked={workspace.failure === 'conflict'}
                    initially={
                        initiallyOpen?.type === openType && initiallyOpen.journeyId
                            ? (initiallyOpen as JourneysDialogOpen)
                            : undefined
                    }
                    onSave={async (next) => {
                        const result = await workspace.save(next, openBase);
                        if (!result.ok) return;
                        if (result.journeys) onSave?.(result.journeys);
                        if (result.layers) onSaveLayers?.(result.layers);
                        setBase(undefined);
                        setOpen(undefined);
                    }}
                    onClose={() => {
                        workspace.dismissFailure();
                        setBase(undefined);
                        setOpen(undefined);
                    }}
                />
            )}
            {editingAppearance && (
                <ConversationTypeSettingsDialog
                    type={editingAppearance}
                    settings={appearance}
                    translator={translator}
                    onSave={(next) => {
                        setAppearance(next);
                        onSaveAppearance?.(next);
                        setEditingAppearance(undefined);
                    }}
                    onClose={() => setEditingAppearance(undefined)}
                />
            )}
        </div>
    );
};
