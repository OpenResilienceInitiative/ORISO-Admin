import { describe, expect, it } from 'vitest';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import type { CounselorData } from '../../../types/counselor';
import { encodeUsername } from '../../../utils/encryptionHelpers';
import {
    appendPage,
    displayUsername,
    hasOtherIdentityFor,
    nameFieldOf,
    sortColumnOf,
    topicsAtCentre,
} from './userRows';

const person = (row: Partial<CounselorData>) => row as CounselorData;

describe('topicsAtCentre', () => {
    it('keeps the person topics the centre offers', () => {
        const topics = topicsAtCentre(
            person({
                topics: [
                    { id: 1, name: 'Schulden' },
                    { id: 2, name: 'Sucht' },
                ] as CounselorData['topics'],
            }),
            {
                topics: [
                    { id: 2, name: 'Sucht' },
                    { id: 3, name: 'Familie' },
                ],
            } as CounselorData['agencies'][number],
        );
        expect(topics).toEqual(['Sucht']);
    });

    it('is undefined when either side does not carry topics', () => {
        expect(topicsAtCentre(person({}), { topics: [] } as never)).toBeUndefined();
        expect(topicsAtCentre(person({ topics: [] }), {} as never)).toBeUndefined();
    });
});

describe('displayUsername', () => {
    it('decodes a legacy Base32 "enc." username', () => {
        expect(displayUsername(encodeUsername('lmeier'))).toBe('lmeier');
    });

    it('keeps a plain username and a value it cannot decode', () => {
        expect(displayUsername('amuster')).toBe('amuster');
        expect(displayUsername('enc.1')).toBe('enc.1');
    });
});

describe('hasOtherIdentityFor', () => {
    it('marks a counsellor who is also a Träger admin, not one who is only an agency admin', () => {
        expect(hasOtherIdentityFor(TypeOfUser.Consultants, person({ otherIdentityTypes: ['TENANT_ADMIN'] }))).toBe(
            true,
        );
        expect(
            hasOtherIdentityFor(
                TypeOfUser.Consultants,
                person({ hasOtherIdentity: true, otherIdentityTypes: ['AGENCY_ADMIN'] }),
            ),
        ).toBe(false);
    });

    it('marks an admin who is also a counsellor', () => {
        expect(hasOtherIdentityFor(TypeOfUser.TenantAdmins, person({ hasOtherIdentity: true }))).toBe(true);
        expect(hasOtherIdentityFor(TypeOfUser.AgencyAdmins, person({ hasOtherIdentity: false }))).toBe(false);
    });
});

describe('sort mapping', () => {
    it('puts every name field on the name column and the date on its own', () => {
        expect(['LASTNAME', 'FIRSTNAME', 'EMAIL'].map(sortColumnOf)).toEqual(['name', 'name', 'name']);
        expect(sortColumnOf('UPDATE_DATE')).toBe('lastUpdated');
        expect(sortColumnOf('USERNAME')).toBeUndefined();
    });

    it('reads the pill value from the server field', () => {
        expect(nameFieldOf('EMAIL')).toBe('email');
        expect(nameFieldOf('FIRSTNAME')).toBe('firstname');
        expect(nameFieldOf('UPDATE_DATE')).toBeUndefined();
    });
});

describe('appendPage', () => {
    const a = person({ id: 'a' });
    const b = person({ id: 'b' });
    const c = person({ id: 'c' });

    it('adds the next page and skips people already shown', () => {
        expect(appendPage([a, b], [b, c]).map((row) => row.id)).toEqual(['a', 'b', 'c']);
    });

    it('returns the same list when nothing is new, so state does not churn', () => {
        const shown = [a, b];
        expect(appendPage(shown, [b])).toBe(shown);
        expect(appendPage(shown, [])).toBe(shown);
    });
});
