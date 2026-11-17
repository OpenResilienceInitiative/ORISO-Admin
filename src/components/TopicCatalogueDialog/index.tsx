import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InterestsOutlinedIcon from '@mui/icons-material/InterestsOutlined';
import SearchIcon from '@mui/icons-material/Search';
import classNames from 'classnames';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { LocalizedText, TopicCatalogueDto, TopicCatalogueTopicDto } from '../../types/TopicCatalogue';
import { DialogButton, Modal } from '../Modal';
import { ICON_MAX_BYTES, ICON_TYPES } from '../TopicCatalogue/TopicIconSlot';
import styles from './styles.module.scss';

export interface TopicCatalogueDialogProps {
    /** The catalogue as GET /topicadmin/catalogue answers it. */
    catalogue: TopicCatalogueDto;
    /** The platform's languages, the source language first. */
    languages: { code: string; label: string }[];
    sourceLanguage?: string;
    /** Receives the body of PUT /topicadmin/catalogue; a rejection keeps the dialog open. */
    onSave: (body: TopicCatalogueDto) => Promise<void>;
    onClose: () => void;
}

interface DraftGroup {
    key: string;
    id?: number;
    name: LocalizedText;
    icon?: string | null;
    iconChanged: boolean;
    topicIds: number[];
}

type DraftTopic = TopicCatalogueTopicDto;

type DragPayload = { topicId: number; fromKey?: string } | { groupKey: string };

const text = (value: LocalizedText | undefined, lang: string) => value?.[lang] ?? '';

const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

/** The picture of a topic or category, or the neutral placeholder; editable it uploads and removes. */
const IconSlot = ({
    icon,
    round,
    size,
    editable,
    label,
    onPick,
    onRemove,
    onProblem,
}: {
    icon?: string | null;
    round?: boolean;
    size: 'small' | 'medium' | 'large';
    editable?: boolean;
    label: string;
    onPick?: (dataUrl: string) => void;
    onRemove?: () => void;
    onProblem?: () => void;
}) => {
    const { t } = useTranslation();
    const input = useRef<HTMLInputElement>(null);
    return (
        <div className={classNames(styles.iconSlot, styles[size], { [styles.round]: round })}>
            {icon ? (
                <img className={styles.iconImage} src={icon} alt="" />
            ) : (
                <span className={styles.placeholder} data-testid="icon-placeholder" title={t('topicDialog.noPicture')}>
                    <AddPhotoAlternateOutlinedIcon aria-hidden />
                </span>
            )}
            {editable && (
                <>
                    <button
                        type="button"
                        className={styles.iconPick}
                        aria-label={t(icon ? 'topicDialog.replacePicture' : 'topicDialog.uploadPicture', {
                            name: label,
                        })}
                        onClick={() => input.current?.click()}
                    />
                    {icon && (
                        <button
                            type="button"
                            className={styles.iconRemove}
                            aria-label={t('topicDialog.removePicture', { name: label })}
                            onClick={onRemove}
                        >
                            <CloseIcon aria-hidden />
                        </button>
                    )}
                    <input
                        ref={input}
                        type="file"
                        accept={ICON_TYPES.join(',')}
                        hidden
                        onChange={async (event) => {
                            const field = event.currentTarget;
                            const file = field.files?.[0];
                            field.value = '';
                            if (!file) return;
                            if (!ICON_TYPES.includes(file.type) || file.size > ICON_MAX_BYTES) {
                                onProblem?.();
                                return;
                            }
                            onPick?.(await readAsDataUrl(file));
                        }}
                    />
                </>
            )}
        </div>
    );
};

/**
 * Settings → Themen → Bearbeiten: the whole topic catalogue in one dialog. Topics sit in a pool on
 * the left and are dragged (or ticked) into the categories on the right, which look like the
 * registration. Texts are edited in place, in the language chosen at the top.
 */
