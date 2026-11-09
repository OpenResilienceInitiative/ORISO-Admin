import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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
import { IconButton } from '../IconButton';
import { M3Button } from '../M3Button';
import { M3Switch } from '../M3Switch';
import { TileSections } from '../TileSections';
import {
    addGroup,
    findTopic,
    layoutsEqual,
    moveGroup,
    moveTopic,
    removeGroup,
    renameGroup,
    stepTopic,
    type StepDirection,
    type TopicLayout,
} from './topicLayout';
import styles from './styles.module.scss';

export interface CatalogueTopic {
    id: number;
    name: string;
    description?: string;
    /** ACTIVE topics are offered in the registration; the rest are hidden there. */
    active: boolean;
}

export interface TopicCatalogueProps {
    topics: CatalogueTopic[];
    /** The saved grouping and order. Topics it does not name are the caller's job (see `withUnplacedTopics`). */
    layout: TopicLayout;
    isLoading?: boolean;
    /** The list could not be loaded. Shown in place of the groups, with a way to try again. */
    loadError?: boolean;
    onRetry?: () => void;
    /**
     * Saves the whole grouping and order in one go. Without it there is no edit mode: the server
     * has nothing to keep the layout in yet, so the catalogue is shown as it is.
     */
    onSaveLayout?: (layout: TopicLayout) => Promise<void>;
    /** Switches a topic visible or hidden at once. Without it the switches stay locked. */
    onToggleActive?: (topicId: number, active: boolean) => void | Promise<void>;
    /** Ids of topics whose switch is saving right now. */
    pendingTopicIds?: number[];
    onOpenTopic?: (topicId: number) => void;
    onAddTopic?: () => void;
    /** Why the viewer may not change anything; locks switches and hides the edit button. */
    readOnlyReason?: string;
}

interface DropTarget {
    groupId: string;
    /** Slot among the rows as they are now, before the dragged topic is taken out. */
    slot: number;
}

