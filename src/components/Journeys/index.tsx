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
    coveredTopics,
    hasRegistrationRoute,
    journeysOf,
    phasesOf,
    shippedJourneys,
    topicsWithoutRoute,
    typeSummary,
    type Journey,
    type JourneyLevel,
    type JourneyTopic,
} from './journey';
import { FlightPath } from './FlightPath';
import { JourneysDialog, type JourneysDialogOpen } from './JourneysDialog';
import type { KeywordSuggester, Translator } from './journeyTranslation';
import styles from './styles.module.scss';

/** Topic chips on a tile before the rest is folded into "+ n". */
const SHOWN_TOPICS = 5;

interface JourneyTileEntryProps {
    type: ConversationType;
    journeys: Journey[];
    topics: JourneyTopic[];
    onOpen: () => void;
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
    const seen = new Set<number>();
    const covered = journeysOf(journeys, type)
        .flatMap(coveredTopics)
        .filter(({ topicId }) => {
            if (seen.has(topicId)) return false;
            seen.add(topicId);
            return true;
        });
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
                <M3Button variant="tonal" icon={<EditOutlined />} onClick={onOpen}>
                    {t('journeys.entry.open')}
                </M3Button>
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
    /** Stored journeys of every conversation type. Without any, the shipped ones are shown. */
    journeys?: Journey[];
    /** Name and icon per conversation type, from the global configuration. */
    appearance?: AppearanceSettings;
    /** Only the platform admin renames conversation types and changes their icons. */
    canEditAppearance?: boolean;
    /** Machine translation of one text. Without it no "translate with AI" is offered. */
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
    onSave?: (journeys: Journey[]) => void;
    onSaveAppearance?: (appearance: AppearanceSettings) => void;
}

/**
 * The Journeys section: one tile per conversation type with its journeys and destinations.
 * Prototype — local state only until the storage exists.
 */
export const JourneysSettings = ({
    topics,
    journeys: initial,
    appearance: initialAppearance = {},
    canEditAppearance = false,
    translator,
    suggester,
    level = 'platform',
    blocked = [],
    initiallyOpen,
    onSave,
    onSaveAppearance,
}: JourneysSettingsProps) => {
    const { t, i18n } = useTranslation();
    const [journeys, setJourneys] = useState<Journey[]>(() => initial ?? shippedJourneys(topics));
    const [appearance, setAppearance] = useState<AppearanceSettings>(initialAppearance);
    const [open, setOpen] = useState<ConversationType | undefined>(
        initiallyOpen && !initiallyOpen.appearance ? initiallyOpen.type : undefined,
    );
    const [editingAppearance, setEditingAppearance] = useState<ConversationType | undefined>(
        initiallyOpen?.appearance ? initiallyOpen.type : undefined,
    );
    const typeName = (type: ConversationType) =>
        nameOf(appearance, type, i18n.language, t(`conversationModules.type.${type}`));

    return (
        <div className={styles.page}>
            <p className={styles.intro}>{t('journeys.intro')}</p>
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
                            onOpen={() => setOpen(type)}
                            onEditAppearance={canEditAppearance ? () => setEditingAppearance(type) : undefined}
                        />
                    </Card>
                ))}
            </div>
            {open && (
                <JourneysDialog
                    key={open}
                    type={open}
                    typeName={typeName(open)}
                    journeys={journeys}
                    topics={topics}
                    translator={translator}
                    suggester={suggester}
                    level={level}
                    blocked={blocked}
                    initially={
                        initiallyOpen?.type === open && initiallyOpen.journeyId
                            ? (initiallyOpen as JourneysDialogOpen)
                            : undefined
                    }
                    onSave={(next) => {
                        setJourneys(next);
                        onSave?.(next);
                        setOpen(undefined);
                    }}
                    onClose={() => setOpen(undefined)}
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
