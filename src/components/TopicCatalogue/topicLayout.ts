/**
 * The pure model behind the topic catalogue: which group a topic sits in and in which order. No
 * numbers are stored — the order IS the array order, so the UI never has to show a sort index.
 * Every function returns a new layout and leaves its input alone.
 */
export interface TopicGroup {
    id: string;
    name: string;
    topicIds: number[];
}

export type TopicLayout = TopicGroup[];

export type StepDirection = 'up' | 'down' | 'previousGroup' | 'nextGroup';

export interface TopicPosition {
    groupIndex: number;
    index: number;
}

export interface StepResult {
    layout: TopicLayout;
    /** False when the topic already sits at that edge, so nothing happened. */
    changed: boolean;
    groupId: string;
    /** 0-based position inside the group after the step. */
    index: number;
}

export const findTopic = (layout: TopicLayout, topicId: number): TopicPosition | null => {
    for (let groupIndex = 0; groupIndex < layout.length; groupIndex += 1) {
        const index = layout[groupIndex].topicIds.indexOf(topicId);
        if (index !== -1) return { groupIndex, index };
    }
    return null;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Puts a topic into a group at `toIndex`, counted in the target group AFTER the topic has left its
 * old place — which is the position the user sees when they drop it there.
 */
export const moveTopic = (layout: TopicLayout, topicId: number, toGroupId: string, toIndex: number): TopicLayout => {
    const from = findTopic(layout, topicId);
    const toGroupIndex = layout.findIndex((group) => group.id === toGroupId);
    if (!from || toGroupIndex === -1) return layout;

    const withoutTopic = layout.map((group) => ({
        ...group,
        topicIds: group.topicIds.filter((id) => id !== topicId),
    }));
    const target = withoutTopic[toGroupIndex];
    const index = clamp(toIndex, 0, target.topicIds.length);
    if (from.groupIndex === toGroupIndex && from.index === index) return layout;

    target.topicIds = [...target.topicIds.slice(0, index), topicId, ...target.topicIds.slice(index)];
    return withoutTopic;
};

/** One keyboard step: within the group, or over into the neighbouring group at the same row. */
export const stepTopic = (layout: TopicLayout, topicId: number, direction: StepDirection): StepResult => {
    const from = findTopic(layout, topicId);
    if (!from) return { layout, changed: false, groupId: '', index: -1 };
    const { groupIndex, index } = from;
    const groupId = layout[groupIndex].id;
    const unchanged = { layout, changed: false, groupId, index };

    if (direction === 'up' || direction === 'down') {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= layout[groupIndex].topicIds.length) return unchanged;
        return { layout: moveTopic(layout, topicId, groupId, target), changed: true, groupId, index: target };
    }

    const neighbour = groupIndex + (direction === 'previousGroup' ? -1 : 1);
    if (neighbour < 0 || neighbour >= layout.length) return unchanged;
    const neighbourGroup = layout[neighbour];
    const targetIndex = Math.min(index, neighbourGroup.topicIds.length);
    return {
        layout: moveTopic(layout, topicId, neighbourGroup.id, targetIndex),
        changed: true,
        groupId: neighbourGroup.id,
        index: targetIndex,
    };
};

export const addGroup = (layout: TopicLayout, id: string, name: string): TopicLayout => [
    ...layout,
    { id, name: name.trim(), topicIds: [] },
];

export const renameGroup = (layout: TopicLayout, groupId: string, name: string): TopicLayout =>
    layout.map((group) => (group.id === groupId ? { ...group, name } : group));

/** Only an empty group can go: a topic must never vanish from the catalogue by accident. */
export const removeGroup = (layout: TopicLayout, groupId: string): TopicLayout => {
    const group = layout.find((entry) => entry.id === groupId);
    if (!group || group.topicIds.length > 0) return layout;
    return layout.filter((entry) => entry.id !== groupId);
};

export const moveGroup = (layout: TopicLayout, groupId: string, delta: -1 | 1): TopicLayout => {
    const from = layout.findIndex((group) => group.id === groupId);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= layout.length) return layout;
    const next = [...layout];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
};

export const layoutsEqual = (a: TopicLayout, b: TopicLayout): boolean =>
    a.length === b.length &&
    a.every((group, i) => {
        const other = b[i];
        return (
            group.id === other.id &&
            group.name === other.name &&
            group.topicIds.length === other.topicIds.length &&
            group.topicIds.every((id, j) => id === other.topicIds[j])
        );
    });

/** Puts topics the layout does not know yet (new topic, backend ahead of the saved layout) into one group. */
export const withUnplacedTopics = (
    layout: TopicLayout,
    allTopicIds: number[],
    fallbackGroup: { id: string; name: string },
): TopicLayout => {
    const placed = new Set(layout.flatMap((group) => group.topicIds));
    const known = new Set(allTopicIds);
    // A saved layout can still name a topic that was deleted since.
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
