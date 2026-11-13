/**
 * The pure model behind the topic catalogue: which categories exist, which topics sit in them and in
 * which order. No numbers are stored — the order IS the array order, so the UI never has to show a
 * sort index. A topic may sit in several categories (once per category), so a placement is always
 * named by topic AND category. Every function returns a new layout and leaves its input alone.
 */

/** Texts of the languages other than the source language: language code -> text. */
export type Localized = Record<string, string>;

export interface TopicGroup {
    id: string;
    /** Name in the source language. */
    name: string;
    /** Names in the other languages; a missing or empty entry means "not translated yet". */
    names?: Localized;
    /** The category's own picture (SVG or PNG, as data URL or address); without it none is shown. */
    icon?: string | null;
    topicIds: number[];
}

export type TopicLayout = TopicGroup[];

export type StepDirection = 'up' | 'down' | 'previousGroup' | 'nextGroup';

export interface StepResult {
    layout: TopicLayout;
    /** False when the placement already sits at that edge (or the neighbour holds the topic), so nothing happened. */
    changed: boolean;
    groupId: string;
    /** 0-based position inside the group after the step. */
    index: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The categories a topic sits in, in layout order. */
export const groupsOfTopic = (layout: TopicLayout, topicId: number): TopicGroup[] =>
    layout.filter((group) => group.topicIds.includes(topicId));

/** Puts a topic into a category (a copy: other categories keep it). Nothing happens if it is already there. */
export const addToGroup = (
    layout: TopicLayout,
    topicId: number,
    groupId: string,
    index: number = Number.MAX_SAFE_INTEGER,
): TopicLayout => {
    const target = layout.find((group) => group.id === groupId);
    if (!target || target.topicIds.includes(topicId)) return layout;
    const at = clamp(index, 0, target.topicIds.length);
    return layout.map((group) =>
        group.id === groupId
            ? { ...group, topicIds: [...group.topicIds.slice(0, at), topicId, ...group.topicIds.slice(at)] }
            : group,
    );
};

/** Takes a topic out of ONE category. The topic itself stays in the catalogue and in other categories. */
export const removeFromGroup = (layout: TopicLayout, topicId: number, groupId: string): TopicLayout => {
    const target = layout.find((group) => group.id === groupId);
    if (!target || !target.topicIds.includes(topicId)) return layout;
    return layout.map((group) =>
        group.id === groupId ? { ...group, topicIds: group.topicIds.filter((id) => id !== topicId) } : group,
    );
};

/**
 * Moves the placement of a topic from one category to another position — in the same category or in
 * another one. `toIndex` counts the target category AFTER the topic has left its old place, which is
 * the position the user sees when they drop it there. A category cannot hold a topic twice, so moving
 * into a category that has it already changes nothing.
 */
export const moveTopic = (
    layout: TopicLayout,
    topicId: number,
    fromGroupId: string,
    toGroupId: string,
    toIndex: number,
): TopicLayout => {
    const from = layout.find((group) => group.id === fromGroupId);
    const to = layout.find((group) => group.id === toGroupId);
    if (!from || !to) return layout;
    const oldIndex = from.topicIds.indexOf(topicId);
    if (oldIndex === -1) return layout;
    if (fromGroupId !== toGroupId && to.topicIds.includes(topicId)) return layout;

    const withoutTopic = layout.map((group) =>
        group.id === fromGroupId ? { ...group, topicIds: group.topicIds.filter((id) => id !== topicId) } : group,
    );
    const target = withoutTopic.find((group) => group.id === toGroupId);
    if (!target) return layout;
    const index = clamp(toIndex, 0, target.topicIds.length);
    if (fromGroupId === toGroupId && oldIndex === index) return layout;
    return withoutTopic.map((group) =>
        group.id === toGroupId
            ? { ...group, topicIds: [...group.topicIds.slice(0, index), topicId, ...group.topicIds.slice(index)] }
            : group,
    );
};

/** One keyboard step: within the category, or over into the neighbouring category at the same row. */
export const stepTopic = (
    layout: TopicLayout,
    topicId: number,
    groupId: string,
    direction: StepDirection,
): StepResult => {
    const groupIndex = layout.findIndex((group) => group.id === groupId);
    const index = groupIndex === -1 ? -1 : layout[groupIndex].topicIds.indexOf(topicId);
    const unchanged = { layout, changed: false, groupId, index };
    if (index === -1) return unchanged;

    if (direction === 'up' || direction === 'down') {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= layout[groupIndex].topicIds.length) return unchanged;
        return {
            layout: moveTopic(layout, topicId, groupId, groupId, target),
            changed: true,
            groupId,
            index: target,
        };
    }

