import { describe, expect, it } from 'vite-plus/test';
import {
    addLinkForTopic,
    addStep,
    addonChoices,
    assignRegistrationTopic,
    canMoveStep,
    canRemoveStep,
    coveredTopics,
    coreChoices,
    duplicateJourney,
    linkPath,
    missingSafetyAspects,
    moveStep,
    newJourney,
    phasesOf,
    picksAgencyFromList,
    prepareJourneyForPublish,
    registrationRoute,
    removeStep,
    routeSummary,
    shippedJourneys,
    standardJourney,
    stepKindsFor,
    topicReach,
    topicsWithoutRoute,
    translateMissing,
    translationStatus,
    typeSummary,
    unassignRegistrationTopic,
    updateStep,
    type Journey,
    type JourneyStep,
} from './journey';

const mail = (patch: Partial<Journey> = {}): Journey => ({
    ...standardJourney('AGENCY_COUNSELLING', 'j1', 1),
    ...patch,
});
const coresOf = (journey: Journey, phase: 'departure' | 'flight' | 'arrival') =>
    journey.phases[phase].map((step) => step.core ?? step.kind);
const stepOf = (journey: Journey, core: string): JourneyStep => {
    const found = Object.values(journey.phases)
        .flat()
        .find((step) => step.core === core);
    if (!found) throw new Error(`no ${core} step`);
    return found;
};

describe('phases per conversation type', () => {
    it('gives counselling and live chat all three phases', () => {
        expect(phasesOf('AGENCY_COUNSELLING')).toEqual(['departure', 'flight', 'arrival']);
        expect(phasesOf('LIVE_CHAT')).toEqual(['departure', 'flight', 'arrival']);
    });

    it('gives groups no departure: nobody registers into a group through a journey', () => {
        expect(phasesOf('SELF_HELP')).toEqual(['flight', 'arrival']);
        expect(phasesOf('INTERNAL_GROUP')).toEqual(['flight', 'arrival']);
        expect(standardJourney('SELF_HELP', 'g', 1).phases.departure).toEqual([]);
    });
});

describe('the shipped standard journey', () => {
    it('asks topic, postcode, user name, consent and e-mail before the flight, as registration does today', () => {
        expect(coresOf(mail(), 'departure')).toEqual(['topic', 'postcode', 'username', 'consent', 'email']);
    });

    it('starts the flight with the enquiry', () => {
        expect(mail().phases.flight[0].core).toBe('enquiry');
    });

    it('ends with a follow-up survey that is anonymous unless the editor links it', () => {
        const journey = mail();
        expect(journey.phases.arrival.length).toBeGreaterThan(0);
        expect(journey.survey.anonymous).toBe(true);
    });

    it('hands out a fresh copy each time', () => {
        const first = mail();
        first.phases.departure[0].title.de = 'geändert';
        expect(mail().phases.departure[0].title.de).not.toBe('geändert');
    });

    it('ships the internal group empty', () => {
        const journey = standardJourney('INTERNAL_GROUP', 'i', 1);
        expect(journey.phases.flight).toEqual([]);
        expect(journey.phases.arrival).toEqual([]);
    });
});

describe('what a phase can hold', () => {
    it('offers no chat message before the person is in a chat', () => {
        expect(stepKindsFor('departure')).toEqual(['core', 'addon', 'question', 'rating', 'panel']);
        expect(stepKindsFor('flight')).toContain('message');
        expect(stepKindsFor('arrival')).toContain('message');
    });
});

describe('must steps', () => {
    it('keeps user name and consent in place: they can be neither moved nor removed', () => {
        const journey = mail();
        (['username', 'consent'] as const).forEach((core) => {
            const step = stepOf(journey, core);
            expect(canMoveStep(step)).toBe(false);
            expect(canRemoveStep(step)).toBe(false);
            expect(removeStep(journey, 'departure', step.id)).toBe(journey);
            expect(moveStep(journey, 'departure', step.id, 0)).toBe(journey);
        });
    });

    it('lets the enquiry move within the flight, but not disappear', () => {
        const journey = mail();
        const enquiry = stepOf(journey, 'enquiry');
        expect(canMoveStep(enquiry)).toBe(true);
        expect(canRemoveStep(enquiry)).toBe(false);
        expect(moveStep(journey, 'flight', enquiry.id, 1).phases.flight[1].core).toBe('enquiry');
    });

    it('never changes the order of the must steps when another step moves around them', () => {
        const journey = mail();
        const email = stepOf(journey, 'email');
        const moved = moveStep(journey, 'departure', email.id, 0);
        expect(coresOf(moved, 'departure')).toEqual(['email', 'topic', 'postcode', 'username', 'consent']);
    });
});

