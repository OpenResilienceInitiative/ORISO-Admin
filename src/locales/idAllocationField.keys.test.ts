import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import translationDe from './de/translation.json';
import translationEn from './en/translation.json';

const de = translationDe as Record<string, string>;
const en = translationEn as Record<string, string>;
const source = readFileSync(resolve(process.cwd(), 'src/components/IdAllocationField/index.tsx'), 'utf8');
const usedKeys = [...new Set([...source.matchAll(/t\(\s*'(idAllocationField\.[\w.]+)'/g)].map(([, key]) => key))];

describe('IdAllocationField i18n keys', () => {
    it.each(usedKeys)('has %s in de and en', (key) => {
        expect(de[key]).toBeTruthy();
        expect(en[key]).toBeTruthy();
    });
});
