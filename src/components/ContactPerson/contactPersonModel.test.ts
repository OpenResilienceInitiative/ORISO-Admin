import { describe, expect, it } from 'vite-plus/test';
import {
    adminName,
    candidateLabel,
    candidateOptions,
    displayEmailOf,
    personLine,
    validateContactPair,
} from './contactPersonModel';
import { JONAS, MARIA, PETRA } from './contactPersonFixtures';

const t = (key: string) => key;

describe('contact person model (ORISO-Admin#1534)', () => {
    it('shows the contact e-mail when set, else the login e-mail', () => {
        expect(displayEmailOf(MARIA)).toBe('ansprechperson@caritas-nord.example');
        expect(displayEmailOf(JONAS)).toBe('j.beispiel@caritas-nord.example');
        expect(displayEmailOf({ loginEmail: 'login@x.example', contactEmail: '   ' })).toBe('login@x.example');
    });

    it('joins first and last name and skips blanks', () => {
        expect(adminName(MARIA)).toBe('Maria Muster');
        expect(adminName({ firstName: ' ', lastName: 'Muster' })).toBe('Muster');
    });

    it('labels a candidate with name, display e-mail and admin type', () => {
        expect(candidateLabel(PETRA, t)).toBe(
            'Petra Träger (contactPerson.type.tenant) · kontakt@caritas-sued.example',
        );
    });

    it('keeps the current contact as an option and leaves out the excluded one', () => {
        const options = candidateOptions([JONAS], t, { keep: [MARIA, null], exclude: JONAS.adminId });
        expect(options.map((option) => option.value)).toEqual([MARIA.adminId]);
    });

    it('lists each admin once', () => {
        expect(candidateOptions([MARIA, MARIA], t, { keep: [MARIA] })).toHaveLength(1);
    });

    it.each([
        [{}, null],
        [{ contactAdminId: 'a' }, null],
        [{ contactAdminId: 'a', deputyAdminId: 'b' }, null],
        [{ deputyAdminId: 'b' }, 'contactPerson.error.deputyWithoutContact'],
        [{ contactAdminId: 'a', deputyAdminId: 'a' }, 'contactPerson.error.deputySameAsContact'],
    ])('validates %o as %s', (pair, expected) => {
        expect(validateContactPair(pair)).toBe(expected);
    });

    it('writes a person line with the display e-mail', () => {
        expect(personLine(MARIA)).toBe('Maria Muster (ansprechperson@caritas-nord.example)');
        expect(personLine(null)).toBe('');
    });
});
