import { describe, expect, it } from 'vite-plus/test';
import {
    addQuestion,
    addSection,
    changeQuestionType,
    fieldSummary,
    moveSection,
    prepareForPublish,
    prototypeFor,
    removeSection,
    removedSafetySections,
    resolveModule,
    sectionsOf,
    updateSection,
    type ConversationModule,
} from './conversationModule';

const ids = (module: ConversationModule, field: 'greeting' | 'closingQuestions' = 'greeting') =>
    sectionsOf(module, field).map((section) => section.id);

describe('prototypes (ADR-035 decisions 1–3)', () => {
    it('ships one module per conversation type, and the internal group ships empty', () => {
        expect(prototypeFor('AGENCY_COUNSELLING').sections.length).toBeGreaterThan(0);
        expect(prototypeFor('LIVE_CHAT').sections.length).toBeGreaterThan(0);
        expect(prototypeFor('SELF_HELP').sections.length).toBeGreaterThan(0);
        expect(prototypeFor('INTERNAL_GROUP').sections).toEqual([]);
    });

    it('is version 2 and hands out a fresh copy each time', () => {
        const first = prototypeFor('AGENCY_COUNSELLING');
        expect(first.version).toBe(2);
        first.sections[0].title.de = 'geändert';
        expect(prototypeFor('AGENCY_COUNSELLING').sections[0].title.de).not.toBe('geändert');
    });

    it('marks the emergency numbers as a safety section in every counselling prototype', () => {
        (['AGENCY_COUNSELLING', 'LIVE_CHAT'] as const).forEach((type) => {
            const safety = prototypeFor(type).sections.filter((section) => section.safety);
            expect(safety.map((section) => section.prototypeId)).toContain('emergencyNumbers');
        });
    });

    it('has German text for every section title', () => {
        (['AGENCY_COUNSELLING', 'LIVE_CHAT', 'SELF_HELP'] as const).forEach((type) => {
            prototypeFor(type).sections.forEach((section) => expect(section.title.de).toBeTruthy());
        });
    });
});

describe('editing the section list (decisions 2 and 6)', () => {
    it('moves a section up and down within its field, and not past the edges', () => {
        const module = prototypeFor('AGENCY_COUNSELLING');
        const [first, second] = ids(module);
        const moved = moveSection(module, second, -1);
        expect(ids(moved).slice(0, 2)).toEqual([second, first]);
        expect(moveSection(module, first, -1)).toEqual(module);
        const last = ids(module).at(-1)!;
        expect(moveSection(module, last, 1)).toEqual(module);
    });

    it('never moves a greeting section into the closing questions', () => {
        const module = prototypeFor('AGENCY_COUNSELLING');
        const lastGreeting = ids(module).at(-1)!;
        const moved = moveSection(module, lastGreeting, 1);
        expect(ids(moved)).toEqual(ids(module));
        expect(ids(moved, 'closingQuestions')).toEqual(ids(module, 'closingQuestions'));
    });

    it('removes any section, a safety section included', () => {
        const module = prototypeFor('AGENCY_COUNSELLING');
        const emergency = module.sections.find((section) => section.prototypeId === 'emergencyNumbers')!;
        const removed = removeSection(module, emergency.id);
        expect(removed.sections.find((section) => section.id === emergency.id)).toBeUndefined();
    });

    it('reports removed safety sections so the editor can warn, without blocking', () => {
        const prototype = prototypeFor('AGENCY_COUNSELLING');
        expect(removedSafetySections(prototype, prototype)).toEqual([]);
        const emergency = prototype.sections.find((section) => section.prototypeId === 'emergencyNumbers')!;
        const removed = removedSafetySections(removeSection(prototype, emergency.id), prototype);
        expect(removed.map((section) => section.prototypeId)).toEqual(['emergencyNumbers']);
    });

    it('adds each of the four kinds at the end of the chosen field', () => {
        let module = prototypeFor('INTERNAL_GROUP');
        module = addSection(module, 'greeting', 'message', 'm1');
        module = addSection(module, 'greeting', 'panel', 'p1');
        module = addSection(module, 'greeting', 'fixed', 'f1');
        module = addSection(module, 'closingQuestions', 'questions', 'q1');
        expect(ids(module)).toEqual(['m1', 'p1', 'f1']);
        expect(ids(module, 'closingQuestions')).toEqual(['q1']);
        const panel = module.sections.find((section) => section.id === 'p1')!;
        expect(panel.display).toBe('collapsed');
        const message = module.sections.find((section) => section.id === 'm1')!;
        expect(message.display).toBe('open');
        const fixed = module.sections.find((section) => section.id === 'f1')!;
        expect(fixed.fixed).toBe('email');
        const questions = module.sections.find((section) => section.id === 'q1')!;
        expect(questions.questions).toHaveLength(1);
    });

    it('updates one section without touching the others', () => {
        const module = prototypeFor('AGENCY_COUNSELLING');
        const [first, second] = module.sections;
        const updated = updateSection(module, first.id, { display: 'collapsed', title: { de: 'Neu' } });
        expect(updated.sections[0].display).toBe('collapsed');
        expect(updated.sections[0].title.de).toBe('Neu');
        expect(updated.sections[1]).toBe(second);
    });
});

