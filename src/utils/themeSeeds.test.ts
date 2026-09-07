import { describe, expect, it } from 'vitest';
import { buildSeedUpdate, getAccentDark, getAccentLight, getSignal, readSeeds } from './themeSeeds';

describe('theme seed helpers', () => {
    it('prefers new seed names while keeping compatibility aliases', () => {
        expect(getAccentDark({ accentDark: '#111111', primary: '#222222' })).toBe('#111111');
        expect(getAccentDark({ primary: '#222222' })).toBe('#222222');
        expect(getAccentLight({ accentLight: '#aaaaaa', accent: '#bbbbbb' })).toBe('#aaaaaa');
        expect(getAccentLight({ accent: '#bbbbbb' })).toBe('#bbbbbb');
        expect(getSignal({ signal: '#b1005e' })).toBe('#b1005e');
    });

    it('reads backend theming fields into seed aliases', () => {
        expect(readSeeds({ primaryColor: '#123456', accent: '#abcdef', signal: '#00aa55' })).toEqual({
            accent: '#abcdef',
            accentDark: '#123456',
            accentLight: '#abcdef',
            primary: '#123456',
            signal: '#00aa55',
        });
    });

    it('builds backend update payloads from seed values including signal', () => {
        expect(buildSeedUpdate({ accentDark: '#111111', accentLight: '#eeeeee', signal: '#00aa55' })).toEqual({
            accent: '#eeeeee',
            primaryColor: '#111111',
            secondaryColor: null,
            signal: '#00aa55',
        });
    });

    it('writes null signal when the seed is absent', () => {
        expect(buildSeedUpdate({ accentDark: '#111111', accentLight: '#eeeeee' })).toEqual({
            accent: '#eeeeee',
            primaryColor: '#111111',
            secondaryColor: null,
            signal: null,
        });
    });
});
