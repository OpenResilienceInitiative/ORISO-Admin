import {
    CONVERSATION_TYPES,
    MODULE_LANGUAGES,
    MODULE_SOURCE_LANGUAGE,
    type ConversationType,
    type LangMap,
    type Question,
} from '../ConversationModules/conversationModule';

/**
 * Journeys (Frank, 2026-11-18; amends ADR-036 part C).
 *
 * A journey is what one person walks through with one conversation type, in three phases named
 * after a flight:
 *   departure — before and while registering,
 *   flight    — once they are in: the enquiry, the greeting, questions on the way,
 *   arrival   — after the counselling: the follow-up survey.
 * Each phase is an ordered list of steps. A journey is reached over routes: the registration
 * (per topic) or a link of its own. The topics behind the routes are its destinations.
 *
 * Many journeys exist per conversation type and are combined freely with topics. Pure functions
 * only: the editor, its stories and later the save path share them.
 */

export const JOURNEY_PHASES = ['departure', 'flight', 'arrival'] as const;
export type JourneyPhase = (typeof JOURNEY_PHASES)[number];

/** Groups have no departure: nobody registers into a group through a journey. */
const PHASES_BY_TYPE: Record<ConversationType, readonly JourneyPhase[]> = {
    AGENCY_COUNSELLING: JOURNEY_PHASES,
    LIVE_CHAT: JOURNEY_PHASES,
    SELF_HELP: ['flight', 'arrival'],
    INTERNAL_GROUP: ['flight', 'arrival'],
};

export const phasesOf = (type: ConversationType): readonly JourneyPhase[] => PHASES_BY_TYPE[type];

/** Only the registration of Mailberatung is a route; every other entry is a link. */
export const hasRegistrationRoute = (type: ConversationType) => type === 'AGENCY_COUNSELLING';

export const STEP_KINDS = ['core', 'addon', 'question', 'rating', 'panel', 'message'] as const;
export type StepKind = (typeof STEP_KINDS)[number];

/** A chat message needs a chat: before the person is in, there is none. */
export const stepKindsFor = (phase: JourneyPhase): StepKind[] =>
    STEP_KINDS.filter((kind) => phase !== 'departure' || kind !== 'message');

/** Core elements live in the platform code. The editor places and words them, nothing more. */
export const CORE_ELEMENTS = [
    'topic',
    'postcode',
    'agency',
    'username',
    'consent',
    'email',
    'enquiry',
    'agencyGreeting',
    'suggestAlternative',
    'agencySurvey',
] as const;
export type CoreElementId = (typeof CORE_ELEMENTS)[number];

/** Add-ons are programmed building blocks with their own fixed logic, added per installation. */
export const ADDONS = ['age', 'state', 'accountCompletion'] as const;
export type AddonId = (typeof ADDONS)[number];

interface ElementRule {
    phases: readonly JourneyPhase[];
    types: readonly ConversationType[];
    /** Must: stays where it is and cannot be removed. */
    must?: boolean;
    /** Cannot be removed, but may move within its phase. */
    keep?: boolean;
}

const COUNSELLING: readonly ConversationType[] = ['AGENCY_COUNSELLING', 'LIVE_CHAT'];
const MAIL: readonly ConversationType[] = ['AGENCY_COUNSELLING'];
const ALL: readonly ConversationType[] = CONVERSATION_TYPES;

const CORE_RULES: Record<CoreElementId, ElementRule> = {
    // Always first: in the registration the topic picks the journey (Frank, 2026-11-18).
    topic: { phases: ['departure'], types: COUNSELLING, must: true },
    postcode: { phases: ['departure'], types: MAIL },
    // The postcode often finds several centres: the centre is fixed only by this step, or before it
    // by a link or subdomain of its own (Frank, 2026-11-18).
    agency: { phases: ['departure'], types: MAIL, keep: true },
    username: { phases: ['departure'], types: MAIL, must: true },
    consent: { phases: ['departure'], types: COUNSELLING, must: true },
    email: { phases: ['departure', 'flight'], types: MAIL },
    enquiry: { phases: ['flight'], types: MAIL, keep: true },
    // The conversation module of part A, resolved group ?? centre ?? Träger ?? platform.
    agencyGreeting: { phases: ['flight'], types: ALL },
    suggestAlternative: { phases: ['flight'], types: COUNSELLING },
    agencySurvey: { phases: ['arrival'], types: ALL },
};

/**
 * When a question, a rating or a message of the flight or arrival is sent. "manual" is the
 * counsellor's choice in the conversation's menu ("send the survey now", "suggest another service").
 */
export const JOURNEY_TRIGGERS = ['withGreeting', 'afterFirstReply', 'onClose', 'manual'] as const;
export type JourneyTrigger = (typeof JOURNEY_TRIGGERS)[number];

export const triggersFor = (phase: JourneyPhase): JourneyTrigger[] => {
    if (phase === 'flight') return ['withGreeting', 'afterFirstReply', 'manual'];
    if (phase === 'arrival') return ['onClose', 'manual'];
    return [];
};

/** Core elements whose moment is not the editor's to pick. */
export const FIXED_TRIGGERS: Partial<Record<CoreElementId, JourneyTrigger>> = { suggestAlternative: 'manual' };

/**
 * Who edits a journey. Through the normal registration Träger and Beratungsstelle get the
 * platform's journey (chosen by topic) and may change flight and arrival only; a check-in of their
 * own needs a link or subdomain of their own (Frank, 2026-11-18).
 */
