import { describe, expect, it } from 'vite-plus/test';
import { shouldShowTourLauncher } from './tourLauncherVisibility';

const base = { centralToursEnabled: undefined, userSwitchOn: true, tourRunning: false, availableTourCount: 1 };

describe('shouldShowTourLauncher', () => {
    it('shows the launcher by default when a tour is available', () => {
        expect(shouldShowTourLauncher(base)).toBe(true);
    });

    it('treats an unknown central setting as on, like the profile tour card', () => {
        expect(shouldShowTourLauncher({ ...base, centralToursEnabled: true })).toBe(true);
    });

    it.each([
        ['the central tours setting is off', { centralToursEnabled: false }],
        ['the per-user switch is off', { userSwitchOn: false }],
        ['a tour is running', { tourRunning: true }],
        ['no tour is available for the audience', { availableTourCount: 0 }],
    ])('hides the launcher when %s', (_reason, override) => {
        expect(shouldShowTourLauncher({ ...base, ...override })).toBe(false);
    });
});
