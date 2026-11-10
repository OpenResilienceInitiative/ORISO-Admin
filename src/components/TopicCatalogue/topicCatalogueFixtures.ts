import type { CatalogueTopic } from './index';
import type { TopicLayout } from './topicLayout';

/** The 20 topics of dev (names and short descriptions as the service delivers them). */
export const FIXTURE_TOPICS: CatalogueTopic[] = [
    { id: 1, name: 'Allgemeine Sozialberatung', description: 'Allgemeine Sozialberatung', active: true },
    { id: 2, name: 'Kinder und Jugendliche', description: 'Beratung für Kinder und Jugendliche', active: true },
    {
        id: 3,
        name: '[U25] Suizidprävention',
        description: 'Suizidprävention für Menschen unter 25 Jahren',
        active: true,
    },
    {
        id: 4,
        name: 'Rechtliche Betreuung und Vorsorge',
        description: 'Beratung zu rechtlicher Betreuung und Vorsorgevollmacht',
        active: true,
    },
    { id: 5, name: 'Jungen- und Männerberatung', description: 'Beratung speziell für Jungen und Männer', active: true },
    {
        id: 6,
        name: 'Hospiz- und Palliativberatung',
        description: 'Beratung zu Hospiz- und Palliativversorgung',
        active: true,
    },
    { id: 7, name: 'HIV und Aids', description: 'Beratung zu HIV und Aids', active: true },
    { id: 8, name: 'Kinder- und Jugend-Reha', description: 'Rehabilitation für Kinder und Jugendliche', active: false },
    {
        id: 9,
        name: 'Aus-/Rück- und Weiterwanderung',
        description: 'Beratung zu Aus-, Rück- und Weiterwanderung',
        active: true,
    },
    { id: 10, name: 'Eltern und Familie', description: 'Beratung für Eltern und Familien', active: true },
    {
        id: 11,
        name: 'Behinderung und psychische Beeinträchtigung',
        description: 'Beratung bei Behinderung und psychischen Beeinträchtigungen',
        active: true,
    },
    { id: 12, name: 'Schwangerschaft', description: 'Beratung in Schwangerschaftsfragen', active: true },
    {
        id: 13,
        name: 'Straffälligkeit',
        description: 'Beratung bei Straffälligkeit und rechtlichen Konsequenzen',
        active: true,
    },
    { id: 14, name: 'Schulden', description: 'Beratung bei Schulden und finanziellen Problemen', active: true },
    { id: 15, name: 'Leben im Alter', description: 'Beratung zum Leben im Alter', active: true },
    { id: 16, name: 'Kuren für Mütter und Väter', description: 'Beratung zu Kuren für Mütter und Väter', active: true },
    {
        id: 17,
        name: 'Trauerberatung',
        description: 'Beratung und Begleitung bei Trauer und Verlust',
        active: true,
    },
    { id: 18, name: 'Sucht', description: 'Beratung bei Suchtfragen und Abhängigkeit', active: true },
    {
        id: 19,
        name: 'Übergang von Schule zu Beruf',
        description: 'Beratung zum Übergang von Schule zu Beruf',
        active: false,
    },
    { id: 20, name: 'Migration', description: 'Beratung für Menschen mit Migrationsgeschichte', active: true },
];

/** An example grouping for the design review; the real one is defined by the platform admin. */
export const FIXTURE_LAYOUT: TopicLayout = [
    { id: 'general', name: 'Allgemeine Beratung', topicIds: [1, 14, 4, 13] },
    { id: 'family', name: 'Kinder, Jugend und Familie', topicIds: [2, 3, 10, 12, 8, 19] },
    { id: 'health', name: 'Gesundheit und Leben', topicIds: [18, 11, 7, 6, 17, 15, 16] },
    { id: 'migration', name: 'Migration', topicIds: [20, 9, 5] },
];

export const FIXTURE_LONG_TOPICS: CatalogueTopic[] = [
    {
        id: 1,
        name: 'Rechtliche Betreuung, Vorsorgevollmacht, Patientenverfügung und Betreuungsverfügung',
        description:
            'Beratung zu rechtlicher Betreuung, Vorsorgevollmacht, Patientenverfügung und Betreuungsverfügung für Angehörige und Bevollmächtigte',
        active: true,
    },
    {
        id: 2,
        name: 'Donaudampfschifffahrtsgesellschaftskapitänsberatung',
        description: 'Ein absichtlich sehr langes Wort ohne Leerzeichen, damit der Umbruch geprüft wird',
        active: false,
    },
    { id: 3, name: 'Schulden', description: 'Kurz', active: true },
];

export const FIXTURE_LONG_LAYOUT: TopicLayout = [
    {
        id: 'long',
        name: 'Beratung rund um Recht, Betreuung, Vorsorge und weitere sehr lange Kategorienamen',
        topicIds: [1, 2],
    },
    { id: 'short', name: 'Kurz', topicIds: [3] },
];
