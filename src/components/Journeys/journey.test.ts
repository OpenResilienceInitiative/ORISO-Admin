import { describe, expect, it } from 'vite-plus/test';
import {
    addLinkForTopic,
    addStep,
    addTag,
    addonChoices,
    assignRegistrationTopic,
    canMoveStep,
    canRemoveStep,
    coveredTopics,
    coreChoices,
    duplicateJourney,
    emptyProfile,
    editablePhases,
    exampleInfoPanel,
    exampleSurveySteps,
    isSkipped,
    languageStates,
    markChecked,
    linkPath,
    matchesSearch,
    missingSafetyAspects,
    moveItem,
    moveStep,
    newJourney,
    phasesOf,
    picksAgencyFromList,
    prepareJourneyForPublish,
    registrationRoute,
    removeStep,
    scaleOf,
    routeSummary,
    shippedJourneys,
    splitQuestionStep,
    standardJourney,
    START_OF_PHASE,
    canPreselectTopic,
    isTopicPreselected,
    setTopicPreselected,
    stepKindsFor,
    triggersFor,
    topicReach,
    topicsWithoutRoute,
    translateMissing,
    translationStatus,
    typeSummary,
    unassignRegistrationTopic,
    updateStep,
    withScale,
    type Journey,
    type JourneyStep,
    type RatingItem,
} from './journey';

const mail = (patch: Partial<Journey> = {}): Journey => ({
    ...standardJourney('AGENCY_COUNSELLING', 'j1', 1),
    ...patch,
});
/** The standard journey with a survey written into it, instead of the centre's one. */
const withSurvey = (): Journey => {
    const journey = mail();
    return { ...journey, phases: { ...journey.phases, arrival: exampleSurveySteps('j1') } };
};
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
    it('checks in with topic, postcode, centre, user name, consent and e-mail, as registration does today', () => {
        expect(coresOf(mail(), 'departure')).toEqual(['topic', 'postcode', 'agency', 'username', 'consent', 'email']);
    });

    it("places the centre's greeting and the suggestion of another service on board, and its survey at arrival", () => {
        expect(coresOf(mail(), 'flight')).toEqual(['enquiry', 'agencyGreeting', 'suggestAlternative']);
        expect(coresOf(mail(), 'arrival')).toEqual(['agencySurvey']);
        expect(coresOf(standardJourney('SELF_HELP', 'g', 1), 'flight')).toEqual(['agencyGreeting']);
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

    it('keeps "choose a topic" first and the must steps in their order when another step moves', () => {
        const journey = mail();
        const email = stepOf(journey, 'email');
        const moved = moveStep(journey, 'departure', email.id, 0);
        expect(coresOf(moved, 'departure')).toEqual(['topic', 'email', 'postcode', 'agency', 'username', 'consent']);
    });

    it('keeps "choose a centre": the postcode often finds several, so it is not removable', () => {
        const journey = mail();
        const agency = stepOf(journey, 'agency');
        expect(canRemoveStep(agency)).toBe(false);
        expect(canMoveStep(agency)).toBe(true);
    });
});

