import { describe, expect, it } from 'vite-plus/test';
import { contactEmailForSave } from './contactEmailForSave';

describe('contactEmailForSave (ORISO-Admin#1534)', () => {
    it('leaves an unchanged contact e-mail out', () => {
        expect(contactEmailForSave('kontakt@example.org ', 'kontakt@example.org', true)).toBeUndefined();
        expect(contactEmailForSave('', null, true)).toBeUndefined();
        expect(contactEmailForSave(undefined, 'kontakt@example.org', true)).toBeUndefined();
    });

    it('sends "" when the admin emptied the field', () => {
        expect(contactEmailForSave('  ', 'kontakt@example.org', true)).toBe('');
        expect(contactEmailForSave(null, 'kontakt@example.org', true)).toBe('');
    });

    it('sends a changed value trimmed', () => {
        expect(contactEmailForSave(' neu@example.org ', 'alt@example.org', true)).toBe('neu@example.org');
    });

    it('sends only a filled value on create', () => {
        expect(contactEmailForSave('', undefined, false)).toBeUndefined();
        expect(contactEmailForSave('neu@example.org', undefined, false)).toBe('neu@example.org');
    });
});
