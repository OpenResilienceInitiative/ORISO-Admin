import type { Question } from './conversationModule';

/**
 * Moment 1 of the question model: registration questions per topic, Mailberatung only
 * (ADR-036 part C). The topic decides; a topic without its own setting inherits the platform
 * default. On Dev the only switchable question is the postcode (decision 16).
 */
export interface Questionnaire {
    postcode: boolean;
    questions: Question[];
}

/** Where a topic questionnaire is shown (decision 17: one questionnaire, three visibilities). */
export type QuestionnaireVisibility = 'officialAndLinks' | 'officialOnly';

export interface TopicQuestionnaire extends Questionnaire {
    visibility: QuestionnaireVisibility;
}

export interface RegistrationSettings {
    platformDefault: Questionnaire;
    topics: Partial<Record<number, TopicQuestionnaire>>;
    /** Topics left out of the normal registration, reachable through a link only (U25). */
    hiddenTopics?: number[];
}

export interface RegistrationTopic {
    id: number;
    name: string;
}

/** A secret link may carry its own questionnaire (visibility "link only"). */
export interface LinkQuestionnaireSource {
    questionnaire?: Questionnaire;
}

export type QuestionnaireSource = 'link' | 'topic' | 'platform';

export const CARITAS_PLATFORM_DEFAULT: Questionnaire = Object.freeze({
    postcode: true,
    questions: [],
}) as Questionnaire;

export const resolveTopicQuestionnaire = (
    settings: RegistrationSettings,
    topicId: number,
): { source: QuestionnaireSource; questionnaire: Questionnaire } => {
    const own = settings.topics[topicId];
    return own
        ? { source: 'topic', questionnaire: own }
        : { source: 'platform', questionnaire: settings.platformDefault };
};

/** Link's own questionnaire ?? the topic's (when it is shown in links) ?? the platform default. */
export const resolveLinkQuestionnaire = (
    settings: RegistrationSettings,
    link: LinkQuestionnaireSource,
    topicId: number,
): { source: QuestionnaireSource; questionnaire: Questionnaire } => {
    if (link.questionnaire) return { source: 'link', questionnaire: link.questionnaire };
    const own = settings.topics[topicId];
    if (own && own.visibility === 'officialAndLinks') return { source: 'topic', questionnaire: own };
    return { source: 'platform', questionnaire: settings.platformDefault };
};

const topicOverride = (settings: RegistrationSettings, topicId: number): TopicQuestionnaire =>
    settings.topics[topicId] ?? {
        postcode: settings.platformDefault.postcode,
        questions: [...settings.platformDefault.questions],
        visibility: 'officialAndLinks',
    };

export const setTopicPostcode = (
    settings: RegistrationSettings,
    topicId: number,
    postcode: boolean,
): RegistrationSettings => ({
    ...settings,
    topics: { ...settings.topics, [topicId]: { ...topicOverride(settings, topicId), postcode } },
});

export const resetTopic = (settings: RegistrationSettings, topicId: number): RegistrationSettings => {
    const topics = { ...settings.topics };
    delete topics[topicId];
    return { ...settings, topics };
};

export const setTopicHidden = (
    settings: RegistrationSettings,
    topicId: number,
    hidden: boolean,
): RegistrationSettings => {
    const others = (settings.hiddenTopics ?? []).filter((id) => id !== topicId);
    return { ...settings, hiddenTopics: hidden ? [...others, topicId] : others };
};

export const visibleTopics = <T extends RegistrationTopic>(topics: T[], settings: RegistrationSettings): T[] =>
    topics.filter((topic) => !(settings.hiddenTopics ?? []).includes(topic.id));

export type RegistrationStep = 'topic' | 'postcode' | 'agency' | 'account' | `question:${string}`;

/**
 * The steps a person walks through. With a postcode the centre is matched from it; without,
 * the person picks from the topic's centres. A link with one topic skips the topic choice.
 */
export const registrationSteps = (
    questionnaire: Questionnaire,
    options: { linkTopicCount?: number } = {},
): RegistrationStep[] => {
    const steps: RegistrationStep[] = [];
    if (options.linkTopicCount !== 1) steps.push('topic');
    steps.push(questionnaire.postcode ? 'postcode' : 'agency');
    questionnaire.questions.forEach((question) => steps.push(`question:${question.id}`));
    steps.push('account');
    return steps;
};