    const neighbour = groupIndex + (direction === 'previousGroup' ? -1 : 1);
    if (neighbour < 0 || neighbour >= layout.length) return unchanged;
    const neighbourGroup = layout[neighbour];
    const targetIndex = Math.min(index, neighbourGroup.topicIds.length);
    const moved = moveTopic(layout, topicId, groupId, neighbourGroup.id, targetIndex);
    if (moved === layout) return unchanged;
    return { layout: moved, changed: true, groupId: neighbourGroup.id, index: targetIndex };
};

export const addGroup = (layout: TopicLayout, id: string, name: string): TopicLayout => [
    ...layout,
    { id, name: name.trim(), topicIds: [] },
];

/** Renames the source-language name of a category. */
export const renameGroup = (layout: TopicLayout, groupId: string, name: string): TopicLayout =>
    layout.map((group) => (group.id === groupId ? { ...group, name } : group));

/** Sets the name of a category in another language. */
export const translateGroup = (layout: TopicLayout, groupId: string, lang: string, text: string): TopicLayout =>
    layout.map((group) => (group.id === groupId ? { ...group, names: { ...group.names, [lang]: text } } : group));

/** Sets or removes (`null`) the picture of a category. */
export const setGroupIcon = (layout: TopicLayout, groupId: string, icon: string | null): TopicLayout =>
    layout.map((group) => (group.id === groupId ? { ...group, icon } : group));

/** A topic never vanishes with its category: it stays in the topic list and in its other categories. */
export const removeGroup = (layout: TopicLayout, groupId: string): TopicLayout => {
    if (!layout.some((group) => group.id === groupId)) return layout;
    return layout.filter((group) => group.id !== groupId);
};

export const moveGroup = (layout: TopicLayout, groupId: string, delta: -1 | 1): TopicLayout => {
    const from = layout.findIndex((group) => group.id === groupId);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= layout.length) return layout;
    const next = [...layout];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
};

const localizedEqual = (a: Localized = {}, b: Localized = {}): boolean => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) => (a[key] ?? '') === (b[key] ?? ''));
};

export const layoutsEqual = (a: TopicLayout, b: TopicLayout): boolean =>
    a.length === b.length &&
    a.every((group, i) => {
        const other = b[i];
        return (
            group.id === other.id &&
            group.name === other.name &&
            localizedEqual(group.names, other.names) &&
            (group.icon ?? null) === (other.icon ?? null) &&
            group.topicIds.length === other.topicIds.length &&
            group.topicIds.every((id, j) => id === other.topicIds[j])
        );
    });

/**
 * Puts topics that no category holds yet (new topic, backend ahead of the saved layout) into one
 * group and drops ids of topics that were deleted since.
 */
export const withUnplacedTopics = (
    layout: TopicLayout,
    allTopicIds: number[],
    fallbackGroup: { id: string; name: string },
): TopicLayout => {
    const placed = new Set(layout.flatMap((group) => group.topicIds));
    const known = new Set(allTopicIds);
    const cleaned = layout.map((group) => ({ ...group, topicIds: group.topicIds.filter((id) => known.has(id)) }));
    const unplaced = allTopicIds.filter((id) => !placed.has(id));
    if (unplaced.length === 0) return cleaned;
    const existing = cleaned.findIndex((group) => group.id === fallbackGroup.id);
    if (existing !== -1) {
        return cleaned.map((group, i) =>
            i === existing ? { ...group, topicIds: [...group.topicIds, ...unplaced] } : group,
        );
    }
    return [...cleaned, { ...fallbackGroup, topicIds: unplaced }];
};
