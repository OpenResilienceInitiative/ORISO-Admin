import { describe, expect, it } from 'vitest';
import { computeOrisoPalette, hueDistance, signalTooCloseToBrand, SIGNAL_BRAND_HUE_MIN_DISTANCE } from './orisoScheme';

describe('computeOrisoPalette signal seed', () => {
    it('uses the default error colour when no signal seed is set', () => {
        const { tokens } = computeOrisoPalette({ accentDark: '#a5000a' });
        expect(tokens['--m3-error']).toBe('#b1005e');
        expect(tokens['--m3-warning']).toBeUndefined();
        expect(tokens['--m3-on-warning']).toBeUndefined();
    });

    it('applies a custom signal seed to --m3-error', () => {
        const { tokens } = computeOrisoPalette({ accentDark: '#a5000a', signal: '#00aa55' });
        expect(tokens['--m3-error']).toBe('#00aa55');
        expect(tokens['--m3-warning']).toBeUndefined();
    });

    it('flags signalTooClose when brand and signal hues are nearly identical', () => {
        expect(signalTooCloseToBrand({ accentDark: '#a5000a', signal: '#a6000b' })).toBe(true);
        expect(computeOrisoPalette({ accentDark: '#a5000a', signal: '#a6000b' }).signalTooClose).toBe(true);
    });

    it('does not flag distinct hues as too close', () => {
        expect(signalTooCloseToBrand({ accentDark: '#a5000a', signal: '#00aa55' })).toBe(false);
        expect(computeOrisoPalette({ accentDark: '#a5000a', signal: '#00aa55' }).signalTooClose).toBe(false);
    });

    it('does not warn when signal is absent (default system error)', () => {
        expect(signalTooCloseToBrand({ accentDark: '#a5000a' })).toBe(false);
        expect(computeOrisoPalette({ accentDark: '#a5000a' }).signalTooClose).toBe(false);
    });

    it('computes circular hue distance under the configured threshold', () => {
        expect(hueDistance('#ff0000', '#00ff00')).toBeGreaterThan(SIGNAL_BRAND_HUE_MIN_DISTANCE);
        expect(hueDistance('#a5000a', '#a6000b')).toBeLessThan(SIGNAL_BRAND_HUE_MIN_DISTANCE);
    });
});