describe('editing steps', () => {
    it('removes the postcode, and the person then picks the Beratungsstelle from a list', () => {
        const journey = mail();
        expect(picksAgencyFromList(journey)).toBe(false);
        const without = removeStep(journey, 'departure', stepOf(journey, 'postcode').id);
        expect(coresOf(without, 'departure')).toEqual(['topic', 'agency', 'username', 'consent', 'email']);
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

    it('adds a rating step with a scale from −5 to +5, 0 labelled "normal"', () => {
        const rating = addStep(mail(), 'arrival', { kind: 'rating' }, 'r1').phases.arrival.at(-1)?.ratings?.[0];
        expect(rating).toMatchObject({ type: 'range', min: -5, max: 5, midLabel: { de: 'normal' } });
        expect(scaleOf(rating as RatingItem)).toBe('minusFiveToFive');
    });

    it('switches a scale by preset, and only −5 … +5 keeps a middle label', () => {
        const rating = addStep(mail(), 'arrival', { kind: 'rating' }, 'r1').phases.arrival.at(-1)
            ?.ratings?.[0] as RatingItem;
        const ten = withScale(rating, 'zeroToTen');
        expect(ten).toMatchObject({ min: 0, max: 10, midLabel: undefined });
        expect(withScale(ten, 'minusFiveToFive').midLabel).toEqual({ de: 'normal', en: 'normal' });
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
        expect(choices.map((choice) => choice.id)).toEqual([
            'topic',
            'postcode',
            'agency',
            'username',
            'consent',
            'email',
        ]);
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
        expect(coreChoices(mail(), 'arrival').map((choice) => choice.id)).toEqual(['agencySurvey']);
        expect(coreChoices(standardJourney('SELF_HELP', 'g', 1), 'flight').map((choice) => choice.id)).toEqual([
            'agencyGreeting',
        ]);
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
    it("finds the emergency numbers in the centre's greeting or in an info panel of the journey", () => {
        const journey = mail();
        expect(missingSafetyAspects(journey)).toEqual([]);
        const noGreeting = removeStep(journey, 'flight', stepOf(journey, 'agencyGreeting').id);
        expect(missingSafetyAspects(noGreeting).map((aspect) => aspect.prototypeId)).toEqual(['emergencyNumbers']);
        const withPanel = addStep(noGreeting, 'flight', { kind: 'panel' }, 'p');
        const panelWithSafety = updateStep(withPanel, 'flight', 'p', { aspects: exampleInfoPanel('x').aspects });
        expect(missingSafetyAspects(panelWithSafety)).toEqual([]);
    });

    it('never asks an internal group for emergency numbers', () => {
        expect(missingSafetyAspects(standardJourney('INTERNAL_GROUP', 'i', 1))).toEqual([]);
    });

    it('raises the version of a question whose meaning changed, and only of that one', () => {
        const stored = withSurvey();
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

    it('raises the version of a question that now offers "something else"', () => {
        const stored = withSurvey();
        const survey = stored.phases.arrival.find((step) => step.kind === 'question') as JourneyStep;
        const [, comment] = survey.questions ?? [];
        const edited = updateStep(stored, 'arrival', survey.id, {
            questions: survey.questions?.map((q) => (q.id === comment.id ? { ...q, other: true } : q)),
        });
        const questions =
            prepareJourneyForPublish(edited, stored).phases.arrival.find((step) => step.id === survey.id)?.questions ??
            [];
        expect(questions.find((q) => q.id === comment.id)?.version).toBe(comment.version + 1);
    });

    it('raises the version of a rating whose scale changed', () => {
        const stored = withSurvey();
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

describe('levels, permissions and triggers (Frank, 2026-11-18)', () => {
    it('lets Träger and Beratungsstelle change flight and arrival, never the check-in', () => {
        expect(editablePhases('platform')).toEqual(['departure', 'flight', 'arrival']);
        expect(editablePhases('tenant')).toEqual(['flight', 'arrival']);
        expect(editablePhases('agency')).toEqual(['flight', 'arrival']);
    });

    it('offers a building block Funktionszugriff switched off as not allowed, and does not add it', () => {
        const journey = removeStep(mail(), 'departure', 'j1:email');
        const email = coreChoices(journey, 'departure', ['email']).find((choice) => choice.id === 'email');
        expect(email).toMatchObject({ used: false, allowed: false });
        expect(addStep(journey, 'departure', { kind: 'core', core: 'email' }, 'e', undefined, ['email'])).toBe(journey);
    });

    it('keeps a step whose building block was switched off, and marks it as skipped', () => {
        const email = stepOf(mail(), 'email');
        expect(isSkipped(email, ['email'])).toBe(true);
        expect(isSkipped(email, [])).toBe(false);
    });

    it('sends on board with the greeting, after the first reply or by hand, and at arrival on close or by hand', () => {
        expect(triggersFor('departure')).toEqual([]);
        expect(triggersFor('flight')).toEqual(['withGreeting', 'afterFirstReply', 'manual']);
        expect(triggersFor('arrival')).toEqual(['onClose', 'manual']);
        expect(addStep(mail(), 'arrival', { kind: 'question' }, 'q').phases.arrival.at(-1)?.trigger).toBe('onClose');
    });

    it('sends "suggest another service" only when the counsellor chooses it in the conversation menu', () => {
        expect(stepOf(mail(), 'suggestAlternative').trigger).toBe('manual');
    });
});

describe('the language menu of a step', () => {
    it('names each language: original, checked by hand, machine-made, or missing', () => {
        const step = translateMissing(stepOf(mail(), 'postcode'), (text) => `${text}*`);
        const states = Object.fromEntries(languageStates(step).map(({ language, state }) => [language, state]));
        expect(states).toEqual({
            de: 'source',
            'de@informal': 'machine',
            en: 'checked',
            fr: 'machine',
            ru: 'machine',
            ti: 'machine',
            tr: 'machine',
        });
        expect(languageStates(stepOf(mail(), 'postcode')).find((entry) => entry.language === 'fr')?.state).toBe(
            'missing',
        );
    });

    it('turns a machine translation into a checked one when a person confirms it', () => {
        const step = translateMissing(stepOf(mail(), 'postcode'), (text) => `${text}*`);
        const checked = markChecked(step, 'fr');
        expect(languageStates(checked).find((entry) => entry.language === 'fr')?.state).toBe('checked');
        expect(translationStatus(checked).machine).not.toContain('fr');
    });
});

describe('the registration picks the journey by topic', () => {
    it('keeps "choose a topic" first: a must step, and nothing can be placed before it', () => {
        const journey = mail();
        const topic = stepOf(journey, 'topic');
        expect(canRemoveStep(topic)).toBe(false);
        expect(canMoveStep(topic)).toBe(false);
        const atStart = addStep(journey, 'departure', { kind: 'question' }, 'q', START_OF_PHASE);
        expect(atStart.phases.departure.map((step) => step.id).slice(0, 2)).toEqual(['j1:topic', 'q']);
        expect(addStep(journey, 'flight', { kind: 'question' }, 'q', START_OF_PHASE).phases.flight[0].id).toBe('q');
    });

    it('serves one journey from the registration and from a link at the same time (U25)', () => {
        const u25 = mail({
            routes: { registration: [3], links: [{ id: 'l', name: 'U25', topicIds: [3] }] },
        });
        expect(topicReach([u25], 'AGENCY_COUNSELLING', 3)).toBe('registration');
        expect(routeSummary(u25)).toEqual({ registrationTopics: 1, links: 1, linkTopics: 1 });
    });

    it('lets a journey reached by one-topic links only preselect the topic', () => {
        const linkOnly = mail({ routes: { registration: [], links: [{ id: 'l', name: 'U25', topicIds: [3] }] } });
        expect(canPreselectTopic(linkOnly)).toBe(true);
        const preselected = setTopicPreselected(linkOnly, true);
        expect(isTopicPreselected(preselected)).toBe(true);
        const registered = mail({ routes: { registration: [3], links: [] } });
        expect(setTopicPreselected(registered, true)).toBe(registered);
        const twoTopics = mail({ routes: { registration: [], links: [{ id: 'l', name: 'X', topicIds: [3, 4] }] } });
        expect(canPreselectTopic(twoTopics)).toBe(false);
    });

    it('asks for the topic again once the journey gets a registration route', () => {
        const preselected = setTopicPreselected(
            mail({ routes: { registration: [], links: [{ id: 'l', name: 'U25', topicIds: [3] }] } }),
            true,
        );
        const [withRegistration] = assignRegistrationTopic([preselected], 'j1', 3);
        expect(isTopicPreselected(withRegistration)).toBe(false);
    });
});

describe('a question step asks all its questions at once', () => {
    const twoQuestions = (): Journey => {
        const journey = addStep(mail(), 'departure', { kind: 'question' }, 'q', 'j1:topic');
        const [first] = journey.phases.departure[1].questions ?? [];
        return updateStep(journey, 'departure', 'q', {
            title: { de: 'Ihre Situation' },
            questions: [first, { ...first, id: 'second', label: { de: 'Was drängt gerade?' } }],
        });
    };

    it('splits into one step per question, in place and in order, to ask question by question', () => {
        const split = splitQuestionStep(twoQuestions(), 'departure', 'q', (index) => `q-${index}`);
        const ids = split.phases.departure.map((step) => step.id);
        expect(ids.slice(0, 4)).toEqual(['j1:topic', 'q', 'q-1', 'j1:postcode']);
        expect(split.phases.departure[1].title.de).toBe('Ihre Situation');
        expect(split.phases.departure[2].title.de).toBe('Was drängt gerade?');
        expect(split.phases.departure[2].questions).toHaveLength(1);
    });

    it('leaves a step with one question alone', () => {
        const journey = addStep(mail(), 'departure', { kind: 'question' }, 'q');
        expect(splitQuestionStep(journey, 'departure', 'q', (index) => `q-${index}`)).toBe(journey);
    });
});

describe('sorting answers and questions', () => {
    it('moves an entry one place up or down, and does nothing at the edges', () => {
        expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
        expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
        const list = ['a', 'b'];
        expect(moveItem(list, 0, -1)).toBe(list);
        expect(moveItem(list, 1, 1)).toBe(list);
    });
});

describe('the profile card of a block', () => {
    const names = {
        youth: 'Jugendliche',
        adults: 'Erwachsene',
        parents: 'Eltern',
        relatives: 'Angehörige',
        professionals: 'Fachkräfte',
    };
    const situation = (): JourneyStep => ({
        ...stepOf(mail(), 'postcode'),
        title: { de: 'Ihre Situation' },
        profile: {
            about: 'Fragt nach Gläubigern und Dringendem.',
            goal: 'Dringlichkeit vor der ersten Antwort klären',
            author: 'Schuldnerberatung Köln-Mitte',
            audiences: ['adults'],
            tags: ['Schulden', 'Pfändung'],
        },
    });

    it('adds a keyword once, whatever its case and spaces', () => {
        const profile = addTag(addTag(emptyProfile(), ' Schulden '), 'schulden');
        expect(profile.tags).toEqual(['Schulden']);
        expect(addTag(profile, '   ')).toBe(profile);
    });

    it('is found by title, goal, author, audience and keyword, every word counting', () => {
        const step = situation();
        expect(matchesSearch(step, '', names)).toBe(true);
        expect(matchesSearch(step, 'pfändung', names)).toBe(true);
        expect(matchesSearch(step, 'erwachsene dringlichkeit', names)).toBe(true);
        expect(matchesSearch(step, 'köln situation', names)).toBe(true);
        expect(matchesSearch(step, 'jugendliche', names)).toBe(false);
        expect(matchesSearch(step, 'schulden sucht', names)).toBe(false);
    });
});