describe('editing steps', () => {
    it('removes the postcode, and the person then picks the Beratungsstelle from a list', () => {
        const journey = mail();
        expect(picksAgencyFromList(journey)).toBe(false);
        const without = removeStep(journey, 'departure', stepOf(journey, 'postcode').id);
        expect(coresOf(without, 'departure')).toEqual(['topic', 'username', 'consent', 'email']);
        expect(picksAgencyFromList(without)).toBe(true);
    });

    it('adds a question step at the end of a phase', () => {
        const journey = addStep(mail(), 'departure', { kind: 'question' }, 'q1');
        const added = journey.phases.departure.at(-1);
        expect(added?.kind).toBe('question');
        expect(added?.questions).toHaveLength(1);
    });

    it('adds a step right below another one', () => {
        const journey = mail();
        const topic = stepOf(journey, 'topic');
        const next = addStep(journey, 'departure', { kind: 'question' }, 'q1', topic.id);
        expect(next.phases.departure[1].id).toBe('q1');
    });

    it('adds a rating step with one star rating', () => {
        const journey = addStep(mail(), 'arrival', { kind: 'rating' }, 'r1');
        expect(journey.phases.arrival.at(-1)?.ratings?.[0].type).toBe('stars');
    });

    it('adds an info panel with one aspect, collapsed', () => {
        const added = addStep(mail(), 'flight', { kind: 'panel' }, 'p1').phases.flight.at(-1);
        expect(added?.aspects).toHaveLength(1);
        expect(added?.display).toBe('collapsed');
    });

    it('patches one step and leaves the others alone', () => {
        const journey = mail();
        const topic = stepOf(journey, 'topic');
        const next = updateStep(journey, 'departure', topic.id, { title: { de: 'Worum geht es?' } });
        expect(next.phases.departure[0].title.de).toBe('Worum geht es?');
        expect(next.phases.departure[1]).toBe(journey.phases.departure[1]);
    });
});

describe('core elements are used once per journey', () => {
    it('marks every core of the standard departure as used', () => {
        const choices = coreChoices(mail(), 'departure');
        expect(choices.map((choice) => choice.id)).toEqual(['topic', 'postcode', 'username', 'consent', 'email']);
        expect(choices.every((choice) => choice.used)).toBe(true);
    });

    it('offers the postcode again once it was removed', () => {
        const journey = mail();
        const without = removeStep(journey, 'departure', stepOf(journey, 'postcode').id);
        expect(coreChoices(without, 'departure').find((choice) => choice.id === 'postcode')?.used).toBe(false);
    });

    it('does not let the e-mail be asked twice, not even in another phase', () => {
        const journey = mail();
        const choice = coreChoices(journey, 'flight').find((entry) => entry.id === 'email');
        expect(choice).toMatchObject({ used: true, usedIn: 'departure' });
        expect(addStep(journey, 'flight', { kind: 'core', core: 'email' }, 'again')).toBe(journey);
    });

    it('offers only what the phase and the conversation type know', () => {
        expect(coreChoices(mail(), 'arrival')).toEqual([]);
        const liveChat = standardJourney('LIVE_CHAT', 'l', 1);
        expect(coreChoices(liveChat, 'departure').map((choice) => choice.id)).not.toContain('postcode');
    });

    it('offers age and Bundesland as add-ons of the departure, each once', () => {
        const journey = mail();
        expect(addonChoices(journey, 'departure').map((choice) => choice.id)).toEqual(['age', 'state']);
        const withAge = addStep(journey, 'departure', { kind: 'addon', addon: 'age' }, 'age');
        expect(addonChoices(withAge, 'departure').find((choice) => choice.id === 'age')?.used).toBe(true);
        expect(addStep(withAge, 'departure', { kind: 'addon', addon: 'age' }, 'age2')).toBe(withAge);
    });
});

describe('translation per step', () => {
    it('counts the languages a step is written in, of the seven', () => {
        const status = translationStatus(stepOf(mail(), 'postcode'));
        expect(status.translated).toEqual(['de', 'en']);
        expect(status.missing).toEqual(['de@informal', 'fr', 'ru', 'ti', 'tr']);
        expect(status.machine).toEqual([]);
    });

    it('counts a language as missing while one text of the step lacks it', () => {
        const journey = addStep(mail(), 'departure', { kind: 'question' }, 'q1');
        const question = journey.phases.departure.at(-1) as JourneyStep;
        const partly: JourneyStep = { ...question, title: { de: 'Alter', en: 'Age' } };
        // The shipped first question has German and English; the step title now too.
        expect(translationStatus(partly).translated).toEqual(['de', 'en']);
        const noEnglishOption: JourneyStep = {
            ...partly,
            questions: partly.questions?.map((q) => ({ ...q, label: { de: q.label.de } })),
        };
        expect(translationStatus(noEnglishOption).translated).toEqual(['de']);
    });

    it('fills the missing languages by machine and marks them until someone checks', () => {
        const step = stepOf(mail(), 'postcode');
        const translated = translateMissing(step, (text, language) => `${text} [${language}]`);
        const status = translationStatus(translated);
        expect(status.missing).toEqual([]);
        expect(status.machine).toEqual(['de@informal', 'fr', 'ru', 'ti', 'tr']);
        expect(translated.title.fr).toBe(`${step.title.de} [fr]`);
        expect(translated.title.en).toBe(step.title.en);
    });
});

