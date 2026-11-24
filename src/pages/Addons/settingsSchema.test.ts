import { describe, expect, it } from 'vite-plus/test';
import type { JsonSchema } from '../../addons/addonTypes';
import { collectSettingsValues, initialSettingsValues, settingsFields } from './settingsSchema';

const schema: JsonSchema = {
    type: 'object',
    required: ['greeting', 'maxTools'],
    properties: {
        greeting: { type: 'string', title: 'Begrüßung', description: 'Wird oben angezeigt', default: 'Hallo' },
        intro: { type: 'string', format: 'textarea' },
        notes: { type: 'string', maxLength: 500 },
        mode: { type: 'string', enum: ['simple', 'expert'], default: 'simple' },
        showTips: { type: 'boolean', title: 'Tipps anzeigen' },
        maxTools: { type: 'integer', minimum: 1, maximum: 9 },
        ratio: { type: 'number' },
        nested: { type: 'object', properties: {} },
    },
};

describe('settingsFields', () => {
    it('maps every supported property to a field kind', () => {
        const fields = settingsFields(schema);
        expect(fields.map((field) => [field.name, field.kind])).toEqual([
            ['greeting', 'text'],
            ['intro', 'textarea'],
            ['notes', 'textarea'],
            ['mode', 'select'],
            ['showTips', 'switch'],
            ['maxTools', 'integer'],
            ['ratio', 'number'],
        ]);
    });

    it('keeps title, description, required, bounds and enum options', () => {
        const fields = settingsFields(schema);
        const greeting = fields.find((field) => field.name === 'greeting');
        expect(greeting).toMatchObject({ label: 'Begrüßung', description: 'Wird oben angezeigt', required: true });
        expect(fields.find((field) => field.name === 'intro')?.label).toBe('intro');
        expect(fields.find((field) => field.name === 'maxTools')).toMatchObject({
            minimum: 1,
            maximum: 9,
            required: true,
        });
        expect(fields.find((field) => field.name === 'mode')?.options).toEqual([
            { label: 'simple', value: 'simple' },
            { label: 'expert', value: 'expert' },
        ]);
    });

    it('returns no fields for a missing or non-object schema', () => {
        expect(settingsFields(null)).toEqual([]);
        expect(settingsFields({ type: 'string' })).toEqual([]);
    });
});

describe('initialSettingsValues', () => {
    it('prefers stored values, then defaults, and starts switches off', () => {
        const fields = settingsFields(schema);
        expect(initialSettingsValues(fields, { greeting: 'Moin', maxTools: 3 })).toMatchObject({
            greeting: 'Moin',
            mode: 'simple',
            showTips: false,
            maxTools: 3,
            intro: undefined,
        });
    });
});

describe('collectSettingsValues', () => {
    it('types values as the schema says and leaves empty optional fields out', () => {
        const fields = settingsFields(schema);
        expect(
            collectSettingsValues(fields, {
                greeting: 'Hallo',
                intro: '   ',
                notes: 'Text',
                mode: 'expert',
                showTips: undefined,
                maxTools: '4.7',
                ratio: '',
                unknown: 'dropped',
            }),
        ).toEqual({ greeting: 'Hallo', notes: 'Text', mode: 'expert', showTips: false, maxTools: 4 });
    });
});