export type JourneyLevel = 'platform' | 'tenant' | 'agency';

export const editablePhases = (level: JourneyLevel): readonly JourneyPhase[] =>
    level === 'platform' ? JOURNEY_PHASES : ['flight', 'arrival'];

const ADDON_RULES: Record<AddonId, ElementRule> = {
    age: { phases: ['departure'], types: MAIL },
    state: { phases: ['departure'], types: MAIL },
    accountCompletion: { phases: ['flight'], types: MAIL },
};

export const RATING_TYPES = ['stars', 'range'] as const;
export type RatingType = (typeof RATING_TYPES)[number];

/**
 * Scales an editor picks from instead of typing numbers (Frank, 2026-11-18: number fields only for
 * real numbers such as the age). The default runs from −5 to +5, with 0 labelled "normal".
 */
export const SCALES = {
    minusFiveToFive: { min: -5, max: 5 },
    zeroToTen: { min: 0, max: 10 },
    oneToFive: { min: 1, max: 5 },
} as const;
export type ScaleId = keyof typeof SCALES;

export const scaleOf = (rating: RatingItem): ScaleId | undefined =>
    (Object.keys(SCALES) as ScaleId[]).find((id) => SCALES[id].min === rating.min && SCALES[id].max === rating.max);

export const NORMAL_LABEL: LangMap = { de: 'normal', en: 'normal' };

export const withScale = (rating: RatingItem, scale: ScaleId): RatingItem => ({
    ...rating,
    ...SCALES[scale],
    midLabel: scale === 'minusFiveToFive' ? rating.midLabel ?? { ...NORMAL_LABEL } : undefined,
});

export interface RatingItem {
    id: string;
    type: RatingType;
    label: LangMap;
    min: number;
    max: number;
    minLabel?: LangMap;
    /** The label of the middle of a scale: "normal" at 0 on −5 … +5. */
    midLabel?: LangMap;
    maxLabel?: LangMap;
    required: boolean;
    /** Raised on publish when the meaning changed, so stored answers keep theirs. */
    version: number;
}

/** One entry of an info panel: a title that opens to a text. */
export interface PanelAspect {
    id: string;
    title: LangMap;
    body: LangMap;
    /** Shipped safety content (emergency numbers). Removable; the editor is warned. */
    safety?: boolean;
    prototypeId?: string;
}

/** Who a block is meant for; the library filters by it. */
export const AUDIENCES = ['youth', 'adults', 'parents', 'relatives', 'professionals'] as const;
export type Audience = (typeof AUDIENCES)[number];

/**
 * The profile card of a block, for other editors (not shown to the advice seeker): what it is
 * for, what it should achieve, who made it, for whom, and keywords to find it (Frank, 2026-11-18).
 */
export interface BlockProfile {
    about: string;
    goal: string;
    author: string;
    audiences: Audience[];
    tags: string[];
}

export const emptyProfile = (author = ''): BlockProfile => ({ about: '', goal: '', author, audiences: [], tags: [] });

/** Adds a keyword once, ignoring case and surrounding spaces. */
export const addTag = (profile: BlockProfile, tag: string): BlockProfile => {
    const clean = tag.trim();
    if (!clean || profile.tags.some((existing) => existing.toLowerCase() === clean.toLowerCase())) return profile;
    return { ...profile, tags: [...profile.tags, clean] };
};

export interface JourneyStep {
    id: string;
    kind: StepKind;
    core?: CoreElementId;
    addon?: AddonId;
    title: LangMap;
    /** The line the person reads under the title. */
    description: LangMap;
    /** kind `message`: the chat bubble. */
    body?: LangMap;
    /** kind `question`. */
    questions?: Question[];
    /** kind `rating`. */
    ratings?: RatingItem[];
    /** kind `panel`: a container of aspects. */
    aspects?: PanelAspect[];
    display?: 'open' | 'collapsed';
    /** Flight and arrival: when the step is sent (see `triggersFor`). */
    trigger?: JourneyTrigger;
    /** Languages a machine wrote and nobody has checked yet. */
    machine?: string[];
    /** For other editors: what the block is for, its goal, author, audiences, keywords. */
    profile?: BlockProfile;
    /** "Choose a topic" only: the topic is already set by the link, the screen is skipped. */
    preselected?: boolean;
}

/** A link of its own. Its name is the label an enquiry carries in the inbox. */
export interface JourneyLink {
    id: string;
    name: string;
    topicIds: number[];
    /** Preselected Beratungsstelle; without one the person is matched as in the registration. */
    agencyName?: string;
}

export interface JourneyRoutes {
    /** Topics whose official registration runs this journey. Mailberatung only. */
    registration: number[];
    links: JourneyLink[];
}

export interface Journey {
    id: string;
    /** "Journey #3": stable, shown wherever the journey is referred to. */
    number: number;
    name: string;
    conversationType: ConversationType;
    phases: Record<JourneyPhase, JourneyStep[]>;
    /** Whether the answers of the arrival are stored without the conversation. */
    survey: { anonymous: boolean };
    routes: JourneyRoutes;
}

export interface JourneyTopic {
    id: number;
    name: string;
}

// ---- shipped texts ----------------------------------------------------------------------------

