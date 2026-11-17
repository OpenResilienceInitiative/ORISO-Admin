/**
 * Conversation modules (ADR-035 part A) and the shared question model (part B).
 *
 * A module is the ordered list of sections a person sees when a conversation of one type
 * starts (field "greeting", which may contain question blocks for moment 2) and when it ends
 * (field "closingQuestions", the follow-up survey, moment 3). Every level — platform, Träger,
 * Beratungsstelle, a single conversation — stores a whole module; the nearest one wins.
 *
 * Pure functions only: the configurator, its stories and later the save path share them.
 */

export const CONVERSATION_TYPES = ['AGENCY_COUNSELLING', 'LIVE_CHAT', 'SELF_HELP', 'INTERNAL_GROUP'] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export const MODULE_FIELDS = ['greeting', 'closingQuestions'] as const;
export type ModuleField = (typeof MODULE_FIELDS)[number];

export const SECTION_KINDS = ['message', 'panel', 'fixed', 'questions'] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export const FIXED_MODULES = ['email', 'consent', 'accountCompletion'] as const;
export type FixedModuleId = (typeof FIXED_MODULES)[number];

export const QUESTION_TYPES = ['text', 'single', 'multi', 'hint'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Moment-2 triggers are the platform's (decision 7); the editor only picks one. */
export const QUESTION_TRIGGERS = ['withGreeting', 'afterFirstReply'] as const;
export type QuestionTrigger = (typeof QUESTION_TRIGGERS)[number];

export const MODULE_LANGUAGES = ['de', 'de@informal', 'en', 'fr', 'ru', 'ti', 'tr'] as const;
export const MODULE_SOURCE_LANGUAGE = 'de';

/** Language code → text (HTML for messages and panels, plain text for labels). */
export type LangMap = Partial<Record<string, string>>;

export interface QuestionOption {
    id: string;
    label: LangMap;
}

export interface Question {
    id: string;
    type: QuestionType;
    /** Only for `single`: radio buttons or a dropdown ("select field"). Same question, other look. */
    display?: 'radio' | 'dropdown';
    required: boolean;
    label: LangMap;
    help?: LangMap;
    options: QuestionOption[];
    /** Raised on publish when the meaning changed, so stored answers keep theirs. */
    version: number;
}

export interface ModuleSection {
    id: string;
    kind: SectionKind;
    field: ModuleField;
    title: LangMap;
    display: 'open' | 'collapsed';
    body: LangMap;
    fixed?: FixedModuleId;
    questions?: Question[];
    trigger?: QuestionTrigger;
    /** Shipped safety content (emergency numbers). Deletable; the editor is warned (decision 6). */
    safety?: boolean;
    /** Which prototype section this one started from; drives "reset" and the safety warning. */
    prototypeId?: string;
}

export interface ConversationModule {
    version: 2;
    conversationType: ConversationType;
    sections: ModuleSection[];
    /** Survey setting chosen by whoever configures it (Frank, 2026-11-17). */
    survey?: { anonymous: boolean };
}

export type ModuleLevel = 'conversation' | 'agency' | 'tenant' | 'platform' | 'prototype';
const LEVEL_ORDER: Exclude<ModuleLevel, 'prototype'>[] = ['conversation', 'agency', 'tenant', 'platform'];

// ---- prototypes -------------------------------------------------------------------------------

const p = (de: string, en: string): LangMap => ({ de: `<p>${de}</p>`, en: `<p>${en}</p>` });
const l = (de: string, en: string): LangMap => ({ de, en });

const option = (id: string, de: string, en: string): QuestionOption => ({ id, label: l(de, en) });

const surveySection = (type: ConversationType): ModuleSection => ({
    id: `${type}:survey`,
    prototypeId: 'survey',
    kind: 'questions',
    field: 'closingQuestions',
    title: l('Wie war die Beratung für Sie?', 'How was the counselling for you?'),
    display: 'open',
    body: p(
        'Ihre Antworten helfen uns, besser zu werden. Alle Fragen sind freiwillig.',
        'Your answers help us improve. All questions are optional.',
    ),
    questions: [
        {
            id: 'helped',
            type: 'single',
            display: 'radio',
            required: false,
            label: l('Hat Ihnen die Beratung geholfen?', 'Did the counselling help you?'),
            options: [option('yes', 'Ja', 'Yes'), option('partly', 'Teilweise', 'Partly'), option('no', 'Nein', 'No')],
            version: 1,
        },
        {
            id: 'whatHelped',
            type: 'multi',
            required: false,
            label: l('Was war für Sie hilfreich?', 'What was helpful for you?'),
            options: [
                option('listening', 'Dass mir jemand zugehört hat', 'Someone listened to me'),
                option('information', 'Informationen', 'Information'),
                option('nextSteps', 'Nächste Schritte', 'Next steps'),
            ],
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
});

const emergencySection = (type: ConversationType): ModuleSection => ({
    id: `${type}:emergencyNumbers`,
    prototypeId: 'emergencyNumbers',
    kind: 'panel',
    field: 'greeting',
    safety: true,
    title: l('In einer akuten Notlage', 'In an acute emergency'),
    display: 'open',
    body: p(
        'Rund um die Uhr erreichen Sie die Telefonseelsorge unter 0800 111 0 111 oder 0800 111 0 222. Bei Lebensgefahr wählen Sie 112.',
        'Telefonseelsorge is available around the clock on 0800 111 0 111 or 0800 111 0 222. If a life is in danger, call 112.',
    ),
});

const PROTOTYPES: Record<ConversationType, () => ModuleSection[]> = {
    AGENCY_COUNSELLING: () => [
        {
            id: 'AGENCY_COUNSELLING:greeting',
            prototypeId: 'greeting',
            kind: 'message',
            field: 'greeting',
            title: l('Begrüßung', 'Greeting'),
            display: 'open',
            body: p(
                'Schön, dass Sie sich gemeldet haben. Ihre Nachricht ist bei uns angekommen.',
                'Thank you for getting in touch. Your message has reached us.',
            ),
        },
        {
            id: 'AGENCY_COUNSELLING:whoReadsAlong',
            prototypeId: 'whoReadsAlong',
            kind: 'panel',
            field: 'greeting',
            title: l('Wer liest Ihre Nachricht?', 'Who reads your message?'),
            display: 'collapsed',
            body: p(
                'Ihre Nachricht lesen nur die Beraterinnen und Berater dieser Beratungsstelle.',
                'Only the counsellors of this counselling centre read your message.',
            ),
        },
        {
            id: 'AGENCY_COUNSELLING:responseTime',
            prototypeId: 'responseTime',
            kind: 'message',
            field: 'greeting',
            title: l('Wann wir antworten', 'When we reply'),
            display: 'open',
            body: p(
                'Sie bekommen innerhalb von zwei Werktagen eine Antwort.',
                'You will get a reply within two working days.',
            ),
        },
        emergencySection('AGENCY_COUNSELLING'),
        {
            id: 'AGENCY_COUNSELLING:email',
            prototypeId: 'email',
            kind: 'fixed',
            field: 'greeting',
            fixed: 'email',
            title: l('Benachrichtigung per E-Mail', 'E-mail notification'),
            display: 'open',
            body: {},
        },
        {
            id: 'AGENCY_COUNSELLING:closing',
            prototypeId: 'closing',
            kind: 'message',
            field: 'greeting',
            title: l('Abschluss', 'Closing'),
            display: 'open',
            body: p('Bis bald – wir melden uns bei Ihnen.', 'See you soon – we will get back to you.'),
        },
        surveySection('AGENCY_COUNSELLING'),
    ],
    LIVE_CHAT: () => [
        {
            id: 'LIVE_CHAT:greeting',
            prototypeId: 'greeting',
            kind: 'message',
            field: 'greeting',
            title: l('Begrüßung', 'Greeting'),
            display: 'open',
            body: p(
                'Willkommen im Live-Chat. Gleich ist eine Beraterin oder ein Berater für Sie da.',
                'Welcome to the live chat. A counsellor will be with you shortly.',
            ),
        },
        {
            id: 'LIVE_CHAT:consent',
            prototypeId: 'consent',
            kind: 'fixed',
            field: 'greeting',
            fixed: 'consent',
            title: l('Einwilligung', 'Consent'),
            display: 'open',
            body: {},
        },
        emergencySection('LIVE_CHAT'),
        surveySection('LIVE_CHAT'),
    ],
    SELF_HELP: () => [
        {
            id: 'SELF_HELP:welcome',
            prototypeId: 'welcome',
            kind: 'message',
            field: 'greeting',
            title: l('Willkommen in der Gruppe', 'Welcome to the group'),
            display: 'open',
            body: p(
                'Schön, dass Sie dabei sind. Stellen Sie sich gern kurz vor.',
                'Glad you are here. Feel free to introduce yourself.',
            ),
        },
        {
            id: 'SELF_HELP:rules',
            prototypeId: 'rules',
            kind: 'panel',
            field: 'greeting',
            title: l('Regeln der Gruppe', 'Group rules'),
            display: 'collapsed',
            body: p(
                'Was hier gesagt wird, bleibt in der Gruppe. Wir gehen respektvoll miteinander um.',
                'What is said here stays in the group. We treat each other with respect.',
            ),
        },
        surveySection('SELF_HELP'),
    ],
    INTERNAL_GROUP: () => [],
};

/** A fresh, deep copy of the shipped prototype for one conversation type. */
export const prototypeFor = (conversationType: ConversationType): ConversationModule =>
    structuredClone({
        version: 2,
        conversationType,
        sections: PROTOTYPES[conversationType](),
        survey: { anonymous: true },
    });

// ---- section list -----------------------------------------------------------------------------

export const sectionsOf = (module: ConversationModule, field: ModuleField): ModuleSection[] =>
    module.sections.filter((section) => section.field === field);

/** Moves a section one place within its own field; a no-op at the edges. */
export const moveSection = (module: ConversationModule, id: string, direction: -1 | 1): ConversationModule => {
    const section = module.sections.find((candidate) => candidate.id === id);
    if (!section) return module;
    const sameField = sectionsOf(module, section.field);
    const position = sameField.indexOf(section);
    const neighbour = sameField[position + direction];
    if (!neighbour) return module;
    const sections = [...module.sections];
    const from = sections.indexOf(section);
    const to = sections.indexOf(neighbour);
    [sections[from], sections[to]] = [sections[to], sections[from]];
    return { ...module, sections };
};

export const removeSection = (module: ConversationModule, id: string): ConversationModule => ({
    ...module,
    sections: module.sections.filter((section) => section.id !== id),
});

export const updateSection = (
    module: ConversationModule,
    id: string,
    patch: Partial<Omit<ModuleSection, 'id'>>,
): ConversationModule => ({
    ...module,
    sections: module.sections.map((section) => (section.id === id ? { ...section, ...patch } : section)),
});

const twoOptions = (): QuestionOption[] => [
    { id: 'option1', label: { de: 'Antwort 1', en: 'Answer 1' } },
    { id: 'option2', label: { de: 'Antwort 2', en: 'Answer 2' } },
];

const newQuestion = (id: string, type: QuestionType): Question => ({
    id,
    type,
    display: type === 'single' ? 'radio' : undefined,
    required: false,
    label: type === 'hint' ? { de: 'Hinweis', en: 'Note' } : { de: 'Neue Frage', en: 'New question' },
    options: type === 'single' || type === 'multi' ? twoOptions() : [],
    version: 1,
});

/** Appends an empty section of one of the four kinds to a field. */
export const addSection = (
    module: ConversationModule,
    field: ModuleField,
    kind: SectionKind,
    id: string,
): ConversationModule => {
    const section: ModuleSection = {
        id,
        kind,
        field,
        title: {},
        display: kind === 'panel' ? 'collapsed' : 'open',
        body: {},
    };
    if (kind === 'fixed') section.fixed = 'email';
    if (kind === 'questions') {
        section.questions = [newQuestion(`${id}-1`, 'single')];
        if (field === 'greeting') section.trigger = 'withGreeting';
    }
    return { ...module, sections: [...module.sections, section] };
};

/** Prototype safety sections that the module no longer has — the editor warns about these. */
export const removedSafetySections = (module: ConversationModule, prototype: ConversationModule): ModuleSection[] => {
    const present = new Set(module.sections.map((section) => section.prototypeId).filter(Boolean));
    return prototype.sections.filter((section) => section.safety && !present.has(section.prototypeId));
};

// ---- questions --------------------------------------------------------------------------------

export const addQuestion = (section: ModuleSection, type: QuestionType, id: string): ModuleSection => ({
    ...section,
    questions: [...(section.questions ?? []), newQuestion(id, type)],
});

export const changeQuestionType = (question: Question, type: QuestionType): Question => {
    const isChoice = type === 'single' || type === 'multi';
    const keepsOptions = isChoice && question.options.length >= 2;
    let options: QuestionOption[] = [];
    if (keepsOptions) options = question.options;
    else if (isChoice) options = twoOptions();
    return {
        ...question,
        type,
        display: type === 'single' ? question.display ?? 'radio' : undefined,
        required: type === 'hint' ? false : question.required,
        options,
    };
};

const meaningOf = (question: Question) =>
    JSON.stringify([question.type, question.label, question.options, question.required]);

/** Raises the version of every question whose meaning differs from the stored module. */
export const prepareForPublish = (edited: ConversationModule, stored: ConversationModule): ConversationModule => {
    const before = new Map<string, Question>();
    stored.sections.forEach((section) =>
        section.questions?.forEach((question) => before.set(`${section.id}/${question.id}`, question)),
    );
    return {
        ...edited,
        sections: edited.sections.map((section) =>
            section.questions
                ? {
                      ...section,
                      questions: section.questions.map((question) => {
                          const old = before.get(`${section.id}/${question.id}`);
                          if (!old || meaningOf(old) === meaningOf(question)) return question;
                          return { ...question, version: old.version + 1 };
                      }),
                  }
                : section,
        ),
    };
};

// ---- resolution and summary -------------------------------------------------------------------

/**
 * Whole-module resolution (decision 5). `levels` is ordered conversation, Beratungsstelle,
 * Träger, platform; the first stored module wins, otherwise the prototype.
 */
export const resolveModule = (
    levels: (ConversationModule | undefined)[],
    prototype: ConversationModule,
): { module: ConversationModule; level: ModuleLevel } => {
    for (let index = 0; index < LEVEL_ORDER.length; index += 1) {
        const module = levels[index];
        if (module) return { module, level: LEVEL_ORDER[index] };
    }
    return { module: prototype, level: 'prototype' };
};

export const fieldSummary = (module: ConversationModule, field: ModuleField) => {
    const sections = sectionsOf(module, field);
    return {
        sections: sections.length,
        questions: sections.reduce(
            (count, section) => count + (section.questions?.filter((q) => q.type !== 'hint').length ?? 0),
            0,
        ),
    };
};

/** Languages (of the seven) in which a section has neither a title nor a body. */
export const languagesWithoutText = (section: ModuleSection): string[] =>
    MODULE_LANGUAGES.filter((language) => !section.title[language] && !section.body[language]);
