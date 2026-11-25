import { describe, expect, it } from 'vite-plus/test';
import {
    addStep,
    canMoveBy,
    moveStep,
    canPreselectTopic,
    duplicateJourney,
    fixLinkSlugs,
    isReachable,
    isTopicPreselected,
    linkPath,
    prepareJourneyForPublish,
    pruneUnknownTopics,
    setRoutes,
    setTopicPreselected,
    splitQuestionStep,
    standardJourney,
    updateStep,
    withRatingType,
    exampleSurveySteps,
    type Journey,
    type JourneyStep,
    type RatingItem,
} from './journey';

const mail = (id = 'j1', number = 1): Journey => standardJourney('AGENCY_COUNSELLING', id, number);
const withSurvey = (): Journey => {
    const journey = mail();
    return { ...journey, phases: { ...journey.phases, arrival: exampleSurveySteps('j1') } };
};
const surveyOf = (journey: Journey) => journey.phases.arrival.find((step) => step.kind === 'question') as JourneyStep;
const ratingStepOf = (journey: Journey) => journey.phases.arrival.find((step) => step.kind === 'rating') as JourneyStep;
const allQuestions = (journey: Journey) =>
    Object.values(journey.phases)
        .flat()
        .flatMap((step) => step.questions ?? []);

describe('publishing raises a version only when an answer could mean something else (#1568)', () => {
    it('keeps the version when only a translation was added', () => {
        const stored = withSurvey();
        const survey = surveyOf(stored);
        const edited = updateStep(stored, 'arrival', survey.id, {
            questions: survey.questions?.map((q) => ({ ...q, label: { ...q.label, fr: 'Traduit' } })),
        });
        const published = prepareJourneyForPublish(edited, stored);
        expect(surveyOf(published).questions?.map((q) => q.version)).toEqual(survey.questions?.map((q) => q.version));
    });

    it('raises the version of a rating that became required', () => {
        const stored = withSurvey();
        const step = ratingStepOf(stored);
        const [first] = step.ratings ?? [];
        const edited = updateStep(stored, 'arrival', step.id, {
            ratings: step.ratings?.map((r) => (r.id === first.id ? { ...r, required: !r.required } : r)),
        });
        expect(ratingStepOf(prepareJourneyForPublish(edited, stored)).ratings?.[0].version).toBe(first.version + 1);
    });

    it('follows a question into the step it was split into', () => {
        const stored = withSurvey();
        const survey = surveyOf(stored);
        const split = splitQuestionStep(stored, 'arrival', survey.id, (index) => `part-${index}`);
        const moved = survey.questions?.[1];
        if (!moved) throw new Error('no second question');
        const edited = updateStep(split, 'arrival', 'part-1', {
            questions: [{ ...moved, label: { de: 'Ganz anders gefragt' } }],
        });
        const published = allQuestions(prepareJourneyForPublish(edited, stored)).find((q) => q.id === moved.id);
        expect(published?.version).toBe(moved.version + 1);
    });

    it('drops the labels a rating no longer shows when it becomes stars', () => {
        const range: RatingItem = {
            id: 'r',
            type: 'range',
            label: { de: 'Wie geht es?' },
            min: -5,
            max: 5,
            minLabel: { de: 'schlecht' },
            midLabel: { de: 'normal' },
            maxLabel: { de: 'gut' },
            required: false,
            version: 1,
        };
        const stars = withRatingType(range, 'stars');
        expect([stars.minLabel, stars.midLabel, stars.maxLabel]).toEqual([undefined, undefined, undefined]);
    });
});