const l = (de: string, en: string): LangMap => ({ de, en });
const p = (de: string, en: string): LangMap => ({ de: `<p>${de}</p>`, en: `<p>${en}</p>` });

const CORE_TEXTS: Record<CoreElementId, { title: LangMap; description: LangMap }> = {
    topic: {
        title: l('Thema wählen', 'Choose a topic'),
        description: l('Worum geht es bei Ihrem Anliegen?', 'What is your concern about?'),
    },
    postcode: {
        title: l('Postleitzahl', 'Postcode'),
        description: l(
            'Damit finden wir eine Beratungsstelle in Ihrer Nähe.',
            'With it we find a counselling centre near you.',
        ),
    },
    agency: {
        title: l('Beratungsstelle wählen', 'Choose a counselling centre'),
        description: l('Wählen Sie eine Beratungsstelle aus der Liste.', 'Choose a counselling centre from the list.'),
    },
    username: {
        title: l('Benutzername und Passwort', 'User name and password'),
        description: l(
            'Damit melden Sie sich später wieder an. Ihr echter Name ist nicht nötig.',
            'You sign in with them later. Your real name is not needed.',
        ),
    },
    consent: {
        title: l('Einwilligung', 'Consent'),
        description: l(
            'Ich habe die Datenschutzerklärung gelesen und bin einverstanden.',
            'I have read the privacy policy and agree.',
        ),
    },
    email: {
        title: l('E-Mail-Adresse', 'E-mail address'),
        description: l(
            'Freiwillig. Wir schreiben Ihnen, sobald eine Antwort da ist.',
            'Optional. We write to you as soon as there is a reply.',
        ),
    },
    enquiry: {
        title: l('Anfrage', 'Enquiry'),
        description: l('Schreiben Sie uns, was Sie beschäftigt.', 'Write to us what is on your mind.'),
    },
    agencyGreeting: {
        title: l('Begrüßung der Beratungsstelle', 'Greeting of the counselling centre'),
        description: l(
            'Die Begrüßung, die die Beratungsstelle eingestellt hat – sonst die des Trägers oder der Plattform.',
            'The greeting the counselling centre set up – otherwise the one of the Träger or the platform.',
        ),
    },
    suggestAlternative: {
        title: l('Alternative Beratung vorschlagen', 'Suggest another service'),
        description: l(
            'Die Beratung schlägt ein anderes Angebot vor, wenn es besser passt.',
            'The counsellor suggests another service when it fits better.',
        ),
    },
    agencySurvey: {
        title: l('Umfrage der Beratungsstelle', 'Survey of the counselling centre'),
        description: l(
            'Die Umfrage, die die Beratungsstelle eingestellt hat – sonst die des Trägers oder der Plattform.',
            'The survey the counselling centre set up – otherwise the one of the Träger or the platform.',
        ),
    },
};

const ADDON_TEXTS: Record<AddonId, { title: LangMap; description: LangMap }> = {
    age: {
        title: l('Alter', 'Age'),
        description: l('Wie alt sind Sie?', 'How old are you?'),
    },
    state: {
        title: l('Bundesland', 'Federal state'),
        description: l('In welchem Bundesland leben Sie?', 'Which federal state do you live in?'),
    },
    accountCompletion: {
        title: l('Konto vervollständigen', 'Complete your account'),
        description: l(
            'Aus dem vorläufigen Zugang wird ein dauerhaftes Konto.',
            'The temporary access becomes a permanent account.',
        ),
    },
};

const coreStep = (prefix: string, core: CoreElementId): JourneyStep => ({
    id: `${prefix}:${core}`,
    kind: 'core',
    core,
    ...structuredClone(CORE_TEXTS[core]),
    ...(FIXED_TRIGGERS[core] ? { trigger: FIXED_TRIGGERS[core] } : {}),
});

const emergencyAspect = (prefix: string): PanelAspect => ({
    id: `${prefix}:emergencyNumbers`,
    prototypeId: 'emergencyNumbers',
    safety: true,
    title: l('In einer akuten Notlage', 'In an acute emergency'),
    body: p(
        'Rund um die Uhr erreichen Sie die Telefonseelsorge unter 0800 111 0 111 oder 0800 111 0 222. Bei Lebensgefahr wählen Sie 112.',
        'Telefonseelsorge is available around the clock on 0800 111 0 111 or 0800 111 0 222. If a life is in danger, call 112.',
    ),
});

/** A survey written into the journey itself, instead of the centre's one (stories, tests). */
export const exampleSurveySteps = (prefix: string): JourneyStep[] => [
    {
        id: `${prefix}:satisfaction`,
        kind: 'rating',
        trigger: 'onClose',
        title: l('Wie war die Beratung für Sie?', 'How was the counselling for you?'),
        description: l(
            'Ihre Antworten helfen uns, besser zu werden. Alles ist freiwillig.',
            'Your answers help us improve. Everything is optional.',
        ),
        ratings: [
            {
                id: 'satisfaction',
                type: 'stars',
                label: l('Wie zufrieden sind Sie insgesamt?', 'How satisfied are you overall?'),
                min: 1,
                max: 5,
                required: false,
                version: 1,
            },
            {
                id: 'mood',
                type: 'range',
                label: l('Wie geht es Ihnen jetzt?', 'How do you feel now?'),
                min: -5,
                max: 5,
                minLabel: l('viel schlechter', 'much worse'),
                midLabel: { ...NORMAL_LABEL },
                maxLabel: l('viel besser', 'much better'),
                required: false,
                version: 1,
            },
        ],
    },
    {
        id: `${prefix}:feedback`,
        kind: 'question',
        trigger: 'onClose',
        title: l('Was hat Ihnen geholfen?', 'What helped you?'),
        description: {},
        questions: [
            {
                id: 'whatHelped',
                type: 'multi',
                required: false,
                label: l('Was war für Sie hilfreich?', 'What was helpful for you?'),
                options: [
                    { id: 'listening', label: l('Dass mir jemand zugehört hat', 'Someone listened to me') },
                    { id: 'information', label: l('Informationen', 'Information') },
                    { id: 'nextSteps', label: l('Nächste Schritte', 'Next steps') },
                ],
                other: true,
                version: 1,
            },
            {
                id: 'comment',
                type: 'text',
                required: false,
                label: l('Möchten Sie uns noch etwas sagen?', 'Is there anything else you would like to tell us?'),
                options: [],
                version: 1,
            },
        ],
    },
];