const newGroupId = () => `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

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
}: TopicCatalogueProps) => {
    const { t } = useTranslation();
    const hintId = useId();
    const [editing, setEditing] = useState(false);
    const [draft, setDraftState] = useState<TopicLayout>(layout);
    const [saving, setSaving] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    // Every edit of the draft clears an old save error: it no longer describes what is on screen.
    const setDraft = (next: TopicLayout) => {
        setSaveFailed(false);
        setDraftState(next);
    };
    const [announcement, setAnnouncement] = useState('');
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [drop, setDrop] = useState<DropTarget | null>(null);
    const [focusTopicId, setFocusTopicId] = useState<number | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const addGroupRef = useRef<HTMLButtonElement>(null);

    const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
    const shown = editing ? draft : layout;
    const canEdit = !!onSaveLayout && !readOnlyReason && topics.length > 0;
    const dirty = editing && !layoutsEqual(draft, layout);
    const hasEmptyName = draft.some((group) => group.name.trim() === '');

    // Keyboard moves re-render the row, possibly inside another group: give the handle its focus back.
    useEffect(() => {
        if (focusTopicId == null) return;
        rootRef.current?.querySelector<HTMLElement>(`[data-handle-for="${focusTopicId}"]`)?.focus();
        setFocusTopicId(null);
    }, [focusTopicId, draft]);

    const startEditing = () => {
        setDraft(layout);
        setSaveFailed(false);
        setAnnouncement(t('topicCatalogue.announce.editStarted'));
        setEditing(true);
    };

    const stopEditing = () => {
        setEditing(false);
        setDraggingId(null);
        setDrop(null);
        setSaveFailed(false);
    };

    const cancel = () => {
        stopEditing();
        setAnnouncement(t('topicCatalogue.announce.cancelled'));
    };

    const save = async () => {
        if (!onSaveLayout || saving) return;
        setSaving(true);
        setSaveFailed(false);
        try {
            // Trim once at the save boundary: typing spaces stays possible, stored names stay clean.
            await onSaveLayout(draft.map((group) => ({ ...group, name: group.name.trim() })));
            stopEditing();
            setAnnouncement(t('topicCatalogue.announce.saved'));
        } catch {
            setSaveFailed(true);
        } finally {
            setSaving(false);
        }
    };

    const nameOf = (topicId: number) => topicsById.get(topicId)?.name ?? '';

    const announcePosition = (topicId: number, groupId: string, index: number, next: TopicLayout) => {
        const group = next.find((entry) => entry.id === groupId);
        setAnnouncement(
            t('topicCatalogue.announce.moved', {
                name: nameOf(topicId),
                position: index + 1,
                total: group?.topicIds.length ?? 0,
                group: group?.name ?? '',
            }),
        );
    };

    const step = (topicId: number, direction: StepDirection) => {
        const result = stepTopic(draft, topicId, direction);
        if (!result.changed) {
            setAnnouncement(t('topicCatalogue.announce.edge', { name: nameOf(topicId) }));
            return;
        }
        setDraft(result.layout);
        setFocusTopicId(topicId);
        announcePosition(topicId, result.groupId, result.index, result.layout);
    };

    const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, topicId: number) => {
        const directions: Record<string, StepDirection> = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'previousGroup',
            ArrowRight: 'nextGroup',
        };
        const direction = directions[event.key];
        if (!direction) return;
        event.preventDefault();
        step(topicId, direction);
    };

    const moveToGroup = (topicId: number, groupId: string) => {
        const next = moveTopic(draft, topicId, groupId, Number.MAX_SAFE_INTEGER);
        if (next === draft) return;
        setDraft(next);
        // The row is re-created inside the other category; give its handle the focus back.
        setFocusTopicId(topicId);
        const group = next.find((entry) => entry.id === groupId);
        announcePosition(topicId, groupId, (group?.topicIds.length ?? 1) - 1, next);
    };

    // ---- drag and drop (mouse and pen; touch uses the buttons and the select of each row) ----

    const onDragOverRow = (event: DragEvent<HTMLLIElement>, groupId: string, rowIndex: number) => {
        if (draggingId == null) return;
        event.preventDefault();
        event.stopPropagation();
        const box = event.currentTarget.getBoundingClientRect();
        const slot = rowIndex + (event.clientY > box.top + box.height / 2 ? 1 : 0);
        if (drop?.groupId !== groupId || drop.slot !== slot) setDrop({ groupId, slot });
    };

    const onDragOverList = (event: DragEvent<HTMLElement>, group: TopicLayout[number]) => {
        if (draggingId == null) return;
        event.preventDefault();
        if (drop?.groupId !== group.id || drop.slot !== group.topicIds.length) {
            setDrop({ groupId: group.id, slot: group.topicIds.length });
        }
    };

    const commitDrop = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        if (draggingId != null && drop) {
            const from = findTopic(draft, draggingId);
            // The slot counts the dragged row too; moveTopic counts without it.
            const sameGroupBefore = from && shown[from.groupIndex].id === drop.groupId && from.index < drop.slot;
            const next = moveTopic(draft, draggingId, drop.groupId, drop.slot - (sameGroupBefore ? 1 : 0));
            if (next !== draft) {
                setDraft(next);
                const at = findTopic(next, draggingId);
                if (at) announcePosition(draggingId, next[at.groupIndex].id, at.index, next);
            }
        }
        setDraggingId(null);
        setDrop(null);
    };

    const endDrag = () => {
        setDraggingId(null);
        setDrop(null);
    };

    const renderRow = (group: TopicLayout[number], topicId: number, rowIndex: number) => {
        const topic = topicsById.get(topicId);
        if (!topic) return null;
        const pending = pendingTopicIds.includes(topicId);
        const nameId = `topic-name-${topicId}`;
        const switchLocked = editing || !onToggleActive || !!readOnlyReason || pending;

        return (
            <li
                key={topicId}
                className={classNames(styles.row, {
                    [styles.rowDragging]: draggingId === topicId,
                    [styles.rowInactive]: !topic.active,
                })}
                draggable={editing && !saving}
                onDragStart={(event) => {
                    const { dataTransfer } = event;
                    if (dataTransfer) {
                        dataTransfer.effectAllowed = 'move';
                        dataTransfer.setData('text/plain', String(topicId));
                    }
                    setDraggingId(topicId);
                }}
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
                        data-handle-for={topicId}
                        aria-label={t('topicCatalogue.handle', { name: topic.name })}
                        aria-describedby={hintId}
                        aria-roledescription={t('topicCatalogue.handleRole')}
                        disabled={saving}
                        onKeyDown={(event) => onHandleKeyDown(event, topicId)}
                    >
                        <DragIndicatorIcon aria-hidden />
                    </button>
                )}
                <div className={styles.text}>
                    {!editing && onOpenTopic ? (
                        <button
                            type="button"
                            id={nameId}
                            className={styles.nameButton}
                            onClick={() => onOpenTopic(topicId)}
                        >
                            {topic.name}
                        </button>
                    ) : (
                        <span id={nameId} className={styles.name}>
                            {topic.name}
                        </span>
                    )}
                    {topic.description && <span className={styles.description}>{topic.description}</span>}
                </div>
                {!topic.active && <span className={styles.chip}>{t('topicCatalogue.hidden')}</span>}
                {editing ? (
                    <span className={styles.touchMoves}>
                        <IconButton
                            icon={<ArrowUpwardIcon />}
                            ariaLabel={t('topicCatalogue.moveUp', { name: topic.name })}
                            disabled={saving || rowIndex === 0}
                            onClick={() => step(topicId, 'up')}
                        />
                        <IconButton
                            icon={<ArrowDownwardIcon />}
                            ariaLabel={t('topicCatalogue.moveDown', { name: topic.name })}
                            disabled={saving || rowIndex === group.topicIds.length - 1}
                            onClick={() => step(topicId, 'down')}
                        />
                        <span className={styles.selectWrap}>
                            <select
                                className={styles.groupSelect}
                                aria-label={t('topicCatalogue.moveToGroup', { name: topic.name })}
                                value={group.id}
                                disabled={saving}
                                onChange={(event) => moveToGroup(topicId, event.target.value)}
                            >
                                {draft.map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                        {entry.name || t('topicCatalogue.unnamedGroup')}
                                    </option>
                                ))}
                            </select>
                        </span>
                    </span>
                ) : (
                    <M3Switch
                        checked={topic.active}
                        disabled={switchLocked}
                        label={t('topicCatalogue.visible', { name: topic.name })}
                        onChange={(value) => onToggleActive?.(topicId, value)}
                    />
                )}
            </li>
        );
    };

    const shiftGroup = (groupId: string, groupLabel: string, delta: -1 | 1) => {
        const position = draft.findIndex((group) => group.id === groupId) + delta;
        setDraft(moveGroup(draft, groupId, delta));
        setAnnouncement(
            t('topicCatalogue.announce.groupMoved', { group: groupLabel, position: position + 1, total: draft.length }),
        );
    };

    // The remove button unmounts with its category; the add button is the stable place for the focus to land.
    const dropGroup = (groupId: string, groupLabel: string) => {
        setDraft(removeGroup(draft, groupId));
        setAnnouncement(t('topicCatalogue.announce.groupRemoved', { group: groupLabel }));
        addGroupRef.current?.focus();
    };

    const renderGroup = (group: TopicLayout[number], groupIndex: number) => {
        const groupLabel = group.name || t('topicCatalogue.unnamedGroup');
        const headingId = `topic-group-${group.id}`;
        const count = group.topicIds.length;
        const dropAtEnd = drop?.groupId === group.id && drop.slot >= count;

        return (
            <section key={group.id} className={styles.group} aria-labelledby={headingId} data-group-id={group.id}>
                <div className={styles.groupHeader}>
                    {editing ? (
                        <input
                            id={headingId}
                            className={styles.groupInput}
                            value={group.name}
                            maxLength={60}
                            aria-label={t('topicCatalogue.groupName')}
                            placeholder={t('topicCatalogue.groupNamePlaceholder')}
                            aria-invalid={group.name.trim() === ''}
                            disabled={saving}
                            onChange={(event) => setDraft(renameGroup(draft, group.id, event.target.value))}
                        />
                    ) : (
                        <h3 id={headingId} className={styles.groupTitle}>
                            {group.name}
                        </h3>
                    )}
                    {editing && (
                        <span className={styles.groupTools}>
                            <IconButton
                                icon={<ChevronLeftIcon />}
                                ariaLabel={t('topicCatalogue.groupEarlier', { name: groupLabel })}
                                disabled={saving || groupIndex === 0}
                                onClick={() => shiftGroup(group.id, groupLabel, -1)}
                            />
                            <IconButton
                                icon={<ChevronRightIcon />}
                                ariaLabel={t('topicCatalogue.groupLater', { name: groupLabel })}
                                disabled={saving || groupIndex === draft.length - 1}
                                onClick={() => shiftGroup(group.id, groupLabel, 1)}
                            />
                            <IconButton
                                icon={<DeleteOutlinedIcon />}
                                ariaLabel={t('topicCatalogue.groupRemove', { name: groupLabel })}
                                disabled={saving || count > 0}
                                title={count > 0 ? t('topicCatalogue.groupRemoveBlocked') : undefined}
                                onClick={() => dropGroup(group.id, groupLabel)}
                            />
                        </span>
                    )}
                </div>
                <p className={styles.groupCount}>
                    {t('topicCatalogue.count', { count })}
                    {/* The disabled remove button cannot be focused and a title is out of reach on touch screens. */}
                    {editing && count > 0 && ` · ${t('topicCatalogue.groupRemoveBlocked')}`}
                </p>
                <ul
                    className={classNames(styles.list, { [styles.listEditing]: editing })}
                    aria-labelledby={headingId}
                    onDragOver={(event) => onDragOverList(event, group)}
                    onDrop={commitDrop}
                >
                    {group.topicIds.map((topicId, rowIndex) => renderRow(group, topicId, rowIndex))}
                    {editing && count === 0 && (
                        <li className={styles.emptyGroup}>
                            {drop?.groupId === group.id && <span className={styles.dropLine} aria-hidden />}
                            {t('topicCatalogue.emptyGroup')}
                        </li>
                    )}
                    {dropAtEnd && count > 0 && <li className={styles.dropEnd} aria-hidden />}
                </ul>
            </section>
        );
    };

    const addNewGroup = useCallback(() => {
        const next = addGroup(draft, newGroupId(), t('topicCatalogue.newGroupName'));
        setDraft(next);
        setAnnouncement(t('topicCatalogue.announce.groupAdded', { group: t('topicCatalogue.newGroupName') }));
    }, [draft, t]);

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
    } else {
        body = (
            <TileSections className={styles.groups}>
                {shown.map((group, groupIndex) => renderGroup(group, groupIndex))}
                {editing && (
                    <button
                        ref={addGroupRef}
                        type="button"
                        className={styles.addGroup}
                        disabled={saving}
                        onClick={addNewGroup}
                    >
                        <AddOutlinedIcon aria-hidden />
                        {t('topicCatalogue.addGroup')}
                    </button>
                )}
            </TileSections>
        );
    }

    let footer: ReactNode;
    if (editing) {
        footer = (
            <div className={styles.footer}>
                {/* The alert stays mounted: a role added together with its text is not reliably announced. The saving state is also
                    announced by the busy Save button. */}
                <p className={styles.saveState}>
                    <span>{saving && !saveFailed ? t('topicCatalogue.saving') : ''}</span>
                    <span role="alert">{saveFailed ? t('topicCatalogue.saveError') : ''}</span>
                </p>
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
                <div className={styles.body}>{body}</div>
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
