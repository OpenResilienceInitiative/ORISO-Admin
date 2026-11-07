import { describe, expect, it } from 'vite-plus/test';
import {
    addGroup,
    findTopic,
    layoutsEqual,
    moveGroup,
    moveTopic,
    removeGroup,
    renameGroup,
    stepTopic,
    withUnplacedTopics,
    type TopicLayout,
} from './topicLayout';

const base = (): TopicLayout => [
    { id: 'a', name: 'Alpha', topicIds: [1, 2, 3] },
    { id: 'b', name: 'Beta', topicIds: [4] },
    { id: 'c', name: 'Gamma', topicIds: [] },
];

describe('moveTopic', () => {
    it('reorders inside a group and counts the index after removal', () => {
        expect(moveTopic(base(), 1, 'a', 2)[0].topicIds).toEqual([2, 3, 1]);
        expect(moveTopic(base(), 3, 'a', 0)[0].topicIds).toEqual([3, 1, 2]);
    });

    it('moves into another group, also into an empty one', () => {
        const toB = moveTopic(base(), 2, 'b', 0);
        expect(toB[0].topicIds).toEqual([1, 3]);
        expect(toB[1].topicIds).toEqual([2, 4]);
        expect(moveTopic(base(), 4, 'c', 0)[2].topicIds).toEqual([4]);
    });

    it('clamps an index past the end', () => {
        expect(moveTopic(base(), 1, 'b', 99)[1].topicIds).toEqual([4, 1]);
    });

    it('returns the same layout when nothing changes or the target is unknown', () => {
        const layout = base();
        expect(moveTopic(layout, 2, 'a', 1)).toBe(layout);
        expect(moveTopic(layout, 2, 'nope', 0)).toBe(layout);
        expect(moveTopic(layout, 99, 'a', 0)).toBe(layout);
    });

    it('never mutates its input and never loses or duplicates a topic', () => {
        const layout = base();
        const snapshot = JSON.parse(JSON.stringify(layout));
        const moved = moveTopic(layout, 2, 'c', 0);
        expect(layout).toEqual(snapshot);
        expect(moved.flatMap((group) => group.topicIds).sort()).toEqual([1, 2, 3, 4]);
    });
});

describe('stepTopic', () => {
    it('steps up and down inside a group and reports the new position', () => {
        const down = stepTopic(base(), 1, 'down');
        expect(down).toMatchObject({ changed: true, groupId: 'a', index: 1 });
        expect(down.layout[0].topicIds).toEqual([2, 1, 3]);
        expect(stepTopic(base(), 3, 'up').layout[0].topicIds).toEqual([1, 3, 2]);
    });

    it('does nothing at the edges', () => {
        expect(stepTopic(base(), 1, 'up').changed).toBe(false);
        expect(stepTopic(base(), 3, 'down').changed).toBe(false);
        expect(stepTopic(base(), 1, 'previousGroup').changed).toBe(false);
        expect(stepTopic(base(), 4, 'nextGroup').layout[1].topicIds).toEqual([]);
    });

    it('goes over to the next group at the same row, or its end if that is shorter', () => {
        const result = stepTopic(base(), 3, 'nextGroup');
        expect(result).toMatchObject({ changed: true, groupId: 'b', index: 1 });
        expect(result.layout[1].topicIds).toEqual([4, 3]);
        expect(stepTopic(base(), 4, 'previousGroup').layout[0].topicIds).toEqual([4, 1, 2, 3]);
    });

    it('ignores an unknown topic', () => {
        expect(stepTopic(base(), 99, 'down')).toMatchObject({ changed: false, index: -1 });
    });
});

describe('groups', () => {
    it('adds a trimmed group at the end', () => {
        const next = addGroup(base(), 'd', '  Delta ');
        expect(next[3]).toEqual({ id: 'd', name: 'Delta', topicIds: [] });
    });

    it('renames a group', () => {
        expect(renameGroup(base(), 'b', 'Neu')[1].name).toBe('Neu');
    });

    it('removes only an empty group', () => {
        expect(removeGroup(base(), 'c').map((g) => g.id)).toEqual(['a', 'b']);
        const layout = base();
        expect(removeGroup(layout, 'a')).toBe(layout);
    });

    it('moves a group by one place and stops at the ends', () => {
        expect(moveGroup(base(), 'a', 1).map((g) => g.id)).toEqual(['b', 'a', 'c']);
        expect(moveGroup(base(), 'c', -1).map((g) => g.id)).toEqual(['a', 'c', 'b']);
        const layout = base();
        expect(moveGroup(layout, 'a', -1)).toBe(layout);
    });
});

describe('layoutsEqual / findTopic', () => {
    it('compares ids, names and order', () => {
        expect(layoutsEqual(base(), base())).toBe(true);
        expect(layoutsEqual(base(), moveTopic(base(), 1, 'a', 1))).toBe(false);
        expect(layoutsEqual(base(), renameGroup(base(), 'a', 'x'))).toBe(false);
    });

    it('finds a topic', () => {
        expect(findTopic(base(), 4)).toEqual({ groupIndex: 1, index: 0 });
        expect(findTopic(base(), 9)).toBeNull();
    });
});

describe('withUnplacedTopics', () => {
    const fallback = { id: 'unsorted', name: 'Sonstige' };

    it('collects unknown topics in the fallback group and drops deleted ones', () => {
        const next = withUnplacedTopics(base(), [1, 2, 3, 5, 6], fallback);
        expect(next[0].topicIds).toEqual([1, 2, 3]);
        expect(next[1].topicIds).toEqual([]);
        expect(next[3]).toEqual({ ...fallback, topicIds: [5, 6] });
    });

    it('builds one group from an empty layout', () => {
        expect(withUnplacedTopics([], [3, 1], fallback)).toEqual([{ ...fallback, topicIds: [3, 1] }]);
    });

    it('leaves a complete layout alone', () => {
        expect(withUnplacedTopics(base(), [1, 2, 3, 4], fallback)).toEqual(base());
    });
});