/** An info panel written into the journey itself (stories, tests). */
export const exampleInfoPanel = (prefix: string): JourneyStep => ({
    id: `${prefix}:generalInfo`,
    kind: 'panel',
    title: l('Allgemeine Infos', 'General information'),
    description: {},
    display: 'collapsed',
    aspects: [
        {
            id: `${prefix}:whoReadsAlong`,
            prototypeId: 'whoReadsAlong',
            title: l('Wer liest Ihre Nachricht?', 'Who reads your message?'),
            body: p(
                'Ihre Nachricht lesen nur die Beraterinnen und Berater dieser Beratungsstelle.',
                'Only the counsellors of this counselling centre read your message.',
            ),
        },
        {
            id: `${prefix}:responseTime`,
            prototypeId: 'responseTime',
            title: l('Wann wir antworten', 'When we reply'),
            body: p(
                'Sie bekommen innerhalb von zwei Werktagen eine Antwort.',
                'You will get a reply within two working days.',
            ),
        },
        emergencyAspect(prefix),
    ],
});

/**
 * What the platform ships. Greeting and survey are the centre's (part A modules, decision 30), so
 * the shipped flight and arrival only place them; a journey may add steps of its own around them.
 */
const STANDARD: Record<ConversationType, (prefix: string) => Record<JourneyPhase, JourneyStep[]>> = {
    AGENCY_COUNSELLING: (prefix) => ({
        departure: (['topic', 'postcode', 'agency', 'username', 'consent', 'email'] as const).map((core) =>
            coreStep(prefix, core),
        ),
        flight: [
            coreStep(prefix, 'enquiry'),
            coreStep(prefix, 'agencyGreeting'),
            coreStep(prefix, 'suggestAlternative'),
        ],
        arrival: [coreStep(prefix, 'agencySurvey')],
    }),
    LIVE_CHAT: (prefix) => ({
        departure: [coreStep(prefix, 'topic'), coreStep(prefix, 'consent')],
        flight: [coreStep(prefix, 'agencyGreeting'), coreStep(prefix, 'suggestAlternative')],
        arrival: [coreStep(prefix, 'agencySurvey')],
    }),
    SELF_HELP: (prefix) => ({
        departure: [],
        flight: [coreStep(prefix, 'agencyGreeting')],
        arrival: [coreStep(prefix, 'agencySurvey')],
    }),
    INTERNAL_GROUP: () => ({ departure: [], flight: [], arrival: [] }),
};

/** A fresh copy of the journey the platform ships for a conversation type. */
export const standardJourney = (conversationType: ConversationType, id: string, number: number): Journey => ({
    id,
    number,
    name: '',
    conversationType,
    phases: STANDARD[conversationType](id),
    survey: { anonymous: true },
    routes: { registration: [], links: [] },
});

/**
 * What an installation starts with: one journey per conversation type. The one of Mailberatung
 * routes every topic through the registration, which is how registration behaves today.
 */
export const shippedJourneys = (topics: JourneyTopic[]): Journey[] =>
    CONVERSATION_TYPES.map((type) => ({
        ...standardJourney(type, `standard-${type}`, 1),
        name: 'Standard',
        routes: { registration: hasRegistrationRoute(type) ? topics.map((topic) => topic.id) : [], links: [] },
    }));

// ---- steps ------------------------------------------------------------------------------------

const ruleOf = (step: JourneyStep): ElementRule | undefined => {
    if (step.kind === 'core' && step.core) return CORE_RULES[step.core];
    if (step.kind === 'addon' && step.addon) return ADDON_RULES[step.addon];
    return undefined;
};

/** Must steps carry the red mark: they stay where they are. */
export const isMustStep = (step: JourneyStep) => ruleOf(step)?.must === true;
export const canMoveStep = (step: JourneyStep) => !isMustStep(step);
export const canRemoveStep = (step: JourneyStep) => {
    const rule = ruleOf(step);
    return !rule?.must && !rule?.keep;
};

const withPhase = (journey: Journey, phase: JourneyPhase, steps: JourneyStep[]): Journey => ({
    ...journey,
    phases: { ...journey.phases, [phase]: steps },
});

/**
 * Puts a step at `toIndex` of its phase. Must steps do not move, and because only the other steps
 * move, the must steps always keep their order among themselves.
 */
