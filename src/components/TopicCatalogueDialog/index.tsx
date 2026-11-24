import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import InterestsOutlinedIcon from '@mui/icons-material/InterestsOutlined';
import SearchIcon from '@mui/icons-material/Search';
import classNames from 'classnames';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FETCH_ERRORS } from '../../api/fetchData';
import type { TranslateRequest, TranslateResponse } from '../../types/translation';
import type { LocalizedText, TopicCatalogueDto, TopicCatalogueTopicDto } from '../../types/TopicCatalogue';
import { Card } from '../Card';
import { EditButton } from '../EditButton';
import { M3Button } from '../M3Button';
import { M3Switch } from '../M3Switch';
import { TranslateIcon } from '../Journeys/TranslateIcon';
import { plain } from '../Journeys/stepText';
import { DialogButton, Modal } from '../Modal';
import { ICON_MAX_BYTES, ICON_TYPES } from '../TopicCatalogue/TopicIconSlot';
import { assistantIconUploadPolicy } from '../../utils/assistantIconUploadPolicy';
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

export interface TopicCatalogueEditorProps extends Omit<TopicCatalogueDialogProps, 'onClose'> {
    /** Read mode shows the catalogue as it is; edit mode adds handles, arrows, fields and "+ New". */
    editing: boolean;
    /** Switches to edit mode. Without it read mode has no edit button. */
    onEdit?: () => void;
    /** Leaves edit mode without saving. */
    onCancel: () => void;
    /** Read mode: switches a topic visible or hidden at once. Without it no switches show. */
    onToggleActive?: (topicId: number, active: boolean) => void;
    /** Topics whose visibility change is still running; their switches stay locked. */
    pendingTopicIds?: number[];
    /** `modal` (default) wraps the editor in a dialog; `inline` renders it as the page card. */
    variant?: 'modal' | 'inline';
    /**
     * Machine translation (POST /tenantadmin/translate). Edit mode then offers one button that fills
     * every missing text in every language; machine texts carry the translate mark until someone
     * types over them. Without it there is no AI button.
     */
    onTranslate?: (request: TranslateRequest) => Promise<TranslateResponse>;
}

/** Keys the translation service gets back unchanged, and the machine marks are built from. */
const topicNameKey = (id: number) => `topicName:${id}`;
const topicDescriptionKey = (id: number) => `topicDescription:${id}`;
const groupNameKey = (key: string) => `group:${key}`;
const mark = (lang: string, key: string) => `${lang}|${key}`;

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
    onReading,
}: {
    icon?: string | null;
    round?: boolean;
    size: 'small' | 'medium' | 'large';
    editable?: boolean;
    label: string;
    onPick?: (dataUrl: string) => void;
    onRemove?: () => void;
    onProblem?: () => void;
    /** True while a picked file is still being read, false once it is applied (or failed). */
    onReading?: (busy: boolean) => void;
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
                            onReading?.(true);
                            try {
                                const dataUrl = await readAsDataUrl(file);
                                // Same passive-SVG rule as the topic list: no scripts, no external references.
                                if (assistantIconUploadPolicy.validate?.(dataUrl, file) === false) onProblem?.();
                                else onPick?.(dataUrl);
                            } catch {
                                onProblem?.();
                            } finally {
                                onReading?.(false);
                            }
                        }}
                    />
                </>
            )}
        </div>
    );
};

const draftTopics = (catalogue: TopicCatalogueDto): DraftTopic[] =>
    catalogue.topics.filter((topic) => topic.status !== 'IN_DELETION');

const draftGroups = (catalogue: TopicCatalogueDto): DraftGroup[] =>
    catalogue.groups.map((group, index) => ({
        key: `g${group.id ?? `new-${index}`}`,
        id: group.id,
        name: group.name ?? {},
        icon: group.icon,
        iconChanged: false,
        topicIds: [...group.topicIds],
    }));

/**
 * Settings → Themen: the whole topic catalogue in one view. Topics sit in a pool on the left, the
 * categories on the right look like the registration. In read mode it only shows the catalogue
 * (with the visibility switches); "Bearbeiten" turns on the editing affordances in the same place:
 * topics are dragged (or ticked) into categories, texts are edited in the language chosen at the top.
 */