describe('topics and links (#1570)', () => {
    it('drops deleted topics from every route and says which', () => {
        const journey = setRoutes(mail(), {
            registration: [1, 9],
            links: [{ id: 'l', name: 'Sucht', topicIds: [9, 2] }],
        });
        const { journeys, removed } = pruneUnknownTopics(
            [journey],
            [
                { id: 1, name: 'Schulden' },
                { id: 2, name: 'Sucht' },
            ],
        );
        expect(removed).toEqual([9]);
        expect(journeys[0].routes).toEqual({ registration: [1], links: [{ id: 'l', name: 'Sucht', topicIds: [2] }] });
    });

    it('leaves the journeys alone when every topic exists', () => {
        const journeys = [setRoutes(mail(), { registration: [1], links: [] })];
        expect(pruneUnknownTopics(journeys, [{ id: 1, name: 'Schulden' }]).journeys).toBe(journeys);
    });

    it('keeps a saved link address when the link is renamed or an earlier one goes', () => {
        const journey = setRoutes(mail(), {
            registration: [],
            links: [
                { id: 'a', name: 'Sucht', topicIds: [1] },
                { id: 'b', name: 'Sucht', topicIds: [2] },
            ],
        });
        const [saved] = fixLinkSlugs([journey]);
        const [first, second] = saved.routes.links;
        expect([first.slug, second.slug]).toEqual(['sucht', 'sucht-2']);
        const renamed = { ...second, name: 'Glücksspiel' };
        expect(linkPath(renamed, [renamed])).toBe('/l/sucht-2');
    });

    it('gives links of two conversation types different addresses', () => {
        const mailJourney = setRoutes(mail(), { registration: [], links: [{ id: 'm', name: 'Sucht', topicIds: [1] }] });
        const chat = setRoutes(standardJourney('LIVE_CHAT', 'c', 1), {
            registration: [],
            links: [{ id: 'c1', name: 'Sucht', topicIds: [1] }],
        });
        const saved = fixLinkSlugs([mailJourney, chat]).flatMap((journey) => journey.routes.links.map((l) => l.slug));
        expect(saved).toEqual(['sucht', 'sucht-2']);
    });

    it('preselects only for a journey reached by links with one topic each, and forgets it when a route is added', () => {
        expect(canPreselectTopic(mail())).toBe(false);
        const linked = setRoutes(mail(), { registration: [], links: [{ id: 'l', name: 'U25', topicIds: [3] }] });
        const preselected = setTopicPreselected(linked, true);
        expect(isTopicPreselected(preselected)).toBe(true);
        const routed = setRoutes(preselected, { ...preselected.routes, registration: [3] });
        const back = setRoutes(routed, { ...routed.routes, registration: [] });
        expect(isTopicPreselected(back)).toBe(false);
    });

    it('counts a group and the first live-chat journey as reachable without a route', () => {
        const group = standardJourney('INTERNAL_GROUP', 'g', 1);
        const chat1 = standardJourney('LIVE_CHAT', 'c1', 1);
        const chat2 = standardJourney('LIVE_CHAT', 'c2', 2);
        const all = [group, chat1, chat2, mail()];
        expect(isReachable(all, group)).toBe(true);
        expect(isReachable(all, chat1)).toBe(true);
        expect(isReachable(all, chat2)).toBe(false);
        expect(isReachable(all, mail())).toBe(false);
    });
});

describe('order, kinds and copies (#1566)', () => {
    const idOf = (journey: Journey, core: string) =>
        journey.phases.departure.find((step) => step.core === core)?.id as string;

    it('moves the postcode down only together with the Beratungsstelle (Frank, 2026-11-24)', () => {
        const journey = mail();
        const postcode = idOf(journey, 'postcode');
        expect(canMoveBy(journey, 'departure', postcode, 1)).toBe(true);
        const steps = moveStep(journey, 'departure', postcode, 2).phases.departure;
        const at = steps.findIndex((step) => step.id === postcode);
        expect(steps[at + 1].core).toBe('agency');
    });

    it('does not offer "move up" for the step right after the topic', () => {
        const journey = mail();
        const second = journey.phases.departure[1];
        expect(canMoveBy(journey, 'departure', second.id, -1)).toBe(false);
    });

    it('puts a postcode added back before the Beratungsstelle', () => {
        const journey = mail();
        const without: Journey = {
            ...journey,
            phases: { ...journey.phases, departure: journey.phases.departure.filter((s) => s.core !== 'postcode') },
        };
        const back = addStep(without, 'departure', { kind: 'core', core: 'postcode' }, 'pc');
        const order = back.phases.departure.map((step) => step.core);
        expect(order.indexOf('postcode')).toBeLessThan(order.indexOf('agency'));
    });

    it('refuses a step kind the phase does not have', () => {
        const journey = mail();
        expect(addStep(journey, 'departure', { kind: 'message' }, 'm')).toBe(journey);
    });

    it('gives a copy its own step and question ids and a name of its own', () => {
        const source = withSurvey();
        const copy = duplicateJourney([source], source.id, 'copy', 'Kopie von Standard');
        if (!copy) throw new Error('no copy');
        const ids = (journey: Journey) =>
            Object.values(journey.phases)
                .flat()
                .map((step) => step.id);
        expect(ids(copy).some((id) => ids(source).includes(id))).toBe(false);
        expect(allQuestions(copy).some((q) => allQuestions(source).some((other) => other.id === q.id))).toBe(false);
        expect(copy.name).toBe('Kopie von Standard');
        expect(copy.routes).toEqual({ registration: [], links: [] });
    });
});