/** Nothing goes before "choose a topic": in the registration the topic picks the journey. */
export const firstFreeIndex = (steps: JourneyStep[]) => (steps[0]?.core === 'topic' ? 1 : 0);

export const moveStep = (journey: Journey, phase: JourneyPhase, stepId: string, toIndex: number): Journey => {
    const steps = journey.phases[phase];
    const from = steps.findIndex((step) => step.id === stepId);
    if (from < 0 || !canMoveStep(steps[from])) return journey;
    const target = Math.max(firstFreeIndex(steps), Math.min(steps.length - 1, toIndex));
    if (target === from) return journey;
    const next = [...steps];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    return withPhase(journey, phase, next);
};

export const removeStep = (journey: Journey, phase: JourneyPhase, stepId: string): Journey => {
    const step = journey.phases[phase].find((candidate) => candidate.id === stepId);
    if (!step || !canRemoveStep(step)) return journey;
    return withPhase(
        journey,
        phase,
        journey.phases[phase].filter((candidate) => candidate.id !== stepId),
    );
};

export const updateStep = (
    journey: Journey,
    phase: JourneyPhase,
    stepId: string,
    patch: Partial<Omit<JourneyStep, 'id'>>,
): Journey =>
    withPhase(
        journey,
        phase,
        journey.phases[phase].map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
    );

export interface ElementChoice<Id extends string> {
    id: Id;
    used: boolean;
    usedIn?: JourneyPhase;
    /** Funktionszugriff decides whether a building block may be used at all (decision 31). */
    allowed: boolean;
}

const choices = <Id extends string>(
    journey: Journey,
    phase: JourneyPhase,
    rules: Record<Id, ElementRule>,
    field: 'core' | 'addon',
    blocked: readonly string[],
): ElementChoice<Id>[] =>
    (Object.keys(rules) as Id[])
        .filter((id) => rules[id].phases.includes(phase) && rules[id].types.includes(journey.conversationType))
        .map((id) => {
            const usedIn = JOURNEY_PHASES.find((candidate) =>
                journey.phases[candidate].some((step) => step[field] === id),
            );
            return { id, used: usedIn !== undefined, usedIn, allowed: !blocked.includes(id) };
        });

/**
 * The core elements this phase may hold, whether the journey already uses each of them, and whether
 * Funktionszugriff allows them (`blocked` lists the ones it switched off).
 */
export const coreChoices = (
    journey: Journey,
    phase: JourneyPhase,
    blocked: readonly CoreElementId[] = [],
): ElementChoice<CoreElementId>[] => choices(journey, phase, CORE_RULES, 'core', blocked);

export const addonChoices = (
    journey: Journey,
    phase: JourneyPhase,
    blocked: readonly AddonId[] = [],
): ElementChoice<AddonId>[] => choices(journey, phase, ADDON_RULES, 'addon', blocked);

/** A step whose building block Funktionszugriff switched off: it stays in the journey and is skipped. */
export const isSkipped = (step: JourneyStep, blocked: readonly string[]) =>
    (step.core !== undefined && blocked.includes(step.core)) ||
    (step.addon !== undefined && blocked.includes(step.addon));

/** `afterStepId` for a new step at the start of a phase (after "choose a topic", if there is one). */
export const START_OF_PHASE = '^start';

export type NewStep =
    | { kind: 'core'; core: CoreElementId }
    | { kind: 'addon'; addon: AddonId }
    | { kind: 'question' | 'rating' | 'panel' | 'message' };

const blankStep = (draft: NewStep, phase: JourneyPhase, id: string): JourneyStep => {
    switch (draft.kind) {
        case 'core':
            return { ...coreStep(id, draft.core), id };
        case 'addon':
            return { id, kind: 'addon', addon: draft.addon, ...structuredClone(ADDON_TEXTS[draft.addon]) };
        case 'question':
            return {
                id,
                kind: 'question',
                title: {},
                description: {},
                trigger: triggersFor(phase)[0],
                questions: [
                    {
                        id: `${id}-1`,
                        type: 'single',
                        display: 'radio',
                        required: false,
                        label: l('Neue Frage', 'New question'),
                        options: [
                            { id: 'option1', label: l('Antwort 1', 'Answer 1') },
                            { id: 'option2', label: l('Antwort 2', 'Answer 2') },
                        ],
                        version: 1,
                    },
                ],
            };
        case 'rating':
            return {
                id,
                kind: 'rating',
                title: {},
                description: {},
                trigger: triggersFor(phase)[0],
                ratings: [
                    {
                        id: `${id}-1`,
                        type: 'range',
                        label: l('Neue Bewertung', 'New rating'),
                        ...SCALES.minusFiveToFive,
                        midLabel: { ...NORMAL_LABEL },
                        required: false,
                        version: 1,
                    },
                ],
            };
        case 'panel':
            return {
                id,
                kind: 'panel',
                title: {},
                description: {},
                display: 'collapsed',
                aspects: [{ id: `${id}-1`, title: {}, body: {} }],
            };
        default:
            return { id, kind: 'message', title: {}, description: {}, body: {} };
    }
};

/**
 * Adds a step at the end of a phase, or right below `afterStepId`. A core element or add-on the
 * journey already uses, or one this phase does not know, is not added.
 */
