import { describe, expect, it } from 'vitest';
import {
    buildTopicsPayload,
    centreLabel,
    findTopicsLostByMove,
    initialTopicsByCentre,
    notOfferedAt,
    topicsChanged,
} from './topicsByCentre';

const SUCHT = { id: 11, name: 'Sucht' };
const SCHULDEN = { id: 12, name: 'Schulden' };
const FAMILIE = { id: 13, name: 'Familie' };

const NORD = { id: 1, name: 'Nord', postcode: '20095', city: 'Hamburg', topics: [SUCHT, SCHULDEN] };
const SUED = { id: 2, name: 'Süd', postcode: '80331', city: 'München', topics: [SUCHT, FAMILIE] };
const OST = { id: 3, name: 'Ost', postcode: '10115', city: 'Berlin', topics: [FAMILIE] };
const CENTRES = [NORD, SUED, OST];

const option = ({ id, name }: { id: number; name: string }) => ({ value: String(id), label: name });

describe('initialTopicsByCentre', () => {
    it('reads the topics stored per centre', () => {
        expect(
            initialTopicsByCentre(['1', '2'], CENTRES, {
                topicsByAgency: [
                    { agencyId: 1, topicIds: [11] },
                    { agencyId: 2, topicIds: [13] },
                ],
            }),
        ).toEqual({ '1': [option(SUCHT)], '2': [option(FAMILIE)] });
    });

    it('fills every centre that offers a legacy topic', () => {
        expect(initialTopicsByCentre(['1', '2', '3'], CENTRES, { topicsByAgency: [{ topicIds: [11] }] })).toEqual({
            '1': [option(SUCHT)],
            '2': [option(SUCHT)],
            '3': [],
        });
    });

    it('treats the flat list of an older server as legacy', () => {
        expect(initialTopicsByCentre(['1', '3'], CENTRES, { topics: [{ id: 12 }, { id: 13 }] })).toEqual({
            '1': [option(SCHULDEN)],
            '3': [option(FAMILIE)],
        });
    });
});

describe('topics a centre no longer offers', () => {
    const names = (id: string) => ({ '13': 'Familie' }[id]);

    it('keeps a stored topic the centre dropped, after the offered ones', () => {
        expect(
            initialTopicsByCentre(['1'], CENTRES, { topicsByAgency: [{ agencyId: 1, topicIds: [13, 11] }] }, names),
        ).toEqual({ '1': [option(SUCHT), option(FAMILIE)] });
    });

    it('keeps a legacy topic that no assigned centre offers', () => {
        expect(initialTopicsByCentre(['1'], CENTRES, { topicsByAgency: [{ topicIds: [13] }] }, names)).toEqual({
            '1': [option(FAMILIE)],
        });
    });

    it('falls back to the id when the name is unknown', () => {
        expect(initialTopicsByCentre(['1'], CENTRES, { topicsByAgency: [{ agencyId: 1, topicIds: [99] }] })).toEqual({
            '1': [{ value: '99', label: '99' }],
        });
    });

    it('lists the picked topics a centre does not offer', () => {
        expect(notOfferedAt(NORD, [option(SUCHT), option(FAMILIE), '12'])).toEqual(['13']);
        expect(notOfferedAt(undefined, [option(SUCHT)])).toEqual([]);
    });

    it('tells a changed selection from the one that was loaded', () => {
        const initial = { ids: ['1'], byCentre: { '1': [option(SUCHT), option(FAMILIE)] } };
        expect(topicsChanged(initial, ['1'], { '1': [option(FAMILIE), option(SUCHT)] })).toBe(false);
        expect(topicsChanged(initial, ['1'], { '1': [option(SUCHT)] })).toBe(true);
        expect(topicsChanged(initial, ['1', '2'], { '1': [option(SUCHT), option(FAMILIE)], '2': [] })).toBe(true);
    });
});

describe('buildTopicsPayload', () => {
    it('sends one entry per selected centre and the union as flat topicIds', () => {
        expect(
            buildTopicsPayload(['1', '2'], {
                '1': [option(SUCHT)],
                '2': [option(SUCHT), option(FAMILIE)],
                '3': [option(FAMILIE)],
            }),
        ).toEqual({
            topicIds: ['11', '13'],
            topicsByAgency: [
                { agencyId: 1, topicIds: [11] },
                { agencyId: 2, topicIds: [11, 13] },
            ],
        });
    });
});

describe('findTopicsLostByMove', () => {
    const move = (byCentre: Record<string, ReturnType<typeof option>[]>, centreIds = ['3']) =>
        findTopicsLostByMove({
            initialCentreIds: ['1'],
            centreIds,
            initialByCentre: { '1': [option(SUCHT), option(SCHULDEN)] },
            byCentre,
            centres: CENTRES,
        });

    it('names the topics the new centre does not offer', () => {
        expect(move({ '3': [] })).toEqual({ topics: [option(SUCHT), option(SCHULDEN)], target: OST });
    });

    it('ignores a topic the new centre offers', () => {
        expect(move({ '2': [] }, ['2'])).toEqual({ topics: [option(SCHULDEN)], target: SUED });
    });

    it('is quiet when nothing moved', () => {
        expect(move({ '1': [option(SUCHT)] }, ['1'])).toBeNull();
    });
});

describe('centreLabel', () => {
    it('reads "name (postcode city)"', () => {
        expect(centreLabel(NORD)).toBe('Nord (20095 Hamburg)');
    });
});