export const TopicCatalogueDialog = ({
    catalogue,
    languages,
    sourceLanguage = 'de',
    onSave,
    onClose,
}: TopicCatalogueDialogProps) => {
    const { t } = useTranslation();
    const [lang, setLang] = useState(sourceLanguage);
    const [topics, setTopics] = useState<DraftTopic[]>(() =>
        catalogue.topics.filter((topic) => topic.status !== 'IN_DELETION'),
    );
    const [groups, setGroups] = useState<DraftGroup[]>(() =>
        catalogue.groups.map((group, index) => ({
            key: `g${group.id ?? `new-${index}`}`,
            id: group.id,
            name: group.name ?? {},
            icon: group.icon,
            iconChanged: false,
            topicIds: [...group.topicIds],
        })),
    );
    const [changedTopicIds, setChangedTopicIds] = useState<Set<number>>(() => new Set());
    const [openTopicId, setOpenTopicId] = useState<number | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
    const [dropKey, setDropKey] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);
    const drag = useRef<DragPayload | null>(null);
    const nextTempId = useRef(-1);
    const nextGroupKey = useRef(1);

    const byId = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics]);
    const usage = useMemo(() => {
        const counts = new Map<number, number>();
        groups.forEach((group) => group.topicIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
        return counts;
    }, [groups]);
    const missingPerLanguage = useMemo(
        () =>
            Object.fromEntries(
                languages.map(({ code }) => [
                    code,
                    topics.filter((topic) => !text(topic.name, code) || !text(topic.description, code)).length +
                        groups.filter((group) => !text(group.name, code)).length,
                ]),
            ),
        [languages, topics, groups],
    );

    const shown = (value: LocalizedText | undefined) => text(value, lang) || text(value, sourceLanguage);
    const touch = () => {
        setDirty(true);
        setProblem(null);
    };

    const patchTopic = (id: number, patch: Partial<DraftTopic>) => {
        setTopics((all) => all.map((topic) => (topic.id === id ? { ...topic, ...patch } : topic)));
        setChangedTopicIds((ids) => new Set(ids).add(id));
        touch();
    };
    const setTopicText = (topic: DraftTopic, field: 'name' | 'description', value: string) =>
        patchTopic(topic.id, { [field]: { ...topic[field], [lang]: value } });

    const patchGroup = (key: string, patch: Partial<DraftGroup>) => {
        setGroups((all) => all.map((group) => (group.key === key ? { ...group, ...patch } : group)));
        touch();
    };
    const moveGroup = (index: number, delta: number) => {
        setGroups((all) => {
            const next = [...all];
            const [group] = next.splice(index, 1);
            next.splice(index + delta, 0, group);
            return next;
        });
        touch();
    };
    const placeTopic = (groupKey: string, topicId: number, at?: number, fromKey?: string) => {
        setGroups((all) =>
            all.map((group) => {
                let ids = group.topicIds;
                if (fromKey && group.key === fromKey && fromKey !== groupKey) ids = ids.filter((id) => id !== topicId);
                if (group.key !== groupKey) return { ...group, topicIds: ids };
                const without = ids.filter((id) => id !== topicId);
                const position = at === undefined ? without.length : Math.min(at, without.length);
                return { ...group, topicIds: [...without.slice(0, position), topicId, ...without.slice(position)] };
            }),
        );
        setCollapsed((keys) => {
            const next = new Set(keys);
            next.delete(groupKey);
            return next;
        });
        touch();
    };
    const toggleMembership = (groupKey: string, topicId: number, member: boolean) => {
        if (member) {
            placeTopic(groupKey, topicId);
            return;
        }
        setGroups((all) =>
            all.map((group) =>
                group.key === groupKey ? { ...group, topicIds: group.topicIds.filter((id) => id !== topicId) } : group,
            ),
        );
        touch();
    };
    const addTopic = () => {
        const id = nextTempId.current;
        nextTempId.current -= 1;
        setTopics((all) => [{ id, status: 'ACTIVE', name: {}, description: {}, icon: null } as DraftTopic, ...all]);
        setChangedTopicIds((ids) => new Set(ids).add(id));
        setOpenTopicId(id);
        setQuery('');
        touch();
    };
    const addGroup = () => {
        const key = `new-${nextGroupKey.current}`;
        nextGroupKey.current += 1;
        setGroups((all) => [...all, { key, name: {}, icon: null, iconChanged: true, topicIds: [] }]);
        touch();
    };

    const startTopicDrag = (event: DragEvent, topicId: number, fromKey?: string) => {
        drag.current = { topicId, fromKey };
        const { dataTransfer } = event;
        if (dataTransfer) {
            dataTransfer.setData?.('text/plain', String(topicId));
            dataTransfer.effectAllowed = 'move';
        }
    };
    const startGroupDrag = (event: DragEvent, groupKey: string) => {
        drag.current = { groupKey };
        const { dataTransfer } = event;
        if (dataTransfer) {
            dataTransfer.setData?.('text/plain', groupKey);
            dataTransfer.effectAllowed = 'move';
        }
    };
    const dragOver = (event: DragEvent, key: string) => {
        event.preventDefault();
        if (dropKey !== key) setDropKey(key);
    };
    const drop = (event: DragEvent, groupKey: string, at?: number) => {
        event.preventDefault();
        event.stopPropagation();
        const payload = drag.current;
        drag.current = null;
        setDropKey(null);
        if (!payload) return;
        if ('groupKey' in payload) {
            const from = groups.findIndex((group) => group.key === payload.groupKey);
            const to = groups.findIndex((group) => group.key === groupKey);
            if (from >= 0 && to >= 0 && from !== to) moveGroup(from, to - from);
            return;
        }
        placeTopic(groupKey, payload.topicId, at, payload.fromKey);
    };
    const endDrag = () => {
        drag.current = null;
        setDropKey(null);
    };

    const toSaveBody = (): TopicCatalogueDto => ({
        groups: groups.map((group) => ({
            ...(group.id !== undefined ? { id: group.id } : {}),
            name: Object.fromEntries(Object.entries(group.name).filter(([, value]) => value)),
            icon: group.iconChanged ? group.icon ?? '' : group.icon,
            topicIds: group.topicIds,
        })),
        topics: topics
            .filter((topic) => changedTopicIds.has(topic.id))
            .map((topic) => ({
                ...topic,
                name: Object.fromEntries(Object.entries(topic.name).filter(([, value]) => value)),
                description: Object.fromEntries(Object.entries(topic.description).filter(([, value]) => value)),
            })),
    });

    const submit = async () => {
        if (topics.some((topic) => topic.id < 0 && !text(topic.name, sourceLanguage).trim())) {
            setProblem(t('topicDialog.nameMissing'));
            return;
        }
        setSaving(true);
        setProblem(null);
        try {
            await onSave(toSaveBody());
            setDirty(false);
        } catch {
            setProblem(t('topicDialog.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const missingTag = <span className={styles.missing}>{t('topicDialog.translationMissing')}</span>;

    const topicEditor = (topic: DraftTopic) => {
        const name = shown(topic.name);
        return (
            <li key={topic.id} className={classNames(styles.tile, styles.tileOpen)}>
                <div className={styles.editor}>
                    <IconSlot
                        icon={topic.icon}
                        size="medium"
                        editable
                        label={name}
                        onPick={(icon) => patchTopic(topic.id, { icon })}
                        onRemove={() => patchTopic(topic.id, { icon: '' })}
                        onProblem={() => setProblem(t('topicDialog.pictureProblem'))}
                    />
                    <div className={styles.fields}>
                        <div className={styles.field}>
                            <span className={styles.fieldHead}>
                                <span id={`topic-${topic.id}-name-label`}>{t('topicDialog.name')}</span>
                                {lang !== sourceLanguage && !text(topic.name, lang) && missingTag}
                            </span>
                            <input
                                aria-labelledby={`topic-${topic.id}-name-label`}
                                value={text(topic.name, lang)}
                                placeholder={text(topic.name, sourceLanguage)}
                                maxLength={200}
                                onChange={(event) => setTopicText(topic, 'name', event.target.value)}
                            />
                        </div>
                        <div className={styles.field}>
                            <span className={styles.fieldHead}>
                                <span id={`topic-${topic.id}-description-label`}>
                                    {t('topicDialog.descriptionField')}
                                </span>
                                {lang !== sourceLanguage && !text(topic.description, lang) && missingTag}
                            </span>
                            <textarea
                                aria-labelledby={`topic-${topic.id}-description-label`}
                                rows={3}
                                value={text(topic.description, lang)}
                                placeholder={text(topic.description, sourceLanguage)}
                                onChange={(event) => setTopicText(topic, 'description', event.target.value)}
                            />
                        </div>
                        <fieldset className={styles.membership}>
                            <legend>{t('topicDialog.inCategories')}</legend>
                            {groups.map((group) => (
                                <label
                                    key={group.key}
                                    className={styles.check}
                                    htmlFor={`member-${topic.id}-${group.key}`}
                                >
                                    <input
                                        id={`member-${topic.id}-${group.key}`}
                                        type="checkbox"
                                        checked={group.topicIds.includes(topic.id)}
                                        onChange={(event) =>
                                            toggleMembership(group.key, topic.id, event.target.checked)
                                        }
                                    />
                                    {shown(group.name) || t('topicDialog.newCategory')}
                                </label>
                            ))}
                        </fieldset>
                        <div className={styles.editorActions}>
                            <span className={styles.hint}>{t('topicDialog.pictureHint')}</span>
                            <button type="button" className={styles.done} onClick={() => setOpenTopicId(null)}>
                                {t('topicDialog.done')}
                            </button>
                        </div>
                    </div>
                </div>
            </li>
        );
    };

    const tile = (topic: DraftTopic) => {
        if (openTopicId === topic.id) return topicEditor(topic);
        const used = usage.get(topic.id) ?? 0;
        const name = shown(topic.name) || t('topicDialog.newTopic');
        return (
            <li
                key={topic.id}
                className={styles.tile}
                draggable={!saving}
                onDragStart={(event) => startTopicDrag(event, topic.id)}
                onDragEnd={endDrag}
            >
                <span
                    className={classNames(styles.count, { [styles.countNone]: used === 0 })}
                    title={t('topicDialog.usedIn', { count: used })}
                >
                    {used}×
                </span>
                <button type="button" className={styles.tileButton} onClick={() => setOpenTopicId(topic.id)}>
                    <IconSlot icon={topic.icon} size="medium" label={name} />
                    <span className={styles.tileName}>{name}</span>
                    {lang !== sourceLanguage && (!text(topic.name, lang) || !text(topic.description, lang)) && (
                        <span className={styles.missingDot} title={t('topicDialog.translationMissing')} />
                    )}
                </button>
            </li>
        );
    };

    const categoryBlock = (group: DraftGroup, index: number) => {
        const open = !collapsed.has(group.key);
        const name = shown(group.name) || t('topicDialog.newCategory');
        return (
            <section
                key={group.key}
                aria-label={t('topicDialog.categoryLabel', { name })}
                className={classNames(styles.category, { [styles.dropTarget]: dropKey === group.key })}
                onDragOver={(event) => dragOver(event, group.key)}
                onDragLeave={() => setDropKey((key) => (key === group.key ? null : key))}
                onDrop={(event) => drop(event, group.key)}
            >
                <header className={styles.categoryHeader}>
                    <span
                        className={styles.handle}
                        draggable={!saving}
                        onDragStart={(event) => startGroupDrag(event, group.key)}
                        onDragEnd={endDrag}
                        aria-hidden
                    >
                        <DragIndicatorIcon />
                    </span>
                    <IconSlot
                        icon={group.icon}
                        round
                        size="large"
                        editable
                        label={name}
                        onPick={(icon) => patchGroup(group.key, { icon, iconChanged: true })}
                        onRemove={() => patchGroup(group.key, { icon: null, iconChanged: true })}
                        onProblem={() => setProblem(t('topicDialog.pictureProblem'))}
                    />
                    <div className={styles.categoryTitle}>
                        <div className={styles.nameField}>
                            <input
                                aria-label={t('topicDialog.categoryName')}
                                value={text(group.name, lang)}
                                placeholder={text(group.name, sourceLanguage) || t('topicDialog.categoryName')}
                                maxLength={200}
                                onChange={(event) =>
                                    patchGroup(group.key, { name: { ...group.name, [lang]: event.target.value } })
                                }
                            />
                            <EditOutlinedIcon aria-hidden className={styles.pen} />
                        </div>
                        <div className={styles.meta}>
                            {t('topicDialog.topicCount', { count: group.topicIds.length })}
                            {lang !== sourceLanguage && !text(group.name, lang) && missingTag}
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={t('topicDialog.moveUp')}
                        disabled={index === 0}
                        onClick={() => moveGroup(index, -1)}
                    >
                        <ArrowUpwardIcon fontSize="small" />
                    </button>
                    <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={t('topicDialog.moveDown')}
                        disabled={index === groups.length - 1}
                        onClick={() => moveGroup(index, 1)}
                    >
                        <ArrowDownwardIcon fontSize="small" />
                    </button>
                    <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={t('topicDialog.deleteCategory', { name })}
                        onClick={() => {
                            setGroups((all) => all.filter((item) => item.key !== group.key));
                            touch();
                        }}
                    >
                        <DeleteOutlinedIcon fontSize="small" />
                    </button>
                    <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={t(open ? 'topicDialog.collapse' : 'topicDialog.expand', { name })}
                        aria-expanded={open}
                        onClick={() =>
                            setCollapsed((keys) => {
                                const next = new Set(keys);
                                if (next.has(group.key)) next.delete(group.key);
                                else next.add(group.key);
                                return next;
                            })
                        }
                    >
                        <ExpandMoreIcon className={classNames(styles.chevron, { [styles.chevronOpen]: open })} />
                    </button>
                </header>
                {open && (
                    <ol className={styles.rows}>
                        {group.topicIds.map((id, row) => {
                            const topic = byId.get(id);
                            if (!topic) return null;
                            const rowKey = `${group.key}-${row}`;
                            const topicName = shown(topic.name) || t('topicDialog.newTopic');
                            return (
                                <li
                                    key={id}
                                    className={classNames(styles.row, { [styles.rowDrop]: dropKey === rowKey })}
                                    draggable={!saving}
                                    onDragStart={(event) => startTopicDrag(event, id, group.key)}
                                    onDragEnd={endDrag}
                                    onDragOver={(event) => dragOver(event, rowKey)}
                                    onDrop={(event) => drop(event, group.key, row)}
                                >
                                    <DragIndicatorIcon aria-hidden className={styles.rowHandle} />
                                    <IconSlot icon={topic.icon} size="large" label={topicName} />
                                    <div className={styles.rowText}>
                                        <strong>{topicName}</strong>
                                        <span>{shown(topic.description)}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className={styles.iconButton}
                                        aria-label={t('topicDialog.removeFromCategory', { name: topicName })}
                                        onClick={() => toggleMembership(group.key, id, false)}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </button>
                                </li>
                            );
                        })}
                        <li
                            className={classNames(styles.dropHint, {
                                [styles.dropHintActive]: dropKey === `${group.key}-end` || dropKey === group.key,
                            })}
                            onDragOver={(event) => dragOver(event, `${group.key}-end`)}
                            onDrop={(event) => drop(event, group.key)}
                        >
                            {t('topicDialog.dropHere')}
                        </li>
                    </ol>
                )}
            </section>
        );
    };

    const needle = query.trim().toLowerCase();
    const poolTopics = topics.filter(
        (topic) => openTopicId === topic.id || !needle || shown(topic.name).toLowerCase().includes(needle),
    );

    return (
        <Modal
            width="min(1240px, 94vw)"
            icon={<InterestsOutlinedIcon />}
            title={t('topicDialog.title')}
            description={t('topicDialog.description')}
            descriptionFullWidth
            onClose={onClose}
            maskClosable={false}
            className={styles.dialog}
            footer={
                <div className={styles.footer}>
                    {problem ? (
                        <span role="alert" className={styles.problem}>
                            {problem}
                        </span>
                    ) : (
                        <span className={styles.footerHint}>{dirty ? t('topicDialog.unsaved') : ''}</span>
                    )}
                    <DialogButton onClick={onClose}>{t('btn.cancel')}</DialogButton>
                    <DialogButton primary disabled={!dirty} loading={saving} onClick={submit}>
                        {t('save')}
                    </DialogButton>
                </div>
            }
        >
            <div className={styles.sheet}>
                <div className={styles.languageBar}>
                    <span className={styles.languageLabel}>{t('topicDialog.language')}</span>
                    <nav aria-label={t('topicDialog.language')} className={styles.languages}>
                        {languages.map(({ code, label }) => {
                            const missing = missingPerLanguage[code] ?? 0;
                            return (
                                <button
                                    key={code}
                                    type="button"
                                    aria-pressed={code === lang}
                                    className={classNames(styles.language, { [styles.languageActive]: code === lang })}
                                    onClick={() => setLang(code)}
                                >
                                    {label}
                                    {missing > 0 && (
                                        <span
                                            className={styles.languageMissing}
                                            title={t('topicDialog.missingCount', { count: missing })}
                                        >
                                            {missing}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>
                <div className={styles.columns}>
                    <aside className={styles.pool}>
                        <div className={styles.columnHead}>
                            <strong>{t('topicDialog.allTopics', { count: topics.length })}</strong>
                            <button type="button" className={styles.outlined} onClick={addTopic}>
                                <span aria-hidden>+ </span>
                                {t('topicDialog.newTopic')}
                            </button>
                        </div>
                        <div className={styles.search}>
                            <SearchIcon aria-hidden />
                            <input
                                aria-label={t('topicDialog.search')}
                                placeholder={t('topicDialog.search')}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </div>
                        <ul className={styles.tiles} aria-label={t('topicCatalogue.allTopics')}>
                            {poolTopics.map(tile)}
                        </ul>
                    </aside>
                    <div className={styles.categories}>
                        <div className={styles.columnHead}>
                            <div>
                                <strong>{t('topicDialog.categories', { count: groups.length })}</strong>
                                <div className={styles.hint}>{t('topicDialog.categoriesHint')}</div>
                            </div>
                            <button type="button" className={styles.outlined} onClick={addGroup}>
                                <span aria-hidden>+ </span>
                                {t('topicDialog.newCategory')}
                            </button>
                        </div>
                        {groups.map(categoryBlock)}
                        <button type="button" className={styles.addCategory} onClick={addGroup}>
                            <span aria-hidden>+ </span>
                            {t('topicDialog.newCategory')}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default TopicCatalogueDialog;
