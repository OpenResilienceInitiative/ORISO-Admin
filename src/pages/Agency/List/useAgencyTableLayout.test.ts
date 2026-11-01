import { describe, expect, it } from 'vitest';
import { agencyTableLayoutFor, wideFrom } from './useAgencyTableLayout';

describe('agencyTableLayoutFor', () => {
    it('needs more room for the wide row when the Träger and topics columns are shown', () => {
        expect(wideFrom({ tenant: false, topics: false })).toBe(920);
        expect(wideFrom({ tenant: true, topics: true })).toBe(1290);
    });

    it.each([
        [639, 'phone'],
        [640, 'tablet'],
        [1289, 'tablet'],
        [1290, 'wide'],
    ] as const)('shows the %ipx list with every column as %s', (width, layout) => {
        expect(agencyTableLayoutFor(width, { tenant: true, topics: true })).toBe(layout);
    });

    it('keeps a Träger admin on the wide row at 1440 px (1144 px content)', () => {
        expect(agencyTableLayoutFor(1144, { tenant: false, topics: true })).toBe('wide');
    });
});