describe('routes and destinations', () => {
    const topics = [
        { id: 1, name: 'Schwangerschaft' },
        { id: 2, name: 'Sucht' },
        { id: 3, name: 'U25' },
        { id: 4, name: 'Schulden' },
    ];
    const standard = mail({ routes: { registration: [1, 2, 4], links: [] } });
    const u25: Journey = {
        ...standardJourney('AGENCY_COUNSELLING', 'j2', 2),
        routes: { registration: [], links: [{ id: 'l1', name: 'U25', topicIds: [3] }] },
    };
    const debt: Journey = {
        ...standardJourney('AGENCY_COUNSELLING', 'j3', 3),
        routes: { registration: [], links: [{ id: 'l2', name: 'Schulden lang', topicIds: [4, 2] }] },
    };
    const all = [standard, u25, debt];

    it('summarises one journey: topics in registration, links, topics behind links', () => {
        expect(routeSummary(standard)).toEqual({ registrationTopics: 3, links: 0, linkTopics: 0 });
        expect(routeSummary(debt)).toEqual({ registrationTopics: 0, links: 1, linkTopics: 2 });
    });

    it('counts journeys and distinct destinations of a conversation type', () => {
        expect(typeSummary(all, 'AGENCY_COUNSELLING')).toEqual({ journeys: 3, destinations: 4 });
        expect(typeSummary(all, 'LIVE_CHAT')).toEqual({ journeys: 0, destinations: 0 });
    });

    it('derives how a topic is reached: registration, link only, or not at all', () => {
        expect(topicReach(all, 'AGENCY_COUNSELLING', 1)).toBe('registration');
        expect(topicReach(all, 'AGENCY_COUNSELLING', 3)).toBe('linkOnly');
        expect(topicReach([standard], 'AGENCY_COUNSELLING', 3)).toBe('none');
        expect(topicsWithoutRoute([standard], 'AGENCY_COUNSELLING', topics).map((topic) => topic.id)).toEqual([3]);
    });

    it('shows a topic in the registration of one journey only: assigning it moves it', () => {
        const next = assignRegistrationTopic(all, 'j3', 4);
        expect(next.find((journey) => journey.id === 'j3')?.routes.registration).toEqual([4]);
        expect(next.find((journey) => journey.id === 'j1')?.routes.registration).toEqual([1, 2]);
    });

    it('leaves other conversation types alone when a topic is assigned', () => {
        const liveChat: Journey = {
            ...standardJourney('LIVE_CHAT', 'l1', 1),
            routes: { registration: [4], links: [] },
        };
        const next = assignRegistrationTopic([...all, liveChat], 'j3', 4);
        expect(next.find((journey) => journey.id === 'l1')?.routes.registration).toEqual([4]);
    });

    it('takes a topic out of the registration again', () => {
        const next = unassignRegistrationTopic(all, 'j1', 2);
        expect(next.find((journey) => journey.id === 'j1')?.routes.registration).toEqual([1, 4]);
    });
});

describe('journeys of a conversation type', () => {
    it('numbers a new journey after the highest one and gives it no route yet', () => {
        const existing = [mail(), { ...standardJourney('AGENCY_COUNSELLING', 'j7', 7) }];
        const created = newJourney(existing, 'AGENCY_COUNSELLING', 'new');
        expect(created.number).toBe(8);
        expect(created.routes).toEqual({ registration: [], links: [] });
        expect(newJourney([], 'LIVE_CHAT', 'first').number).toBe(1);
    });

    it('copies a journey with its steps, but not with its routes', () => {
        const source = mail({ name: 'Standard', routes: { registration: [1], links: [] } });
        const copy = duplicateJourney([source], 'j1', 'copy');
        expect(copy?.number).toBe(2);
        expect(coresOf(copy as Journey, 'departure')).toEqual(coresOf(source, 'departure'));
        expect(copy?.routes).toEqual({ registration: [], links: [] });
        expect(copy?.phases.departure[0]).not.toBe(source.phases.departure[0]);
    });
});

