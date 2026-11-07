import { describe, expect, it } from 'vite-plus/test';
import {
    addGroup,
    addToGroup,
    groupsOfTopic,
    layoutsEqual,
    setGroupIcon,
    moveGroup,
    moveTopic,
    removeFromGroup,
    removeGroup,
    renameGroup,
    stepTopic,
    translateGroup,
    withUnplacedTopics,
    type TopicLayout,
} from './topicLayout';

const base = (): TopicLayout => [
    { id: 'a', name: 'Alpha', topicIds: [1, 2, 3] },
    { id: 'b', name: 'Beta', topicIds: [4, 1] },
    { id: 'c', name: 'Gamma', topicIds: [] },
];

describe('addToGroup / removeFromGroup', () => {
    it('copies a topic into another category and keeps the old placements', () => {
        const next = addToGroup(base(), 2, 'b');
        expect(next[1].topicIds).toEqual([4, 1, 2]);
        expect(next[0].topicIds).toEqual([1, 2, 3]);
        expect(groupsOfTopic(next, 2).map((g) => g.id)).toEqual(['a', 'b']);
    });

    it('inserts at an index, also into an empty category, and clamps', () => {
        expect(addToGroup(base(), 3, 'b', 0)[1].topicIds).toEqual([3, 4, 1]);
        expect(addToGroup(base(), 3, 'c')[2].topicIds).toEqual([3]);
        expect(addToGroup(base(), 3, 'b', 99)[1].topicIds).toEqual([4, 1, 3]);
    });

    it('does nothing when the category has the topic or does not exist', () => {
        const layout = base();
        expect(addToGroup(layout, 1, 'a')).toBe(layout);
        expect(addToGroup(layout, 1, 'nope')).toBe(layout);
    });

    it('removes one placement only', () => {
        const next = removeFromGroup(base(), 1, 'a');
        expect(next[0].topicIds).toEqual([2, 3]);
        expect(next[1].topicIds).toEqual([4, 1]);
        const layout = base();
        expect(removeFromGroup(layout, 9, 'a')).toBe(layout);
    });
});

describe('moveTopic', () => {
    it('reorders inside a category and counts the index after removal', () => {
        expect(moveTopic(base(), 1, 'a', 'a', 2)[0].topicIds).toEqual([2, 3, 1]);
        expect(moveTopic(base(), 3, 'a', 'a', 0)[0].topicIds).toEqual([3, 1, 2]);
    });

    it('moves a placement into another category, also into an empty one', () => {
        const toB = moveTopic(base(), 2, 'a', 'b', 0);
        expect(toB[0].topicIds).toEqual([1, 3]);
        expect(toB[1].topicIds).toEqual([2, 4, 1]);
        expect(moveTopic(base(), 4, 'b', 'c', 0)[2].topicIds).toEqual([4]);
    });

    it('leaves the topic in its other categories', () => {
        const moved = moveTopic(base(), 1, 'a', 'c', 0);
        expect(moved[1].topicIds).toContain(1);
        expect(moved[2].topicIds).toEqual([1]);
    });

    it('refuses to put a topic twice into one category', () => {
        const layout = base();
        expect(moveTopic(layout, 1, 'a', 'b', 0)).toBe(layout);
    });

    it('returns the same layout when nothing changes or something is unknown', () => {
        const layout = base();
        expect(moveTopic(layout, 2, 'a', 'a', 1)).toBe(layout);
        expect(moveTopic(layout, 2, 'a', 'nope', 0)).toBe(layout);
        expect(moveTopic(layout, 99, 'a', 'a', 0)).toBe(layout);
        expect(moveTopic(layout, 4, 'a', 'c', 0)).toBe(layout);
    });

    it('never mutates its input', () => {
        const layout = base();
        const snapshot = JSON.parse(JSON.stringify(layout));
        moveTopic(layout, 2, 'a', 'c', 0);
        expect(layout).toEqual(snapshot);
    });
});

