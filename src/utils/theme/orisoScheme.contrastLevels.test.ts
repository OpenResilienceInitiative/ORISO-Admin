import { describe, expect, it } from 'vite-plus/test';
import { computeOrisoPalette } from './orisoScheme';

/**
 * The snapshots were written from the palette BEFORE the high-contrast ink tones
 * (ORISO-Admin#1671), so standard and medium must stay byte-identical to that.
 */
describe('personal contrast: standard and medium stay as they were', () => {
    it.each(['light', 'dark'] as const)('%s', (scheme) => {
        expect(computeOrisoPalette({ accentDark: '#a5000a' }, scheme, 'standard').tokens).toMatchSnapshot('standard');
        expect(computeOrisoPalette({ accentDark: '#a5000a' }, scheme, 'medium').tokens).toMatchSnapshot('medium');
    });
});
