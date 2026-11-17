import { describe, expect, it } from 'vite-plus/test';
import {
    CARITAS_PLATFORM_DEFAULT,
    registrationSteps,
    resolveLinkQuestionnaire,
    resolveTopicQuestionnaire,
    setTopicPostcode,
    setTopicHidden,
    resetTopic,
    visibleTopics,
    type RegistrationSettings,
} from './registrationQuestionnaire';

const topics = [
    { id: 1, name: 'Schwangerschaft' },
    { id: 2, name: 'Sucht' },
    { id: 3, name: 'U25' },
];

const base = (): RegistrationSettings => ({ platformDefault: CARITAS_PLATFORM_DEFAULT, topics: {} });

describe('registration per topic (ADR-035 part C)', () => {
    it('ships the Caritas platform default: postcode on, nothing else', () => {
        expect(CARITAS_PLATFORM_DEFAULT.postcode).toBe(true);
        expect(CARITAS_PLATFORM_DEFAULT.questions).toEqual([]);
    });

    it('lets a topic without its own setting inherit the platform default', () => {
        expect(resolveTopicQuestionnaire(base(), 2)).toEqual({
            source: 'platform',
            questionnaire: CARITAS_PLATFORM_DEFAULT,
        });
    });

    it('switches the postcode off for one topic only', () => {
        const settings = setTopicPostcode(base(), 2, false);
        expect(resolveTopicQuestionnaire(settings, 2).questionnaire.postcode).toBe(false);
        expect(resolveTopicQuestionnaire(settings, 2).source).toBe('topic');
        expect(resolveTopicQuestionnaire(settings, 1).questionnaire.postcode).toBe(true);
    });

    it('returns to the platform default on reset', () => {
        const settings = resetTopic(setTopicPostcode(base(), 2, false), 2);
        expect(resolveTopicQuestionnaire(settings, 2).source).toBe('platform');
    });

    it('hides a topic from the normal registration, e.g. U25 reachable by link only', () => {
        const settings = setTopicHidden(base(), 3, true);
        expect(visibleTopics(topics, settings).map((topic) => topic.id)).toEqual([1, 2]);
        expect(resolveTopicQuestionnaire(settings, 3).questionnaire.postcode).toBe(true);
    });

    it('asks for the postcode and matches the centre, or lists the topic’s centres without it', () => {
        expect(registrationSteps({ postcode: true, questions: [] })).toEqual(['topic', 'postcode', 'account']);
        expect(registrationSteps({ postcode: false, questions: [] })).toEqual(['topic', 'agency', 'account']);
    });

    it('skips the topic step for a link with exactly one topic and puts the choice first otherwise', () => {
        expect(registrationSteps({ postcode: false, questions: [] }, { linkTopicCount: 1 })).toEqual([
            'agency',
            'account',
        ]);
        expect(registrationSteps({ postcode: true, questions: [] }, { linkTopicCount: 2 })[0]).toBe('topic');
    });

    it('adds one step per further question between postcode and account', () => {
        const questionnaire = {
            postcode: true,
            questions: [
                { id: 'age', type: 'single' as const, required: true, label: { de: 'Alter' }, options: [], version: 1 },
            ],
        };
        expect(registrationSteps(questionnaire)).toEqual(['topic', 'postcode', 'question:age', 'account']);
    });
});

describe('secret links: one questionnaire, three visibilities', () => {
    it('uses the link’s own questionnaire first', () => {
        const own = { postcode: false, questions: [] };
        const settings = setTopicPostcode(base(), 3, true);
        expect(resolveLinkQuestionnaire(settings, { questionnaire: own }, 3)).toEqual({
            source: 'link',
            questionnaire: own,
        });
    });

    it('falls back to the topic questionnaire when it is shown in links too', () => {
        const settings = setTopicPostcode(base(), 2, false);
        expect(resolveLinkQuestionnaire(settings, {}, 2)).toEqual({
            source: 'topic',
            questionnaire: { postcode: false, questions: [], visibility: 'officialAndLinks' },
        });
    });

    it('skips a topic questionnaire that is shown in the official registration only', () => {
        let settings = setTopicPostcode(base(), 2, false);
        settings = {
            ...settings,
            topics: { ...settings.topics, 2: { ...settings.topics[2]!, visibility: 'officialOnly' } },
        };
        expect(resolveLinkQuestionnaire(settings, {}, 2).source).toBe('platform');
    });
});