describe('questions (decision 9)', () => {
    it('adds a question of the chosen type with a stable id', () => {
        const section = addSection(prototypeFor('INTERNAL_GROUP'), 'greeting', 'questions', 'q').sections[0];
        const next = addQuestion(section, 'multi', 'colour');
        const question = next.questions!.at(-1)!;
        expect(question.id).toBe('colour');
        expect(question.type).toBe('multi');
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.required).toBe(false);
    });

    it('drops options when a choice question becomes free text or a hint', () => {
        const section = addSection(prototypeFor('INTERNAL_GROUP'), 'greeting', 'questions', 'q').sections[0];
        const question = addQuestion(section, 'single', 'x').questions!.at(-1)!;
        expect(changeQuestionType(question, 'text').options).toEqual([]);
        const hint = changeQuestionType(question, 'hint');
        expect(hint.options).toEqual([]);
        expect(hint.required).toBe(false);
    });

    it('gives a free-text question two options when it becomes a choice', () => {
        const section = addSection(prototypeFor('INTERNAL_GROUP'), 'greeting', 'questions', 'q').sections[0];
        const text = addQuestion(section, 'text', 'x').questions!.at(-1)!;
        const single = changeQuestionType(text, 'single');
        expect(single.options).toHaveLength(2);
        expect(single.display).toBe('radio');
    });

    it('treats the dropdown as a display of single select, not as a type of its own', () => {
        const section = addSection(prototypeFor('INTERNAL_GROUP'), 'greeting', 'questions', 'q').sections[0];
        const single = addQuestion(section, 'single', 'x').questions!.at(-1)!;
        const dropdown = { ...single, display: 'dropdown' as const };
        expect(dropdown.type).toBe('single');
        expect(changeQuestionType(dropdown, 'multi').display).toBeUndefined();
    });

    it('bumps the version only of questions whose meaning changed since the stored module', () => {
        const stored = addSection(prototypeFor('INTERNAL_GROUP'), 'closingQuestions', 'questions', 's');
        const withTwo = updateSection(stored, 's', {
            questions: [
                ...stored.sections[0].questions!,
                { ...stored.sections[0].questions![0], id: 'second', label: { de: 'Zweite' } },
            ],
        });
        const edited = updateSection(withTwo, 's', {
            questions: withTwo.sections[0].questions!.map((question) =>
                question.id === 'second' ? { ...question, label: { de: 'Zweite, umformuliert' } } : question,
            ),
        });
        const published = prepareForPublish(edited, withTwo);
        const [unchanged, changed] = published.sections[0].questions!;
        expect(unchanged.version).toBe(1);
        expect(changed.version).toBe(2);
    });
});

describe('resolution (decisions 4 and 5)', () => {
    it('takes the nearest level as a whole module: conversation ?? centre ?? Träger ?? platform ?? prototype', () => {
        const prototype = prototypeFor('SELF_HELP');
        const platform = { ...prototype, sections: prototype.sections.slice(0, 1) };
        const centre = { ...prototype, sections: [] };
        expect(resolveModule([undefined, undefined, undefined, undefined], prototype)).toEqual({
            module: prototype,
            level: 'prototype',
        });
        expect(resolveModule([undefined, undefined, undefined, platform], prototype).level).toBe('platform');
        expect(resolveModule([undefined, centre, undefined, platform], prototype)).toEqual({
            module: centre,
            level: 'agency',
        });
    });
});

describe('tile summary', () => {
    it('counts sections and questions per field', () => {
        const module = prototypeFor('AGENCY_COUNSELLING');
        const greeting = fieldSummary(module, 'greeting');
        expect(greeting.sections).toBe(sectionsOf(module, 'greeting').length);
        const closing = fieldSummary(module, 'closingQuestions');
        expect(closing.questions).toBeGreaterThan(0);
    });
});
