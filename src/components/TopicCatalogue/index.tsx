import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import classNames from 'classnames';
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type DragEvent,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { EditButton } from '../EditButton';
import { M3Button } from '../M3Button';
import { M3Switch } from '../M3Switch';
import { TileSections } from '../TileSections';
import { TopicIconSlot, type IconProblem } from './TopicIconSlot';
import {
    addGroup,
    addToGroup,
    groupsOfTopic,
    layoutsEqual,
    moveGroup,
    moveTopic,
    removeFromGroup,
    removeGroup,
    renameGroup,
    setGroupIcon,
    stepTopic,
    translateGroup,
    type StepDirection,
    type TopicGroup,
    type TopicLayout,
} from './topicLayout';
import {
    buildTranslateTexts,
    countMissing,
    groupNameKey,
    machineMark,
    mergeTranslations,
    textIn,
    topicNameKey,
    type CatalogueLanguage,
    type LocalizedTopic,
} from './topicTranslations';
import styles from './styles.module.scss';

export type { CatalogueLanguage } from './topicTranslations';

export interface CatalogueTopic extends LocalizedTopic {
    /** ACTIVE topics are offered in the registration; the rest are hidden there. */
    active: boolean;
    /** The topic's own icon (SVG or PNG, as data URL or address). Without it the standard icon is shown. */
    icon?: string | null;
}

/** Everything the platform admin changed in edit mode, saved in one go. */
export interface CatalogueChange {
    layout: TopicLayout;
    /** Only the topics whose translations or icon changed. */
    topics: CatalogueTopic[];
    /** topic id -> the new icon file; `null` means the icon was removed. */
    iconFiles: Record<number, File | null>;
    /** category id -> the new picture file; `null` means the picture was removed. */
    groupIconFiles: Record<string, File | null>;
}

export interface TranslateRequest {
    sourceLang: string;
    targetLangs: string[];
    /** key -> text in the source language. */
    texts: Record<string, string>;
}

export interface TopicCatalogueProps {
    topics: CatalogueTopic[];
    /** The saved categories and order. Topics it does not name are the caller's job (see `withUnplacedTopics`). */
    layout: TopicLayout;
    isLoading?: boolean;
    /** The list could not be loaded. Shown in place of the categories, with a way to try again. */
    loadError?: boolean;
    onRetry?: () => void;
    /**
     * Saves categories, order, translations and icons in one go. Without it there is no edit mode: the
     * server has nothing to keep them in yet, so the catalogue is shown as it is.
     */
    onSaveLayout?: (change: CatalogueChange) => Promise<void>;
    /** Switches a topic visible or hidden at once. Without it the switches stay locked. */
    onToggleActive?: (topicId: number, active: boolean) => void | Promise<void>;
    /** Ids of topics whose switch is saving right now. */
    pendingTopicIds?: number[];
    onOpenTopic?: (topicId: number) => void;
    onAddTopic?: () => void;
    /** Why the viewer may not change anything; locks switches and hides the edit button. */
    readOnlyReason?: string;
    /** The languages of the platform. With more than one, a language bar appears. */
    languages?: CatalogueLanguage[];
    /** Language of `name` / `description`; the other languages live in `names` / `descriptions`. */
    sourceLanguage?: string;
    /** Machine translation (opt-in). Resolves to lang -> (key -> text). Without it there is no AI button. */
    onTranslate?: (request: TranslateRequest) => Promise<Record<string, Record<string, string>>>;
}

interface DragState {
    topicId: number;
    /** Category the row comes from; `null` when it comes from the topic list (a copy). */
    fromGroupId: string | null;
}

interface DropTarget {
    groupId: string;
    /** Slot among the rows as they are now, before the dragged topic is taken out. */
    slot: number;
}

interface Note {
    kind: 'info' | 'error';
    text: string;
}

