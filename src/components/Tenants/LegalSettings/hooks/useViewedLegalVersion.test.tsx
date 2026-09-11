import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LegalTextVersion } from '../../../../types/legalVersion';
import { useViewedLegalVersion } from './useViewedLegalVersion';

const versions: LegalTextVersion[] = [
    {
        id: 42,
        kind: 'DPP',
        ownerLevel: 'DEPARTMENT',
        ownerId: 3,
        publishedAt: '2026-07-13T10:22:00Z',
        content: JSON.stringify({ de: '<p>neu</p>' }),
        consentText: JSON.stringify({ de: 'Ich habe die {{legal_links}} gelesen.' }),
    },
    {
        id: 17,
        kind: 'DPP',
        ownerLevel: 'DEPARTMENT',
        ownerId: 3,
        publishedAt: '2026-05-02T09:00:00Z',
        content: JSON.stringify({ de: '<p>alt</p>' }),
        consentText: JSON.stringify({ de: 'Alte Einwilligung {{legal_links}}.' }),
    },
];

describe('useViewedLegalVersion', () => {
    it('shows the draft until a version is picked', () => {
        const { result } = renderHook(() => useViewedLegalVersion(versions));

        expect(result.current.isViewingVersion).toBe(false);
        expect(result.current.viewedConsent).toBeUndefined();
    });

    it('resolves the version the editor reports by its surrogate id', () => {
        // The editor hands back `EditorVersion.id`, which is the surrogate id as a
        // string (ORISO-AgencyService#256) — matching on a timestamp would never hit.
        const { result } = renderHook(() => useViewedLegalVersion(versions));

        act(() => result.current.onViewVersionChange('17'));

        expect(result.current.isViewingVersion).toBe(true);
        expect(result.current.viewedVersion?.id).toBe(17);
        expect(result.current.viewedConsent).toEqual({ de: 'Alte Einwilligung {{legal_links}}.' });
    });

    it('drops back to the draft on reset', () => {
        const { result } = renderHook(() => useViewedLegalVersion(versions));

        act(() => result.current.onViewVersionChange('42'));
        act(() => result.current.reset());

        expect(result.current.isViewingVersion).toBe(false);
    });
});