export const TopicCatalogueEditor = ({
    catalogue,
    languages,
    sourceLanguage = 'de',
    onSave,
    editing,
    onEdit,
    onCancel,
    onToggleActive,
    pendingTopicIds = [],
    variant = 'modal',
    onTranslate,
}: TopicCatalogueEditorProps) => {
    const { t } = useTranslation();
    const [lang, setLang] = useState(sourceLanguage);
    const [topics, setTopics] = useState<DraftTopic[]>(() => draftTopics(catalogue));
    const [groups, setGroups] = useState<DraftGroup[]>(() => draftGroups(catalogue));
    const [changedTopicIds, setChangedTopicIds] = useState<Set<number>>(() => new Set());
    const [openTopicId, setOpenTopicId] = useState<number | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
    const [dropKey, setDropKey] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    // Pictures still being read: saving waits for them, so none lands after the request was captured.
    const [picturesReading, setPicturesReading] = useState(0);
    const trackPictureRead = useCallback(
        (busy: boolean) => setPicturesReading((count) => Math.max(0, count + (busy ? 1 : -1))),
        [],
    );
    const [problem, setProblem] = useState<string | null>(null);
    const drag = useRef<DragPayload | null>(null);
    const nextTempId = useRef(-1);
    const nextGroupKey = useRef(1);
    // Machine texts as `lang|key`. The service does not store them, so they live as long as the page.
    const [machine, setMachine] = useState<Set<string>>(() => new Set());
    const savedMachine = useRef<Set<string>>(new Set());
    const [translating, setTranslating] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    // Each start or end of edit mode is a new session; a translation answering later belongs to the old one.
    const session = useRef(0);
    const latest = useRef({ topics, groups });
    latest.current = { topics, groups };

    // Outside edit mode the view follows the saved catalogue: a new answer (a visibility switch,
    // a save) and a cancelled edit both replace the draft. Language and folded categories stay.
    useEffect(() => {
        session.current += 1;
        setNote(null);
        if (editing) return;
        setMachine(new Set(savedMachine.current));
        setTopics(draftTopics(catalogue));
        setGroups(draftGroups(catalogue));
        setChangedTopicIds(new Set());
        setOpenTopicId(null);
        setDropKey(null);
        setDirty(false);
        setProblem(null);
        drag.current = null;
    }, [catalogue, editing]);

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
    const isMachine = (key: string) => lang !== sourceLanguage && machine.has(mark(lang, key));
    /** Someone wrote over a machine text: it is theirs now. */
    const unmark = (key: string) =>
        setMachine((marks) => {
            if (!marks.has(mark(lang, key))) return marks;
            const next = new Set(marks);
            next.delete(mark(lang, key));
            return next;
        });
    const machineMark = (key: string) =>
        isMachine(key) && (
            <span
                className={styles.machineMark}
                role="img"
                aria-label={t('topicCatalogue.machineTranslated')}
                title={t('topicCatalogue.machineTranslated')}
            >
                <TranslateIcon />
            </span>
        );

    const patchTopic = (id: number, patch: Partial<DraftTopic>) => {
        setTopics((all) => all.map((topic) => (topic.id === id ? { ...topic, ...patch } : topic)));
        setChangedTopicIds((ids) => new Set(ids).add(id));
        touch();
    };
    const setTopicText = (topic: DraftTopic, field: 'name' | 'description', value: string) => {
        unmark(field === 'name' ? topicNameKey(topic.id) : topicDescriptionKey(topic.id));
        patchTopic(topic.id, { [field]: { ...topic[field], [lang]: value } });
    };

    const translateMissing = async () => {
        if (!onTranslate || translating) return;
        const targets = languages.map(({ code }) => code).filter((code) => code !== sourceLanguage);
        const texts: Record<string, string> = {};
        const wanted: Record<string, string[]> = {};
        const ask = (key: string, value: LocalizedText | undefined) => {
            const source = text(value, sourceLanguage).trim();
            const missing = targets.filter((code) => !text(value, code).trim());
            if (!source || missing.length === 0) return;
            texts[key] = source;
            wanted[key] = missing;
        };
        topics.forEach((topic) => {
            ask(topicNameKey(topic.id), topic.name);
            ask(topicDescriptionKey(topic.id), topic.description);
        });
        groups.forEach((group) => ask(groupNameKey(group.key), group.name));
        if (Object.keys(texts).length === 0) {
            setNote(t('topicCatalogue.translateNothing'));
            return;
        }
        const targetLangs = targets.filter((code) => Object.values(wanted).some((missing) => missing.includes(code)));
        const started = session.current;
        setTranslating(true);
        setProblem(null);
        setNote(null);
        try {
            const { translations } = await onTranslate({ sourceLang: sourceLanguage, targetLangs, texts });
            if (started !== session.current) return;
            // Fill only what is still empty, and only where the source text is still the one translated.
            const marks: string[] = [];
            const fill = (key: string, value: LocalizedText) => {
                if (text(value, sourceLanguage).trim() !== texts[key]) return value;
                let next = value;
                (wanted[key] ?? []).forEach((code) => {
                    const translated = plain(translations[code]?.[key]);
                    if (!translated || text(next, code).trim()) return;
                    next = { ...next, [code]: translated };
                    marks.push(mark(code, key));
                });
                return next;
            };
            const { topics: nowTopics, groups: nowGroups } = latest.current;
            const filledIds: number[] = [];
            const nextTopics = nowTopics.map((topic) => {
                const name = fill(topicNameKey(topic.id), topic.name);
                const description = fill(topicDescriptionKey(topic.id), topic.description);
                if (name === topic.name && description === topic.description) return topic;
                filledIds.push(topic.id);
                return { ...topic, name, description };
            });
            const nextGroups = nowGroups.map((group) => {
                const name = fill(groupNameKey(group.key), group.name);
                return name === group.name ? group : { ...group, name };
            });
            if (marks.length > 0) {
                setTopics(nextTopics);
                setGroups(nextGroups);
                setChangedTopicIds((ids) => new Set([...ids, ...filledIds]));
                setMachine((current) => new Set([...current, ...marks]));
                touch();
            }
            setNote(t('topicDialog.translateDone', { count: marks.length }));
        } catch (error) {
            if (started !== session.current) return;
            const code = (error as { errorCode?: string } | undefined)?.errorCode;
            setProblem(
                t(
                    code === 'TRANSLATION_NOT_CONFIGURED'
                        ? 'topicCatalogue.translateNotConfigured'
                        : 'topicCatalogue.translateError',
                ),
            );
        } finally {
            setTranslating(false);
        }
    };

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
                // `at` counts rows before the moved topic leaves its own category.
                const from = ids.indexOf(topicId);
                const target = at !== undefined && from >= 0 && from < at ? at - 1 : at;
                const position = target === undefined ? without.length : Math.min(target, without.length);
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
        if (picturesReading > 0) return;
        if (topics.some((topic) => topic.id < 0 && !text(topic.name, sourceLanguage).trim())) {
            setProblem(t('topicDialog.nameMissing'));
            return;
        }
        setSaving(true);
        setProblem(null);
        try {
            await onSave(toSaveBody());
            savedMachine.current = new Set(machine);
            setDirty(false);
        } catch (error) {
            const nameTaken = error instanceof Error && error.message === FETCH_ERRORS.CONFLICT;
            setProblem(t(nameTaken ? 'topicDialog.nameTaken' : 'topicDialog.saveError'));
        } finally {
            setSaving(false);
        }
    };

    // While a save runs the draft is frozen and the dialog stays open, so nothing
    // edited after the request was captured can be lost or close a newer editor.
    const close = () => {
        if (!saving) onCancel();
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
                        onReading={trackPictureRead}
                    />
                    <div className={styles.fields}>
                        <div className={styles.field}>
                            <span className={styles.fieldHead}>
                                <span id={`topic-${topic.id}-name-label`}>{t('topicDialog.name')}</span>
                                {lang !== sourceLanguage && !text(topic.name, lang) && missingTag}
                                {machineMark(topicNameKey(topic.id))}
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
                                {machineMark(topicDescriptionKey(topic.id))}
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
        const tileContent = (
            <>
                <IconSlot icon={topic.icon} size="medium" label={name} />
                <span className={styles.tileName}>
                    {name}
                    {machineMark(topicNameKey(topic.id))}
                </span>
                {lang !== sourceLanguage && (!text(topic.name, lang) || !text(topic.description, lang)) && (
                    <span className={styles.missingDot} title={t('topicDialog.translationMissing')} />
                )}
            </>
        );
        return (
            <li
                key={topic.id}
                className={styles.tile}
                draggable={editing && !saving}
                onDragStart={editing ? (event) => startTopicDrag(event, topic.id) : undefined}
                onDragEnd={editing ? endDrag : undefined}
            >
                <span
                    className={classNames(styles.count, { [styles.countNone]: used === 0 })}
                    title={t('topicDialog.usedIn', { count: used })}
                >
                    {used}×
                </span>
                {editing ? (
                    <button type="button" className={styles.tileButton} onClick={() => setOpenTopicId(topic.id)}>
                        {tileContent}
                    </button>
                ) : (
                    <div className={classNames(styles.tileButton, styles.tileStatic)}>{tileContent}</div>
                )}
            </li>
        );
    };

    const visibilitySwitch = (topic: DraftTopic, topicName: string) =>
        onToggleActive && (
            <M3Switch
                checked={topic.status === 'ACTIVE'}
                disabled={pendingTopicIds.includes(topic.id)}
                label={t('topicCatalogue.visible', { name: topicName })}
                onChange={(value) => onToggleActive(topic.id, value)}
            />
        );

    // Read mode only: topics in no category stay visible (and switchable) in a group that is never saved.
    const unplacedBlock = () => {
        const unplaced = topics.filter((topic) => !usage.get(topic.id));
        if (editing || unplaced.length === 0) return null;
        const name = t('topicCatalogue.withoutCategory');
        return (
            <section
                data-group-id="without-category"
                aria-label={t('topicDialog.categoryLabel', { name })}
                className={styles.category}
            >
                <header className={styles.categoryHeader}>
                    <div className={styles.categoryTitle}>
                        <h3 className={styles.categoryName}>{name}</h3>
                        <div className={styles.meta}>{t('topicDialog.topicCount', { count: unplaced.length })}</div>
                    </div>
                </header>
                <ol className={styles.rows}>
                    {unplaced.map((topic) => {
                        const topicName = shown(topic.name) || t('topicDialog.newTopic');
                        return (
                            <li
                                key={topic.id}
                                data-topic-id={topic.id}
                                className={classNames(styles.row, styles.rowReadOnly)}
                            >
                                <IconSlot icon={topic.icon} size="large" label={topicName} />
                                <div className={styles.rowText}>
                                    <strong>{topicName}</strong>
                                    <span>{shown(topic.description)}</span>
                                </div>
                                {visibilitySwitch(topic, topicName)}
                            </li>
                        );
                    })}
                </ol>
            </section>
        );
    };

    const categoryBlock = (group: DraftGroup, index: number) => {
        const open = !collapsed.has(group.key);
        const name = shown(group.name) || t('topicDialog.newCategory');
        return (
            <section
                key={group.key}
                data-group-id={group.id ?? group.key}
                aria-label={t('topicDialog.categoryLabel', { name })}
                className={classNames(styles.category, { [styles.dropTarget]: dropKey === group.key })}
                onDragOver={editing ? (event) => dragOver(event, group.key) : undefined}
                onDragLeave={editing ? () => setDropKey((key) => (key === group.key ? null : key)) : undefined}
                onDrop={editing ? (event) => drop(event, group.key) : undefined}
            >
                <header className={styles.categoryHeader}>
                    {editing && (
                        <span
                            className={styles.handle}
                            draggable={!saving}
                            onDragStart={(event) => startGroupDrag(event, group.key)}
                            onDragEnd={endDrag}
                            aria-hidden
                        >
                            <DragIndicatorIcon />
                        </span>
                    )}
                    <IconSlot
                        icon={group.icon}
                        round
                        size="large"
                        editable={editing}
                        label={name}
                        onPick={(icon) => patchGroup(group.key, { icon, iconChanged: true })}
                        onRemove={() => patchGroup(group.key, { icon: null, iconChanged: true })}
                        onProblem={() => setProblem(t('topicDialog.pictureProblem'))}
                        onReading={trackPictureRead}
                    />
                    <div className={styles.categoryTitle}>
                        {editing ? (
                            <div className={styles.nameField}>
                                <input
                                    aria-label={t('topicDialog.categoryName')}
                                    value={text(group.name, lang)}
                                    placeholder={text(group.name, sourceLanguage) || t('topicDialog.categoryName')}
                                    maxLength={200}
                                    onChange={(event) => {
                                        unmark(groupNameKey(group.key));
                                        patchGroup(group.key, { name: { ...group.name, [lang]: event.target.value } });
                                    }}
                                />
                                <EditOutlinedIcon aria-hidden className={styles.pen} />
                            </div>
                        ) : (
                            <h3 className={styles.categoryName}>
                                {name}
                                {machineMark(groupNameKey(group.key))}
                            </h3>
                        )}
                        <div className={styles.meta}>
                            {t('topicDialog.topicCount', { count: group.topicIds.length })}
                            {lang !== sourceLanguage && !text(group.name, lang) && missingTag}
                            {editing && machineMark(groupNameKey(group.key))}
                        </div>
                    </div>
                    {editing && (
                        <>
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
                        </>
                    )}
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
                                    data-topic-id={id}
                                    className={classNames(styles.row, {
                                        [styles.rowDrop]: dropKey === rowKey,
                                        [styles.rowReadOnly]: !editing,
                                    })}
                                    draggable={editing && !saving}
                                    onDragStart={editing ? (event) => startTopicDrag(event, id, group.key) : undefined}
                                    onDragEnd={editing ? endDrag : undefined}
                                    onDragOver={editing ? (event) => dragOver(event, rowKey) : undefined}
                                    onDrop={editing ? (event) => drop(event, group.key, row) : undefined}
                                >
                                    {editing && <DragIndicatorIcon aria-hidden className={styles.rowHandle} />}
                                    <IconSlot icon={topic.icon} size="large" label={topicName} />
                                    <div className={styles.rowText}>
                                        <strong>
                                            {topicName}
                                            {machineMark(topicNameKey(topic.id))}
                                        </strong>
                                        <span>
                                            {shown(topic.description)}
                                            {machineMark(topicDescriptionKey(topic.id))}
                                        </span>
                                    </div>
                                    {!editing && visibilitySwitch(topic, topicName)}
                                    {editing && (
                                        <>
                                            {/* Keyboard alternative to dragging a row. */}
                                            <button
                                                type="button"
                                                className={styles.iconButton}
                                                aria-label={t('topicCatalogue.moveUp', { name: topicName })}
                                                disabled={row === 0}
                                                onClick={() => placeTopic(group.key, id, row - 1)}
                                            >
                                                <ArrowUpwardIcon fontSize="small" />
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.iconButton}
                                                aria-label={t('topicCatalogue.moveDown', { name: topicName })}
                                                disabled={row === group.topicIds.length - 1}
                                                onClick={() => placeTopic(group.key, id, row + 2)}
                                            >
                                                <ArrowDownwardIcon fontSize="small" />
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.iconButton}
                                                aria-label={t('topicDialog.removeFromCategory', { name: topicName })}
                                                onClick={() => toggleMembership(group.key, id, false)}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </button>
                                        </>
                                    )}
                                </li>
                            );
                        })}
                        {editing && (
                            <li
                                className={classNames(styles.dropHint, {
                                    [styles.dropHintActive]: dropKey === `${group.key}-end` || dropKey === group.key,
                                })}
                                onDragOver={(event) => dragOver(event, `${group.key}-end`)}
                                onDrop={(event) => drop(event, group.key)}
                            >
                                {t('topicDialog.dropHere')}
                            </li>
                        )}
                    </ol>
                )}
            </section>
        );
    };

    const needle = query.trim().toLowerCase();
    const poolTopics = topics.filter(
        (topic) => openTopicId === topic.id || !needle || shown(topic.name).toLowerCase().includes(needle),
    );

    const sheet = (
        <fieldset
            className={classNames(styles.sheet, { [styles.sheetInline]: variant === 'inline' })}
            disabled={saving}
            aria-busy={saving}
        >
            <div className={styles.languageBar}>
                <span className={styles.languageLabel}>{t('topicDialog.language')}</span>
                <nav aria-label={t('topicDialog.language')} className={styles.languages}>
                    {languages.map(({ code, label }) => {
                        const missing = missingPerLanguage[code] ?? 0;
                        const machineCount = [...machine].filter((entry) => entry.startsWith(`${code}|`)).length;
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
                                {machineCount > 0 && (
                                    <span
                                        className={styles.languageMachine}
                                        title={t('topicDialog.machineCount', { count: machineCount })}
                                    >
                                        <TranslateIcon />
                                        {machineCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
                {editing && onTranslate && (
                    <M3Button
                        variant="tonal"
                        icon={<TranslateIcon />}
                        loading={translating}
                        disabled={saving}
                        onClick={translateMissing}
                    >
                        {t('topicCatalogue.translate')}
                    </M3Button>
                )}
            </div>
            <div className={styles.columns}>
                <aside className={styles.pool}>
                    <div className={styles.columnHead}>
                        <strong>{t('topicDialog.allTopics', { count: topics.length })}</strong>
                        {editing && (
                            <button type="button" className={styles.outlined} onClick={addTopic}>
                                <span aria-hidden>+ </span>
                                {t('topicDialog.newTopic')}
                            </button>
                        )}
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
                    <ul
                        className={styles.tiles}
                        aria-label={t('topicCatalogue.allTopics')}
                        // Read mode has no buttons in the scrolling list; keyboard users still reach and scroll it.
                        tabIndex={editing ? undefined : 0}
                    >
                        {poolTopics.map(tile)}
                    </ul>
                </aside>
                <div className={styles.categories}>
                    <div className={styles.columnHead}>
                        <div>
                            <strong>{t('topicDialog.categories', { count: groups.length })}</strong>
                            <div className={styles.hint}>{t('topicDialog.categoriesHint')}</div>
                        </div>
                        {editing && (
                            <button type="button" className={styles.outlined} onClick={addGroup}>
                                <span aria-hidden>+ </span>
                                {t('topicDialog.newCategory')}
                            </button>
                        )}
                    </div>
                    {groups.map(categoryBlock)}
                    {unplacedBlock()}
                    {editing && (
                        <button type="button" className={styles.addCategory} onClick={addGroup}>
                            <span aria-hidden>+ </span>
                            {t('topicDialog.newCategory')}
                        </button>
                    )}
                </div>
            </div>
        </fieldset>
    );

    const status = problem ? (
        <span role="alert" className={styles.problem}>
            {problem}
        </span>
    ) : (
        <span className={styles.footerHint} role="status">
            {note ?? (dirty ? t('topicDialog.unsaved') : '')}
        </span>
    );

    if (variant === 'inline') {
        return (
            <Card
                variant="dialog"
                autoHeight
                headerIcon={<CategoryOutlinedIcon />}
                titleKey="topicCatalogue.title"
                subTitleKey={editing ? 'topicDialog.description' : 'topicCatalogue.subtitle'}
                dataTestId="topic-catalogue"
                footer={
                    <div className={styles.footer}>
                        {editing ? (
                            <>
                                {status}
                                <M3Button variant="text" onClick={close} disabled={saving}>
                                    {t('btn.cancel')}
                                </M3Button>
                                <M3Button
                                    variant="filled"
                                    loading={saving}
                                    disabled={!dirty || picturesReading > 0}
                                    onClick={submit}
                                >
                                    {t('save')}
                                </M3Button>
                            </>
                        ) : (
                            <>
                                <span className={styles.footerHint} />
                                {onEdit && (
                                    // Waits for a running visibility change: the draft would carry the old status.
                                    <EditButton
                                        labelKey="topicCatalogue.edit"
                                        disabled={pendingTopicIds.length > 0}
                                        onClick={onEdit}
                                    />
                                )}
                            </>
                        )}
                    </div>
                }
            >
                {sheet}
            </Card>
        );
    }

    return (
        <Modal
            width="min(1240px, 94vw)"
            icon={<InterestsOutlinedIcon />}
            title={t('topicDialog.title')}
            description={t('topicDialog.description')}
            descriptionFullWidth
            onClose={close}
            maskClosable={false}
            className={styles.dialog}
            footer={
                <div className={styles.footer}>
                    {status}
                    <DialogButton onClick={close} disabled={saving}>
                        {t('btn.cancel')}
                    </DialogButton>
                    <DialogButton primary disabled={!dirty || picturesReading > 0} loading={saving} onClick={submit}>
                        {t('save')}
                    </DialogButton>
                </div>
            }
        >
            {sheet}
        </Modal>
    );
};

/** The editor as a dialog that opens straight in edit mode. */
export const TopicCatalogueDialog = ({ onClose, ...props }: TopicCatalogueDialogProps) => (
    <TopicCatalogueEditor {...props} editing onCancel={onClose} variant="modal" />
);

export default TopicCatalogueDialog;