describe('stepTopic', () => {
    it('steps up and down inside a category and reports the new position', () => {
        const down = stepTopic(base(), 1, 'a', 'down');
        expect(down).toMatchObject({ changed: true, groupId: 'a', index: 1 });
        expect(down.layout[0].topicIds).toEqual([2, 1, 3]);
        expect(stepTopic(base(), 3, 'a', 'up').layout[0].topicIds).toEqual([1, 3, 2]);
    });

    it('does nothing at the edges', () => {
        expect(stepTopic(base(), 1, 'a', 'up').changed).toBe(false);
        expect(stepTopic(base(), 3, 'a', 'down').changed).toBe(false);
        expect(stepTopic(base(), 1, 'a', 'previousGroup').changed).toBe(false);
    });

    it('goes over to the neighbour at the same row, or its end if that is shorter', () => {
        const result = stepTopic(base(), 3, 'a', 'nextGroup');
        expect(result).toMatchObject({ changed: true, groupId: 'b', index: 2 });
        expect(result.layout[1].topicIds).toEqual([4, 1, 3]);
        expect(stepTopic(base(), 4, 'b', 'previousGroup').layout[0].topicIds).toEqual([4, 1, 2, 3]);
    });

    it('stays when the neighbour already holds the topic', () => {
        expect(stepTopic(base(), 1, 'a', 'nextGroup').changed).toBe(false);
    });

    it('ignores an unknown placement', () => {
        expect(stepTopic(base(), 99, 'a', 'down')).toMatchObject({ changed: false, index: -1 });
        expect(stepTopic(base(), 4, 'a', 'down').changed).toBe(false);
    });
});

describe('categories', () => {
    it('adds a trimmed category at the end', () => {
        expect(addGroup(base(), 'd', '  Delta ')[3]).toEqual({ id: 'd', name: 'Delta', topicIds: [] });
    });

    it('renames a category and sets a translated name', () => {
        expect(renameGroup(base(), 'b', 'Neu')[1].name).toBe('Neu');
        expect(translateGroup(base(), 'b', 'en', 'Beta EN')[1].names).toEqual({ en: 'Beta EN' });
    });

    it('removes a category with its placements; the topics stay elsewhere', () => {
        const next = removeGroup(base(), 'a');
        expect(next.map((g) => g.id)).toEqual(['b', 'c']);
        expect(next[0].topicIds).toContain(1);
        const layout = base();
        expect(removeGroup(layout, 'nope')).toBe(layout);
    });

    it('moves a category by one place and stops at the ends', () => {
        expect(moveGroup(base(), 'a', 1).map((g) => g.id)).toEqual(['b', 'a', 'c']);
        expect(moveGroup(base(), 'c', -1).map((g) => g.id)).toEqual(['a', 'c', 'b']);
        const layout = base();
        expect(moveGroup(layout, 'a', -1)).toBe(layout);
    });
});

describe('setGroupIcon', () => {
    it('sets and removes the picture of one category only', () => {
        const withIcon = setGroupIcon(base(), 'a', 'data:image/png;base64,AA==');
        expect(withIcon[0].icon).toBe('data:image/png;base64,AA==');
        expect(withIcon[1].icon).toBeUndefined();
        expect(setGroupIcon(withIcon, 'a', null)[0].icon).toBeNull();
    });

    it('counts a changed picture as a change, but null equals missing', () => {
        expect(layoutsEqual(base(), setGroupIcon(base(), 'a', 'data:image/png;base64,AA=='))).toBe(false);
        expect(layoutsEqual(base(), setGroupIcon(base(), 'a', null))).toBe(true);
    });
});

describe('layoutsEqual', () => {
    it('compares ids, names, translations and order', () => {
        expect(layoutsEqual(base(), base())).toBe(true);
        expect(layoutsEqual(base(), moveTopic(base(), 1, 'a', 'a', 1))).toBe(false);
        expect(layoutsEqual(base(), renameGroup(base(), 'a', 'x'))).toBe(false);
        expect(layoutsEqual(base(), translateGroup(base(), 'a', 'en', 'x'))).toBe(false);
    });

    it('treats an empty translation like a missing one', () => {
        expect(layoutsEqual(base(), translateGroup(base(), 'a', 'en', ''))).toBe(true);
    });
});

describe('withUnplacedTopics', () => {
    const fallback = { id: 'unsorted', name: 'Sonstige' };

    it('collects topics no category holds and drops deleted ones', () => {
        const next = withUnplacedTopics(base(), [1, 2, 3, 5, 6], fallback);
        expect(next[0].topicIds).toEqual([1, 2, 3]);
        expect(next[1].topicIds).toEqual([1]);
        expect(next[3]).toEqual({ ...fallback, topicIds: [5, 6] });
    });

    it('builds one group from an empty layout', () => {
        expect(withUnplacedTopics([], [3, 1], fallback)).toEqual([{ ...fallback, topicIds: [3, 1] }]);
    });

    it('leaves a complete layout alone', () => {
        expect(withUnplacedTopics(base(), [1, 2, 3, 4], fallback)).toEqual(base());
    });
});