const newGroupId = () => `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const placementKey = (groupId: string, topicId: number) => `${groupId}:${topicId}`;
const isBlank = (text?: string) => !text || text.trim() === '';

const topicSignature = (topic: CatalogueTopic) =>
    JSON.stringify([topic.names ?? {}, topic.descriptions ?? {}, topic.icon ?? null]);

export const TopicCatalogue = ({
    topics,
    layout,
    isLoading,
    loadError,
    onRetry,
    onSaveLayout,
    onToggleActive,
    pendingTopicIds = [],
    onOpenTopic,
    onAddTopic,
    readOnlyReason,
    languages = [],
    sourceLanguage = 'de',
    onTranslate,
}: TopicCatalogueProps) => {
    const { t } = useTranslation();
    const hintId = useId();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<TopicLayout>(layout);
    const [draftTopics, setDraftTopics] = useState<CatalogueTopic[]>(topics);
    const [iconFiles, setIconFiles] = useState<Record<number, File | null>>({});
    const [groupIconFiles, setGroupIconFiles] = useState<Record<string, File | null>>({});
    const [machine, setMachine] = useState<string[]>([]);
    const [lang, setLang] = useState(sourceLanguage);
    const [collapsed, setCollapsed] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [note, setNote] = useState<Note | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const [drag, setDrag] = useState<DragState | null>(null);
    const [drop, setDrop] = useState<DropTarget | null>(null);
    const [focusKey, setFocusKey] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    const shownLayout = editing ? draft : layout;
    const shownTopics = editing ? draftTopics : topics;
    const topicsById = new Map(shownTopics.map((topic) => [topic.id, topic]));
    const canEdit = !!onSaveLayout && !readOnlyReason && topics.length > 0;
    const multiLanguage = languages.length > 1;
    const editingOtherLanguage = editing && lang !== sourceLanguage;
    const changedTopics = editing
        ? draftTopics.filter((topic, i) => topicSignature(topic) !== topicSignature(topics[i] ?? topic))
        : [];
    const dirty = editing && (!layoutsEqual(draft, layout) || changedTopics.length > 0);
    const hasEmptyName = draft.some((group) => group.name.trim() === '');

    // Keyboard moves re-render the row, possibly inside another category: give the handle its focus back.
    useEffect(() => {
        if (focusKey == null) return;
        rootRef.current?.querySelector<HTMLElement>(`[data-handle-for="${focusKey}"]`)?.focus();
        setFocusKey(null);
    }, [focusKey, draft]);

    // ---- texts in the chosen language ----

    const topicText = (topic: CatalogueTopic) => textIn(topic.name, topic.names, lang, sourceLanguage);
    const groupText = (group: TopicGroup) => textIn(group.name, group.names, lang, sourceLanguage);
    const isMachine = (key: string) => machine.includes(machineMark(lang, key));

    const nameOf = (topicId: number) => {
        const topic = topicsById.get(topicId);
        return topic ? topicText(topic) || topic.name : '';
    };
    const groupLabel = (group: TopicGroup) => groupText(group) || group.name || t('topicCatalogue.unnamedGroup');

    /** The text of a name, marked when it is missing in this language (shows the source text instead) or machine made. */
    const renderLabel = (text: string, fallback: string, key: string, className: string): ReactNode => {
        const missing = lang !== sourceLanguage && isBlank(text);
        const machineMade = !missing && lang !== sourceLanguage && isMachine(key);
        return (
            <span
                className={classNames(className, { [styles.missingText]: missing, [styles.machineText]: machineMade })}
            >
                {missing ? fallback : text}
                {missing && (
                    <span
                        className={styles.marker}
                        role="img"
                        aria-label={t('topicCatalogue.missingTranslation')}
                        title={t('topicCatalogue.missingTranslation')}
                    >
                        <WarningAmberOutlinedIcon aria-hidden />
                    </span>
                )}
                {machineMade && (
                    <span
                        className={styles.marker}
                        role="img"
                        aria-label={t('topicCatalogue.machineTranslated')}
                        title={t('topicCatalogue.machineTranslated')}
                    >
                        <AutoAwesomeOutlinedIcon aria-hidden />
                    </span>
                )}
            </span>
        );
    };

    // ---- edit mode ----

    const startEditing = () => {
        setDraft(layout);
        setDraftTopics(topics);
        setIconFiles({});
        setGroupIconFiles({});
        setMachine([]);
        setSaveFailed(false);
        setNote(null);
        setAnnouncement(t('topicCatalogue.announce.editStarted'));
        setEditing(true);
    };

    const stopEditing = () => {
        setEditing(false);
        setDrag(null);
        setDrop(null);
        setSaveFailed(false);
        setNote(null);
        setLang(sourceLanguage);
    };

    const cancel = () => {
        stopEditing();
        setAnnouncement(t('topicCatalogue.announce.cancelled'));
    };

    const save = async () => {
        if (!onSaveLayout || saving) return;
        setSaving(true);
        setSaveFailed(false);
        setNote(null);
        try {
            await onSaveLayout({ layout: draft, topics: changedTopics, iconFiles, groupIconFiles });
            stopEditing();
            setAnnouncement(t('topicCatalogue.announce.saved'));
        } catch {
            setSaveFailed(true);
        } finally {
            setSaving(false);
        }
    };

    const announceAt = (topicId: number, groupId: string, index: number, next: TopicLayout) => {
        const group = next.find((entry) => entry.id === groupId);
        setAnnouncement(
            t('topicCatalogue.announce.moved', {
                name: nameOf(topicId),
                position: index + 1,
                total: group?.topicIds.length ?? 0,
                group: group ? groupLabel(group) : '',
            }),
        );
    };

    const step = (topicId: number, groupId: string, direction: StepDirection) => {
        const result = stepTopic(draft, topicId, groupId, direction);
        if (!result.changed) {
            setAnnouncement(t('topicCatalogue.announce.edge', { name: nameOf(topicId) }));
            return;
        }
        setDraft(result.layout);
        setFocusKey(placementKey(result.groupId, topicId));
        announceAt(topicId, result.groupId, result.index, result.layout);
    };

    const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, topicId: number, groupId: string) => {
        const directions: Record<string, StepDirection> = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'previousGroup',
            ArrowRight: 'nextGroup',
        };
        const direction = directions[event.key];
        if (!direction) return;
        event.preventDefault();
        step(topicId, groupId, direction);
    };

    /** Copies a topic into a category (the same topic can sit in several). */
    const addToCategory = (topicId: number, groupId: string, index?: number) => {
        const group = draft.find((entry) => entry.id === groupId);
        if (!group) return;
        const next = addToGroup(draft, topicId, groupId, index);
        if (next === draft) {
            setAnnouncement(
                t('topicCatalogue.announce.alreadyIn', { name: nameOf(topicId), group: groupLabel(group) }),
            );
            return;
        }
        setDraft(next);
        setCollapsed((list) => list.filter((id) => id !== groupId));
        const placed = next.find((entry) => entry.id === groupId);
        setAnnouncement(
            t('topicCatalogue.announce.added', {
                name: nameOf(topicId),
                group: groupLabel(group),
                position: (placed?.topicIds.indexOf(topicId) ?? 0) + 1,
                total: placed?.topicIds.length ?? 0,
            }),
        );
    };

    const removeFromCategory = (topicId: number, group: TopicGroup) => {
        setDraft(removeFromGroup(draft, topicId, group.id));
        setAnnouncement(t('topicCatalogue.announce.removed', { name: nameOf(topicId), group: groupLabel(group) }));
    };

    // ---- translations and icons ----

    const setTopicName = (topicId: number, text: string) => {
        setDraftTopics((list) =>
            list.map((topic) => (topic.id === topicId ? { ...topic, names: { ...topic.names, [lang]: text } } : topic)),
        );
        setMachine((list) => list.filter((entry) => entry !== machineMark(lang, topicNameKey(topicId))));
    };

    const setGroupName = (group: TopicGroup, text: string) => {
        setDraft(
            lang === sourceLanguage ? renameGroup(draft, group.id, text) : translateGroup(draft, group.id, lang, text),
        );
        setMachine((list) => list.filter((entry) => entry !== machineMark(lang, groupNameKey(group.id))));
    };

    const translateMissing = async () => {
        if (!onTranslate || translating) return;
        const targetLangs = languages.map((entry) => entry.code).filter((code) => code !== sourceLanguage);
        const texts = buildTranslateTexts(draftTopics, draft, targetLangs, sourceLanguage);
        if (Object.keys(texts).length === 0) {
            setNote({ kind: 'info', text: t('topicCatalogue.translateNothing') });
            return;
        }
        setTranslating(true);
        setNote(null);
        try {
            const translations = await onTranslate({ sourceLang: sourceLanguage, targetLangs, texts });
            const merged = mergeTranslations(draftTopics, draft, translations, sourceLanguage);
            setDraftTopics(merged.topics);
            setDraft(merged.layout);
            setMachine((list) => [...list, ...merged.machine]);
            setNote({ kind: 'info', text: t('topicCatalogue.translateDone', { count: merged.machine.length }) });
            setAnnouncement(t('topicCatalogue.translateDone', { count: merged.machine.length }));
        } catch (error) {
            const code = (error as { errorCode?: string } | undefined)?.errorCode;
            setNote({
                kind: 'error',
                text: t(
                    code === 'TRANSLATION_NOT_CONFIGURED'
                        ? 'topicCatalogue.translateNotConfigured'
                        : 'topicCatalogue.translateError',
                ),
            });
        } finally {
            setTranslating(false);
        }
    };

    const pickIcon = (topicId: number, file: File, dataUrl: string) => {
        setDraftTopics((list) => list.map((topic) => (topic.id === topicId ? { ...topic, icon: dataUrl } : topic)));
        setIconFiles((files) => ({ ...files, [topicId]: file }));
        setNote(null);
    };

    const removeIcon = (topicId: number) => {
        setDraftTopics((list) => list.map((topic) => (topic.id === topicId ? { ...topic, icon: null } : topic)));
        setIconFiles((files) => ({ ...files, [topicId]: null }));
    };

    const pickGroupIcon = (groupId: string, file: File, dataUrl: string) => {
        setDraft((current) => setGroupIcon(current, groupId, dataUrl));
        setGroupIconFiles((files) => ({ ...files, [groupId]: file }));
        setNote(null);
    };

    const removeGroupIcon = (groupId: string) => {
        setDraft((current) => setGroupIcon(current, groupId, null));
        setGroupIconFiles((files) => ({ ...files, [groupId]: null }));
    };

    const iconProblem = (problem: IconProblem, name: string) =>
        setNote({ kind: 'error', text: t(`topicCatalogue.iconProblem.${problem}`, { name }) });

    // ---- drag and drop (mouse and pen; touch and keyboard use the buttons and the selects) ----

    const startDrag = (event: DragEvent<HTMLElement>, topicId: number, fromGroupId: string | null) => {
        const { dataTransfer } = event;
        if (dataTransfer) {
            dataTransfer.effectAllowed = fromGroupId ? 'move' : 'copy';
            dataTransfer.setData('text/plain', String(topicId));
        }
        setDrag({ topicId, fromGroupId });
    };

    const endDrag = () => {
        setDrag(null);
        setDrop(null);
    };

    const onDragOverRow = (event: DragEvent<HTMLLIElement>, groupId: string, rowIndex: number) => {
        if (!drag) return;
        event.preventDefault();
        event.stopPropagation();
        const box = event.currentTarget.getBoundingClientRect();
        const slot = rowIndex + (event.clientY > box.top + box.height / 2 ? 1 : 0);
        if (drop?.groupId !== groupId || drop.slot !== slot) setDrop({ groupId, slot });
    };

    const onDragOverGroup = (event: DragEvent<HTMLElement>, group: TopicGroup) => {
        if (!drag) return;
        event.preventDefault();
        if (drop?.groupId !== group.id || drop.slot !== group.topicIds.length) {
            setDrop({ groupId: group.id, slot: group.topicIds.length });
        }
    };

    const commitDrop = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        if (drag && drop) {
            if (drag.fromGroupId == null) {
                addToCategory(drag.topicId, drop.groupId, drop.slot);
            } else {
                const from = draft.find((group) => group.id === drag.fromGroupId);
                const oldIndex = from ? from.topicIds.indexOf(drag.topicId) : -1;
                // The slot counts the dragged row too; moveTopic counts without it.
                const before = drag.fromGroupId === drop.groupId && oldIndex !== -1 && oldIndex < drop.slot;
                const next = moveTopic(
                    draft,
                    drag.topicId,
                    drag.fromGroupId,
                    drop.groupId,
                    drop.slot - (before ? 1 : 0),
                );
                if (next !== draft) {
                    setDraft(next);
                    const target = next.find((group) => group.id === drop.groupId);
                    if (target) announceAt(drag.topicId, target.id, target.topicIds.indexOf(drag.topicId), next);
                } else if (drag.fromGroupId !== drop.groupId) {
                    const group = draft.find((entry) => entry.id === drop.groupId);
                    setAnnouncement(
                        t('topicCatalogue.announce.alreadyIn', {
                            name: nameOf(drag.topicId),
                            group: group ? groupLabel(group) : '',
                        }),
                    );
                }
            }
        }
        endDrag();
    };

    // ---- rows ----

    const hiddenChip = (topic: CatalogueTopic) =>
        !topic.active && <span className={styles.chip}>{t('topicCatalogue.hidden')}</span>;

    const renderDescription = (topic: CatalogueTopic) => {
        const text = textIn(topic.description ?? '', topic.descriptions, lang, sourceLanguage);
        const shown = isBlank(text) ? topic.description : text;
        return shown ? <span className={styles.description}>{shown}</span> : null;
    };

    const renderPlacement = (group: TopicGroup, topicId: number, rowIndex: number) => {
        const topic = topicsById.get(topicId);
        if (!topic) return null;
        const label = topicText(topic) || topic.name;
        const pending = pendingTopicIds.includes(topicId);
        const nameId = `topic-name-${group.id}-${topicId}`;
        const switchLocked = editing || !onToggleActive || !!readOnlyReason || pending;
        const nameNode = renderLabel(topicText(topic), topic.name, topicNameKey(topicId), styles.name);

        return (
            <li
                key={topicId}
                className={classNames(styles.row, {
                    [styles.rowDragging]: drag?.topicId === topicId && drag.fromGroupId === group.id,
                    [styles.rowInactive]: !topic.active,
                })}
                draggable={editing && !saving}
                onDragStart={(event) => startDrag(event, topicId, group.id)}
                onDragEnd={endDrag}
                onDragOver={(event) => onDragOverRow(event, group.id, rowIndex)}
                onDrop={commitDrop}
                data-topic-id={topicId}
            >
                {drop?.groupId === group.id && drop.slot === rowIndex && (
                    <span className={styles.dropLine} aria-hidden />
                )}
                {editing && (
                    <button
                        type="button"
                        className={styles.handle}
                        data-handle-for={placementKey(group.id, topicId)}
                        aria-label={t('topicCatalogue.handle', { name: label })}
                        aria-describedby={hintId}
                        aria-roledescription={t('topicCatalogue.handleRole')}
                        disabled={saving}
                        onKeyDown={(event) => onHandleKeyDown(event, topicId, group.id)}
                    >
                        <DragIndicatorIcon aria-hidden />
                    </button>
                )}
                <TopicIconSlot icon={topic.icon} topicName={label} />
                <div className={styles.text}>
                    {!editing && onOpenTopic ? (
                        <button
                            type="button"
                            id={nameId}
                            className={styles.nameButton}
                            onClick={() => onOpenTopic(topicId)}
                        >
                            {nameNode}
                        </button>
                    ) : (
                        <span id={nameId}>{nameNode}</span>
                    )}
                    {renderDescription(topic)}
                </div>
                {hiddenChip(topic)}
                {editing ? (
                    <>
                        <span className={styles.touchMoves}>
                            <button
                                type="button"
                                className={styles.iconButton}
                                aria-label={t('topicCatalogue.moveUp', { name: label })}
                                disabled={saving || rowIndex === 0}
                                onClick={() => step(topicId, group.id, 'up')}
                            >
                                <ArrowUpwardIcon aria-hidden />
                            </button>
                            <button
                                type="button"
                                className={styles.iconButton}
                                aria-label={t('topicCatalogue.moveDown', { name: label })}
                                disabled={saving || rowIndex === group.topicIds.length - 1}
                                onClick={() => step(topicId, group.id, 'down')}
                            >
                                <ArrowDownwardIcon aria-hidden />
                            </button>
                        </span>
                        <button
                            type="button"
                            className={styles.iconButton}
                            aria-label={t('topicCatalogue.removeFromGroup', { name: label, group: groupLabel(group) })}
                            disabled={saving}
                            onClick={() => removeFromCategory(topicId, group)}
                        >
                            <CloseIcon aria-hidden />
                        </button>
                    </>
                ) : (
                    <M3Switch
                        checked={topic.active}
                        disabled={switchLocked}
                        label={t('topicCatalogue.visible', { name: label })}
                        onChange={(value) => onToggleActive?.(topicId, value)}
                    />
                )}
            </li>
        );
    };

    const renderPoolRow = (topic: CatalogueTopic) => {
        const label = topicText(topic) || topic.name;
        const inGroups = groupsOfTopic(draft, topic.id);
        const countLabel =
            inGroups.length === 0
                ? t('topicCatalogue.inNoGroup')
                : t('topicCatalogue.inGroups', { count: inGroups.length });
        const description = renderDescription(topic);

        return (
            <li
                key={topic.id}
                className={classNames(styles.row, styles.poolRow, {
                    [styles.rowDragging]: drag?.topicId === topic.id && drag.fromGroupId == null,
                    [styles.rowInactive]: !topic.active,
                })}
                draggable={!saving}
                onDragStart={(event) => startDrag(event, topic.id, null)}
                onDragEnd={endDrag}
                data-pool-topic-id={topic.id}
            >
                <TopicIconSlot
                    editable
                    icon={topic.icon}
                    topicName={label}
                    disabled={saving}
                    onPick={(file, dataUrl) => pickIcon(topic.id, file, dataUrl)}
                    onRemove={() => removeIcon(topic.id)}
                    onProblem={iconProblem}
                />
                <div className={styles.text}>
                    {editingOtherLanguage ? (
                        <input
                            className={classNames(styles.nameInput, {
                                [styles.missingInput]: isBlank(topicText(topic)),
                            })}
                            value={topicText(topic)}
                            maxLength={120}
                            aria-label={t('topicCatalogue.topicNameIn', {
                                name: topic.name,
                                language: languages.find((entry) => entry.code === lang)?.label ?? lang,
                            })}
                            placeholder={topic.name}
                            disabled={saving}
                            onChange={(event) => setTopicName(topic.id, event.target.value)}
                        />
                    ) : (
                        renderLabel(topicText(topic), topic.name, topicNameKey(topic.id), styles.name)
                    )}
                    {description}
                    <span className={styles.usage}>{countLabel}</span>
                </div>
                {hiddenChip(topic)}
                <span className={styles.selectWrap}>
                    <select
                        className={styles.groupSelect}
                        aria-label={t('topicCatalogue.addToCategory', { name: label })}
                        value=""
                        disabled={saving || draft.length === 0}
                        onChange={(event) => addToCategory(topic.id, event.target.value)}
                    >
                        <option value="">{t('topicCatalogue.addToCategoryPlaceholder')}</option>
                        {draft.map((group) => (
                            <option key={group.id} value={group.id} disabled={group.topicIds.includes(topic.id)}>
                                {groupLabel(group)}
                                {group.topicIds.includes(topic.id) ? ` ✓` : ''}
                            </option>
                        ))}
                    </select>
                </span>
            </li>
        );
    };

    // ---- categories ----

    const toggleCollapsed = (groupId: string) =>
        setCollapsed((list) => (list.includes(groupId) ? list.filter((id) => id !== groupId) : [...list, groupId]));

    const renderGroup = (group: TopicGroup, groupIndex: number) => {
        const headingId = `topic-group-${group.id}`;
        const listId = `topic-list-${group.id}`;
        const count = group.topicIds.length;
        const isCollapsed = collapsed.includes(group.id);
        const dropAtEnd = drop?.groupId === group.id && drop.slot >= count;
        const text = groupText(group);
        const groupMissing = lang !== sourceLanguage && isBlank(text);
        const toggleLabel = t(isCollapsed ? 'topicCatalogue.expand' : 'topicCatalogue.collapse', {
            name: groupLabel(group),
        });

        return (
            <section
                key={group.id}
                className={classNames(styles.group, { [styles.groupDropActive]: !!drag && drop?.groupId === group.id })}
                aria-labelledby={headingId}
                data-group-id={group.id}
                onDragOver={(event) => onDragOverGroup(event, group)}
                onDrop={commitDrop}
            >
                <div className={styles.groupHeader}>
                    <button
                        type="button"
                        className={styles.iconButton}
                        aria-expanded={!isCollapsed}
                        aria-controls={listId}
                        aria-label={toggleLabel}
                        title={toggleLabel}
                        onClick={() => toggleCollapsed(group.id)}
                    >
                        {isCollapsed ? <ExpandMoreIcon aria-hidden /> : <ExpandLessIcon aria-hidden />}
                    </button>
                    <TopicIconSlot
                        editable={editing}
                        icon={group.icon}
                        topicName={groupLabel(group)}
                        placeholder={null}
                        disabled={saving}
                        onPick={(file, dataUrl) => pickGroupIcon(group.id, file, dataUrl)}
                        onRemove={() => removeGroupIcon(group.id)}
                        onProblem={iconProblem}
                    />
                    {editing ? (
                        <input
                            id={headingId}
                            className={classNames(styles.groupInput, { [styles.missingInput]: groupMissing })}
                            value={text}
                            maxLength={60}
                            aria-label={t('topicCatalogue.groupName')}
                            placeholder={
                                lang === sourceLanguage ? t('topicCatalogue.groupNamePlaceholder') : group.name
                            }
                            aria-invalid={group.name.trim() === ''}
                            disabled={saving}
                            onChange={(event) => setGroupName(group, event.target.value)}
                        />
                    ) : (
                        <h3 id={headingId} className={styles.groupTitle}>
                            {renderLabel(text, group.name, groupNameKey(group.id), styles.groupTitleText)}
                        </h3>
                    )}
                    {editing && (
                        <span className={styles.groupTools}>
                            <button
                                type="button"
                                className={styles.iconButton}
                                aria-label={t('topicCatalogue.groupEarlier', { name: groupLabel(group) })}
                                disabled={saving || groupIndex === 0}
                                onClick={() => setDraft(moveGroup(draft, group.id, -1))}
                            >
                                <ChevronLeftIcon aria-hidden />
                            </button>
                            <button
                                type="button"
                                className={styles.iconButton}
                                aria-label={t('topicCatalogue.groupLater', { name: groupLabel(group) })}
                                disabled={saving || groupIndex === draft.length - 1}
                                onClick={() => setDraft(moveGroup(draft, group.id, 1))}
                            >
                                <ChevronRightIcon aria-hidden />
                            </button>
                            <button
                                type="button"
                                className={styles.iconButton}
                                aria-label={t('topicCatalogue.groupRemove', { name: groupLabel(group) })}
                                disabled={saving}
                                onClick={() => {
                                    setDraft(removeGroup(draft, group.id));
                                    setAnnouncement(
                                        t('topicCatalogue.announce.groupRemoved', { group: groupLabel(group) }),
                                    );
                                }}
                            >
                                <DeleteOutlinedIcon aria-hidden />
                            </button>
                        </span>
                    )}
                </div>
                <p className={styles.groupCount}>{t('topicCatalogue.count', { count })}</p>
                {!isCollapsed && (
                    <ul
                        id={listId}
                        className={classNames(styles.list, { [styles.listEditing]: editing })}
                        aria-labelledby={headingId}
                    >
                        {group.topicIds.map((topicId, rowIndex) => renderPlacement(group, topicId, rowIndex))}
                        {editing && count === 0 && (
                            <li className={styles.emptyGroup}>
                                {drop?.groupId === group.id && <span className={styles.dropLine} aria-hidden />}
                                {t('topicCatalogue.emptyGroup')}
                            </li>
                        )}
                        {dropAtEnd && count > 0 && <li className={styles.dropEnd} aria-hidden />}
                    </ul>
                )}
            </section>
        );
    };

    const addNewGroup = useCallback(() => {
        const next = addGroup(draft, newGroupId(), t('topicCatalogue.newGroupName'));
        setDraft(next);
        setAnnouncement(t('topicCatalogue.announce.groupAdded', { group: t('topicCatalogue.newGroupName') }));
    }, [draft, t]);

    const renderLanguageBar = () => (
        <div className={styles.languageBar} role="group" aria-label={t('topicCatalogue.languages')}>
            {languages.map((entry) => {
                const missing = countMissing(shownTopics, shownLayout, entry.code, sourceLanguage);
                return (
                    <button
                        key={entry.code}
                        type="button"
                        className={classNames(styles.langChip, { [styles.langChipActive]: entry.code === lang })}
                        aria-pressed={entry.code === lang}
                        data-lang={entry.code}
                        onClick={() => setLang(entry.code)}
                    >
                        {entry.label}
                        {missing > 0 && (
                            <span
                                className={styles.langMissing}
                                title={t('topicCatalogue.missingCount', { count: missing })}
                            >
                                <WarningAmberOutlinedIcon aria-hidden />
                                {missing}
                                <span className={styles.srOnly}>
                                    {' '}
                                    {t('topicCatalogue.missingCount', { count: missing })}
                                </span>
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );

    let body: ReactNode;
    if (loadError) {
        body = (
            <div className={styles.state} role="alert">
                <p>{t('topicCatalogue.loadError')}</p>
                {onRetry && (
                    <M3Button variant="tonal" onClick={onRetry}>
                        {t('topicCatalogue.retry')}
                    </M3Button>
                )}
            </div>
        );
    } else if (topics.length === 0) {
        body = (
            <div className={styles.state}>
                <p>{t('topicCatalogue.empty')}</p>
                {onAddTopic && !readOnlyReason && (
                    <M3Button variant="tonal" icon={<AddOutlinedIcon />} onClick={onAddTopic}>
                        {t('topicCatalogue.add')}
                    </M3Button>
                )}
            </div>
        );
    } else if (editing) {
        body = (
            <div className={styles.editLayout}>
                <div className={styles.column}>
                    <h3 className={styles.columnTitle}>{t('topicCatalogue.categoriesTitle')}</h3>
                    <div className={styles.categories}>
                        {draft.map((group, groupIndex) => renderGroup(group, groupIndex))}
                        <button type="button" className={styles.addGroup} disabled={saving} onClick={addNewGroup}>
                            <AddOutlinedIcon aria-hidden />
                            {t('topicCatalogue.addGroup')}
                        </button>
                    </div>
                </div>
                <div className={styles.column}>
                    <h3 className={styles.columnTitle}>
                        {t('topicCatalogue.topicsTitle', { count: draftTopics.length })}
                    </h3>
                    <p className={styles.columnHint}>{t('topicCatalogue.topicsHint')}</p>
                    <ul className={classNames(styles.list, styles.pool)} aria-label={t('topicCatalogue.topicsList')}>
                        {draftTopics.map((topic) => renderPoolRow(topic))}
                    </ul>
                </div>
            </div>
        );
    } else {
        body = (
            <TileSections className={styles.groups}>
                {layout.map((group, groupIndex) => renderGroup(group, groupIndex))}
            </TileSections>
        );
    }

    let message: Note | null = note;
    if (saveFailed) message = { kind: 'error', text: t('topicCatalogue.saveError') };
    else if (saving) message = { kind: 'info', text: t('topicCatalogue.saving') };

    let footer: ReactNode;
    if (editing) {
        footer = (
            <div className={styles.footer}>
                <p className={styles.saveState} role={message?.kind === 'error' ? 'alert' : undefined}>
                    {message?.text}
                </p>
                {onTranslate && multiLanguage && (
                    <M3Button
                        variant="tonal"
                        icon={<AutoAwesomeOutlinedIcon />}
                        loading={translating}
                        disabled={saving}
                        onClick={translateMissing}
                    >
                        {t('topicCatalogue.translate')}
                    </M3Button>
                )}
                <M3Button variant="text" disabled={saving} onClick={cancel}>
                    {t('topicCatalogue.cancel')}
                </M3Button>
                <M3Button variant="filled" loading={saving} disabled={!dirty || hasEmptyName} onClick={save}>
                    {t('topicCatalogue.save')}
                </M3Button>
            </div>
        );
    } else if (!loadError && topics.length > 0) {
        footer = (
            <div className={styles.footer}>
                {readOnlyReason && <p className={styles.saveState}>{readOnlyReason}</p>}
                {onAddTopic && !readOnlyReason && (
                    <M3Button variant="text" icon={<AddOutlinedIcon />} onClick={onAddTopic}>
                        {t('topicCatalogue.add')}
                    </M3Button>
                )}
                {canEdit && <EditButton labelKey="topicCatalogue.edit" onClick={startEditing} />}
            </div>
        );
    }

    return (
        <div ref={rootRef}>
            <Card
                variant="dialog"
                autoHeight
                headerIcon={<CategoryOutlinedIcon />}
                titleKey="topicCatalogue.title"
                subTitleKey="topicCatalogue.subtitle"
                isLoading={isLoading}
                footer={footer}
                dataTestId="topic-catalogue"
            >
                <div className={styles.body}>
                    {multiLanguage && !loadError && topics.length > 0 && renderLanguageBar()}
                    {body}
                </div>
            </Card>
            <p id={hintId} className={styles.srOnly}>
                {t('topicCatalogue.handleHint')}
            </p>
            <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
                {announcement}
            </div>
        </div>
    );
};
