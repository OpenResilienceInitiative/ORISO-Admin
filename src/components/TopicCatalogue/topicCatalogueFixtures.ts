import type { CatalogueLanguage, CatalogueTopic } from './index';
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
    { id: 'general', name: 'Allgemeine Beratung', names: { en: 'General counselling' }, topicIds: [1, 14, 4, 13] },
    // "Schulden" sits in two categories on purpose: a topic may be in several.
    { id: 'family', name: 'Kinder, Jugend und Familie', topicIds: [2, 3, 10, 12, 8, 19, 14] },
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

/** The seven languages of the platform; German is the source. */
export const FIXTURE_LANGUAGES: CatalogueLanguage[] = [
    { code: 'de', label: 'Deutsch' },
    { code: 'de@informal', label: 'Deutsch (du)' },
    { code: 'en', label: 'Englisch' },
    { code: 'fr', label: 'Französisch' },
    { code: 'ru', label: 'Russisch' },
    { code: 'tr', label: 'Türkisch' },
    { code: 'ti', label: 'Tigrinya' },
];

/** A tiny own icon (SVG) so the stories show an uploaded icon next to the standard one. */
export const FIXTURE_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#a5000a" d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/></svg>',
)}`;

const ENGLISH: Record<number, string> = {
    1: 'General social counselling',
    2: 'Children and young people',
    14: 'Debt',
    17: 'Grief counselling',
    18: 'Addiction',
    20: 'Migration',
};

/** The topics of dev with a few translations and two own icons, as the platform admin would leave them. */
export const FIXTURE_TOPICS_I18N: CatalogueTopic[] = FIXTURE_TOPICS.map((topic) => ({
    ...topic,
    names: ENGLISH[topic.id] ? { en: ENGLISH[topic.id], fr: topic.id === 20 ? 'Migration' : '' } : undefined,
    icon: topic.id === 14 || topic.id === 17 ? FIXTURE_ICON : undefined,
}));
