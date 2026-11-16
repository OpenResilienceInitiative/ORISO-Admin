import { describe, expect, it } from 'vitest';
import { fromBackend, toBackend } from './agencyTexts';

describe('agency Erstantwort mapping', () => {
    it('maps UserService Baustein ids to the Admin field keys and back', () => {
        const backend = { greeting: { de: '<p>Hallo</p>' }, whoReadsAlong: { de: '<p>Team</p>', en: '<p>Team</p>' } };
        const content = fromBackend(backend);
        expect(content).toEqual({
            erstantwortGreeting: { de: '<p>Hallo</p>' },
            erstantwortWhoReadsAlong: { de: '<p>Team</p>', en: '<p>Team</p>' },
        });
        expect(toBackend(content)).toEqual(backend);
    });

    it('never sends a Baustein a centre may not write', () => {
        expect(toBackend({ erstantwortEmergencyAddition: { de: 'x' }, erstantwortResponseDeadlineDays: 3 })).toEqual(
            {},
        );
        expect(fromBackend({ emergencyNumbers: { de: 'x' } })).toEqual({});
    });
});