export const addStep = (
    journey: Journey,
    phase: JourneyPhase,
    draft: NewStep,
    id: string,
    afterStepId?: string,
    blocked: readonly string[] = [],
): Journey => {
    if (draft.kind === 'core') {
        const choice = coreChoices(journey, phase, blocked as CoreElementId[]).find((entry) => entry.id === draft.core);
        if (!choice || choice.used || !choice.allowed) return journey;
    }
    if (draft.kind === 'addon') {
        const choice = addonChoices(journey, phase, blocked as AddonId[]).find((entry) => entry.id === draft.addon);
        if (!choice || choice.used || !choice.allowed) return journey;
    }
    const steps = [...journey.phases[phase]];
    let at = steps.length;
    if (afterStepId === START_OF_PHASE) at = firstFreeIndex(steps);
    else if (afterStepId) {
        const after = steps.findIndex((step) => step.id === afterStepId);
        if (after >= 0) at = after + 1;
    }
    steps.splice(at, 0, blankStep(draft, phase, id));
    return withPhase(journey, phase, steps);
};

/**
 * All questions of a step come together: on one screen in the check-in, as one message on board
 * and at arrival. To ask question by question, the step is split: one step per question, in
 * order, each named after its question, with the same trigger.
 */
export const splitQuestionStep = (
    journey: Journey,
    phase: JourneyPhase,
    stepId: string,
    idFor: (index: number) => string,
): Journey => {
    const steps = journey.phases[phase];
    const index = steps.findIndex((step) => step.id === stepId);
    const step = steps[index];
    if (!step || step.kind !== 'question' || (step.questions?.length ?? 0) < 2) return journey;
    const parts: JourneyStep[] = (step.questions ?? []).map((question, position) => ({
        ...structuredClone(step),
        id: position === 0 ? step.id : idFor(position),
        title: position === 0 ? structuredClone(step.title) : structuredClone(question.label),
        description: position === 0 ? structuredClone(step.description) : {},
        questions: [structuredClone(question)],
    }));
    return withPhase(journey, phase, [...steps.slice(0, index), ...parts, ...steps.slice(index + 1)]);
};

/** Without a postcode step the person picks the Beratungsstelle from the topic's list. */
export const picksAgencyFromList = (journey: Journey) =>
    journey.conversationType === 'AGENCY_COUNSELLING' &&
    !journey.phases.departure.some((step) => step.core === 'postcode');

/** What a step holds, for the one-line summary on its card. */
export const stepContentCount = (step: JourneyStep) => ({
    questions: step.questions?.filter((question) => question.type !== 'hint').length ?? 0,
    ratings: step.ratings?.length ?? 0,
    aspects: step.aspects?.length ?? 0,
});

// ---- translation ------------------------------------------------------------------------------

/** Every text of a step that the person reads, as references into the step. */
const textsOf = (step: JourneyStep): LangMap[] => [
    step.title,
    step.description,
    ...(step.body ? [step.body] : []),
    ...(step.questions ?? []).flatMap((question) => [
        question.label,
        ...(question.help ? [question.help] : []),
        ...question.options.map((option) => option.label),
    ]),
    ...(step.ratings ?? []).flatMap((rating) => [
        rating.label,
        ...(rating.minLabel ? [rating.minLabel] : []),
        ...(rating.midLabel ? [rating.midLabel] : []),
        ...(rating.maxLabel ? [rating.maxLabel] : []),
    ]),
    ...(step.aspects ?? []).flatMap((aspect) => [aspect.title, aspect.body]),
];

const hasText = (value: string | undefined) => !!value && value.replace(/<[^>]*>/g, '').trim() !== '';

export interface TranslationStatus {
    /** Languages in which every text of the step exists. */
    translated: string[];
    /** The translated languages a machine wrote and nobody has checked yet. */
    machine: string[];
    missing: string[];
}

/**
 * A language counts as translated once every text written in the source language also exists in
 * it. A step without any text is "translated" in no language.
 */
export const translationStatus = (step: JourneyStep): TranslationStatus => {
    const written = textsOf(step).filter((text) => hasText(text[MODULE_SOURCE_LANGUAGE]));
    const translated = MODULE_LANGUAGES.filter(
        (language) => written.length > 0 && written.every((text) => hasText(text[language])),
    );
    return {
        translated,
        machine: translated.filter((language) => step.machine?.includes(language)),
        missing: MODULE_LANGUAGES.filter((language) => !translated.includes(language)),
    };
};

/**
 * Fills every missing text from the source language and marks those languages as machine-made.
 * Texts a person already wrote stay untouched.
 */
export const translateMissing = (
    step: JourneyStep,
    translate: (text: string, language: string) => string,
): JourneyStep => {
    const next = structuredClone(step);
    const { missing } = translationStatus(next);
    textsOf(next).forEach((text) => {
        const source = text[MODULE_SOURCE_LANGUAGE];
        if (!hasText(source)) return;
        missing.forEach((language) => {
            // eslint-disable-next-line no-param-reassign -- `next` is our own deep copy
            if (!hasText(text[language])) text[language] = translate(source as string, language);
        });
    });
    next.machine = [...new Set([...(next.machine ?? []), ...missing])];
    return next;
};

export type LanguageState = 'source' | 'checked' | 'machine' | 'missing';

/** Every language of a step with its state, in the order of the language menu. */
export const languageStates = (step: JourneyStep): { language: string; state: LanguageState }[] => {
    const { translated, machine } = translationStatus(step);
    return MODULE_LANGUAGES.map((language) => {
        let state: LanguageState = 'missing';
        if (language === MODULE_SOURCE_LANGUAGE && translated.includes(language)) state = 'source';
        else if (machine.includes(language)) state = 'machine';
        else if (translated.includes(language)) state = 'checked';
        return { language, state };
    });
};