describe('what an installation starts with', () => {
    it('ships one journey per conversation type, and Mailberatung registers every topic as today', () => {
        const topics = [
            { id: 1, name: 'Schwangerschaft' },
            { id: 2, name: 'Sucht' },
        ];
        const shipped = shippedJourneys(topics);
        expect(shipped.map((journey) => journey.conversationType)).toEqual([
            'AGENCY_COUNSELLING',
            'LIVE_CHAT',
            'SELF_HELP',
            'INTERNAL_GROUP',
        ]);
        expect(shipped[0].routes.registration).toEqual([1, 2]);
        expect(shipped[1].routes.registration).toEqual([]);
        expect(topicsWithoutRoute(shipped, 'AGENCY_COUNSELLING', topics)).toEqual([]);
    });
});

describe('safety and publishing', () => {
    it('reports the emergency numbers once the editor removed them from the flight', () => {
        const journey = mail();
        expect(missingSafetyAspects(journey)).toEqual([]);
        const panel = journey.phases.flight.find((step) => step.aspects?.some((aspect) => aspect.safety));
        const without = updateStep(journey, 'flight', (panel as JourneyStep).id, {
            aspects: panel?.aspects?.filter((aspect) => !aspect.safety),
        });
        expect(missingSafetyAspects(without).map((aspect) => aspect.prototypeId)).toEqual(['emergencyNumbers']);
    });

    it('never asks an internal group for emergency numbers', () => {
        expect(missingSafetyAspects(standardJourney('INTERNAL_GROUP', 'i', 1))).toEqual([]);
    });

    it('raises the version of a question whose meaning changed, and only of that one', () => {
        const stored = mail();
        const survey = stored.phases.arrival.find((step) => step.kind === 'question') as JourneyStep;
        const [first, second] = survey.questions ?? [];
        const edited = updateStep(stored, 'arrival', survey.id, {
            questions: survey.questions?.map((q) => (q.id === first.id ? { ...q, label: { de: 'Neu gefragt' } } : q)),
        });
        const published = prepareJourneyForPublish(edited, stored);
        const questions = published.phases.arrival.find((step) => step.id === survey.id)?.questions ?? [];
        expect(questions.find((q) => q.id === first.id)?.version).toBe(first.version + 1);
        expect(questions.find((q) => q.id === second.id)?.version).toBe(second.version);
    });

    it('raises the version of a rating whose scale changed', () => {
        const stored = mail();
        const rating = stored.phases.arrival.find((step) => step.kind === 'rating') as JourneyStep;
        const [first] = rating.ratings ?? [];
        const edited = updateStep(stored, 'arrival', rating.id, {
            ratings: rating.ratings?.map((r) => (r.id === first.id ? { ...r, max: r.max + 5 } : r)),
        });
        const published = prepareJourneyForPublish(edited, stored);
        const ratings = published.phases.arrival.find((step) => step.id === rating.id)?.ratings ?? [];
        expect(ratings[0].version).toBe(first.version + 1);
    });
});

describe('routes as paths', () => {
    it('names the registration route by its path, and live chat has one only later', () => {
        expect(registrationRoute('AGENCY_COUNSELLING')).toEqual({ path: '/registrierung', available: true });
        expect(registrationRoute('LIVE_CHAT')).toEqual({ path: '/live-registrierung', available: false });
        expect(registrationRoute('SELF_HELP')).toBeUndefined();
    });

    it('gives a link a readable path from its name, unique among all links', () => {
        const links = [
            { id: 'a', name: 'Schulden lang', topicIds: [] },
            { id: 'b', name: 'Schulden  lang!', topicIds: [] },
            { id: 'c', name: 'Über 25 – Sucht', topicIds: [] },
            { id: 'd', name: '', topicIds: [] },
        ];
        expect(linkPath(links[0], links)).toBe('/l/schulden-lang');
        expect(linkPath(links[1], links)).toBe('/l/schulden-lang-2');
        expect(linkPath(links[2], links)).toBe('/l/ueber-25-sucht');
        expect(linkPath(links[3], links)).toBe('/l/link-4');
    });

    it('creates a link for one topic, named after it', () => {
        const journey = standardJourney('AGENCY_COUNSELLING', 'j', 1);
        const next = addLinkForTopic(journey, { id: 2, name: 'Sucht' }, 'new');
        expect(next.routes.links).toEqual([{ id: 'new', name: 'Sucht', topicIds: [2] }]);
    });

    it('lists the topics a journey covers, registration first, each once', () => {
        const journey: Journey = {
            ...standardJourney('AGENCY_COUNSELLING', 'j', 1),
            routes: {
                registration: [2, 1],
                links: [
                    { id: 'a', name: 'A', topicIds: [1, 3] },
                    { id: 'b', name: 'B', topicIds: [4] },
                ],
            },
        };
        expect(coveredTopics(journey)).toEqual([
            { topicId: 2, via: 'registration' },
            { topicId: 1, via: 'registration' },
            { topicId: 3, via: 'link' },
            { topicId: 4, via: 'link' },
        ]);
    });
});