/** A person read the machine translation of one language and confirms it. */
export const markChecked = (step: JourneyStep, language: string): JourneyStep => ({
    ...step,
    machine: (step.machine ?? []).filter((code) => code !== language),
});

/** Moves one entry of a list by one place; a no-op at the edges. */
export const moveItem = <T>(items: T[], index: number, direction: -1 | 1): T[] => {
    const target = index + direction;
    if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
};

/**
 * Whether a block matches a search: every word must occur in its title, its profile (about, goal,
 * author), its audiences or its keywords. For the block library to come.
 */
export const matchesSearch = (step: JourneyStep, query: string, audienceNames: Record<Audience, string>) => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return true;
    const { profile } = step;
    const haystack = [
        ...Object.values(step.title),
        profile?.about,
        profile?.goal,
        profile?.author,
        ...(profile?.audiences ?? []).map((audience) => audienceNames[audience]),
        ...(profile?.tags ?? []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return words.every((word) => haystack.includes(word));
};

/**
 * "Choose a topic" may be preselected only where the topic is clear before the person arrives: a
 * journey reached by links alone, each with exactly one topic. The registration always asks.
 */
export const canPreselectTopic = (journey: Journey) =>
    journey.routes.registration.length === 0 && journey.routes.links.every((link) => link.topicIds.length <= 1);

/** The preselection counts only while it is allowed; a route added later makes the screen ask again. */
export const isTopicPreselected = (journey: Journey) =>
    canPreselectTopic(journey) && journey.phases.departure.some((step) => step.core === 'topic' && step.preselected);

export const setTopicPreselected = (journey: Journey, preselected: boolean): Journey => {
    if (preselected && !canPreselectTopic(journey)) return journey;
    return withPhase(
        journey,
        'departure',
        journey.phases.departure.map((step) => (step.core === 'topic' ? { ...step, preselected } : step)),
    );
};

// ---- routes and destinations ------------------------------------------------------------------

export const routeSummary = (journey: Journey) => ({
    registrationTopics: journey.routes.registration.length,
    links: journey.routes.links.length,
    linkTopics: new Set(journey.routes.links.flatMap((link) => link.topicIds)).size,
});

const destinationsOf = (journey: Journey): number[] => [
    ...journey.routes.registration,
    ...journey.routes.links.flatMap((link) => link.topicIds),
];

export const journeysOf = (journeys: Journey[], type: ConversationType) =>
    journeys.filter((journey) => journey.conversationType === type);

/** The two numbers on a conversation type's tile. */
export const typeSummary = (journeys: Journey[], type: ConversationType) => {
    const own = journeysOf(journeys, type);
    return { journeys: own.length, destinations: new Set(own.flatMap(destinationsOf)).size };
};

export type TopicReach = 'registration' | 'linkOnly' | 'none';

/**
 * How a topic is reached with one conversation type. This replaces a visibility switch on the
 * topic: a topic is in the registration because a journey routes it there.
 */
export const topicReach = (journeys: Journey[], type: ConversationType, topicId: number): TopicReach => {
    const own = journeysOf(journeys, type);
    if (own.some((journey) => journey.routes.registration.includes(topicId))) return 'registration';
    if (own.some((journey) => journey.routes.links.some((link) => link.topicIds.includes(topicId)))) {
        return 'linkOnly';
    }
    return 'none';
};

export const topicsWithoutRoute = <T extends JourneyTopic>(
    journeys: Journey[],
    type: ConversationType,
    topics: T[],
): T[] => topics.filter((topic) => topicReach(journeys, type, topic.id) === 'none');

/** The journey whose registration shows this topic, if any. */
export const registrationJourneyOf = (journeys: Journey[], type: ConversationType, topicId: number) =>
    journeysOf(journeys, type).find((journey) => journey.routes.registration.includes(topicId));

const withRegistration = (journey: Journey, registration: number[]): Journey => ({
    ...journey,
    routes: { ...journey.routes, registration },
});

/**
 * Routes a topic's registration to one journey. The registration of a topic runs exactly one
 * journey, so the topic leaves every other journey of the same conversation type.
 */
export const assignRegistrationTopic = (journeys: Journey[], journeyId: string, topicId: number): Journey[] => {
    const target = journeys.find((journey) => journey.id === journeyId);
    if (!target) return journeys;
    return journeys.map((journey) => {
        if (journey.conversationType !== target.conversationType) return journey;
        const others = journey.routes.registration.filter((id) => id !== topicId);
        if (journey.id === journeyId) return withRegistration(journey, [...others, topicId]);
        return others.length === journey.routes.registration.length ? journey : withRegistration(journey, others);
    });
};

export const unassignRegistrationTopic = (journeys: Journey[], journeyId: string, topicId: number): Journey[] =>
    journeys.map((journey) =>
        journey.id === journeyId
            ? withRegistration(
                  journey,
                  journey.routes.registration.filter((id) => id !== topicId),
              )
            : journey,
    );

/** The registration as a route, named by its path. Live chat may get one later. */
export const registrationRoute = (type: ConversationType): { path: string; available: boolean } | undefined => {
    if (type === 'AGENCY_COUNSELLING') return { path: '/registrierung', available: true };
    if (type === 'LIVE_CHAT') return { path: '/live-registrierung', available: false };
    return undefined;
};

const slugOf = (name: string) =>
    name
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

/**
 * The readable path of a link, from its name. Two links with the same name get a number. The
 * secret part of the address is a token the server adds; this path only tells people apart.
 */
export const linkPath = (link: JourneyLink, allLinks: JourneyLink[]): string => {
    const base = (candidate: JourneyLink) => slugOf(candidate.name) || `link-${allLinks.indexOf(candidate) + 1}`;
    const own = base(link);
    const before = allLinks.slice(0, allLinks.indexOf(link)).filter((candidate) => base(candidate) === own).length;
    return `/l/${before === 0 ? own : `${own}-${before + 1}`}`;
};

/** A new link that leads to one topic, named after it. */
export const addLinkForTopic = (journey: Journey, topic: JourneyTopic, id: string): Journey => ({
    ...journey,
    routes: { ...journey.routes, links: [...journey.routes.links, { id, name: topic.name, topicIds: [topic.id] }] },
});

/** The topics a journey leads to, each once: those of the registration first, then those behind links. */
export const coveredTopics = (journey: Journey): { topicId: number; via: 'registration' | 'link' }[] => {
    const seen = new Set<number>();
    const covered: { topicId: number; via: 'registration' | 'link' }[] = [];
    journey.routes.registration.forEach((topicId) => {
        if (!seen.has(topicId)) covered.push({ topicId, via: 'registration' });
        seen.add(topicId);
    });
    journey.routes.links.forEach((link) =>
        link.topicIds.forEach((topicId) => {
            if (!seen.has(topicId)) covered.push({ topicId, via: 'link' });
            seen.add(topicId);
        }),
    );
    return covered;
};

/** All links of one conversation type, for paths that must not repeat. */
export const linksOf = (journeys: Journey[], type: ConversationType): JourneyLink[] =>
    journeysOf(journeys, type).flatMap((journey) => journey.routes.links);

// ---- journeys ---------------------------------------------------------------------------------

const nextNumber = (journeys: Journey[], type: ConversationType) =>
    Math.max(0, ...journeysOf(journeys, type).map((journey) => journey.number)) + 1;

/** A new journey starts as a copy of the shipped one and is reached by nothing yet. */
export const newJourney = (journeys: Journey[], type: ConversationType, id: string): Journey =>
    standardJourney(type, id, nextNumber(journeys, type));

/** Copies the steps of a journey. Routes are not copied: a topic or link leads to one journey. */
export const duplicateJourney = (journeys: Journey[], sourceId: string, id: string): Journey | undefined => {
    const source = journeys.find((journey) => journey.id === sourceId);
    if (!source) return undefined;
    return {
        ...structuredClone(source),
        id,
        number: nextNumber(journeys, source.conversationType),
        routes: { registration: [], links: [] },
    };
};

// ---- safety and publishing --------------------------------------------------------------------

const NEEDS_SAFETY: readonly ConversationType[] = ['AGENCY_COUNSELLING', 'LIVE_CHAT', 'SELF_HELP'];

/**
 * The emergency numbers, when the flight no longer shows them. They come with the centre's greeting
 * (whose module warns on its own, ADR-036 decision 6) or with an info panel of the journey. The
 * editor may drop both and is warned, not blocked.
 */
export const missingSafetyAspects = (journey: Journey): PanelAspect[] => {
    if (!NEEDS_SAFETY.includes(journey.conversationType)) return [];
    const { flight } = journey.phases;
    if (flight.some((step) => step.core === 'agencyGreeting')) return [];
    if (flight.some((step) => step.aspects?.some((aspect) => aspect.safety))) return [];
    return [emergencyAspect(journey.id)];
};

const questionMeaning = (question: Question) =>
    JSON.stringify([question.type, question.label, question.options, question.required, question.other ?? false]);
const ratingMeaning = (rating: RatingItem) =>
    JSON.stringify([
        rating.type,
        rating.label,
        rating.min,
        rating.max,
        rating.minLabel,
        rating.midLabel,
        rating.maxLabel,
    ]);

/** Raises the version of every question and rating whose meaning differs from the stored journey. */
export const prepareJourneyForPublish = (edited: Journey, stored: Journey): Journey => {
    const before = new Map<string, JourneyStep>();
    JOURNEY_PHASES.forEach((phase) => stored.phases[phase].forEach((step) => before.set(step.id, step)));

    const publishStep = (step: JourneyStep): JourneyStep => {
        const old = before.get(step.id);
        if (!old) return step;
        return {
            ...step,
            questions: step.questions?.map((question) => {
                const was = old.questions?.find((candidate) => candidate.id === question.id);
                if (!was || questionMeaning(was) === questionMeaning(question)) return question;
                return { ...question, version: was.version + 1 };
            }),
            ratings: step.ratings?.map((rating) => {
                const was = old.ratings?.find((candidate) => candidate.id === rating.id);
                if (!was || ratingMeaning(was) === ratingMeaning(rating)) return rating;
                return { ...rating, version: was.version + 1 };
            }),
        };
    };

    return {
        ...edited,
        phases: {
            departure: edited.phases.departure.map(publishStep),
            flight: edited.phases.flight.map(publishStep),
            arrival: edited.phases.arrival.map(publishStep),
        },
    };
};
