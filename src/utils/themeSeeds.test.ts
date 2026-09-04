import { describe, expect, it } from 'vitest';
import { buildSeedUpdate, getAccentDark, getAccentLight, readSeeds } from './themeSeeds';

describe('theme seed helpers', () => {
    it('prefers new seed names while keeping compatibility aliases', () => {
        expect(getAccentDark({ accentDark: '#111111', primary: '#222222' })).toBe('#111111');
        expect(getAccentDark({ primary: '#222222' })).toBe('#222222');
        expect(getAccentLight({ accentLight: '#aaaaaa', accent: '#bbbbbb' })).toBe('#aaaaaa');
        expect(getAccentLight({ accent: '#bbbbbb' })).toBe('#bbbbbb');
    });

    it('reads backend theming fields into seed aliases', () => {
        expect(readSeeds({ primaryColor: '#123456', accent: '#abcdef' })).toEqual({
            accent: '#abcdef',
            accentDark: '#123456',
            accentLight: '#abcdef',
            primary: '#123456',
        });
    });

    it('builds backend update payloads from seed values', () => {
        expect(buildSeedUpdate({ accentDark: '#111111', accentLight: '#eeeeee' })).toEqual({
            accent: '#eeeeee',
            primaryColor: '#111111',
        });
    });

    it('omits blank, whitespace, and absent seeds instead of writing empty values', () => {
        expect(buildSeedUpdate({ accentDark: '#111111' })).toEqual({ primaryColor: '#111111' });
        expect(buildSeedUpdate({ accentDark: '#111111', accentLight: '' })).toEqual({ primaryColor: '#111111' });
        expect(buildSeedUpdate({ accentDark: '  ', accentLight: '   ' })).toEqual({});
        expect(buildSeedUpdate({})).toEqual({});
    });

    it('never writes secondaryColor or signal as empty placeholders', () => {
        expect(buildSeedUpdate({ accentDark: '#111111', accentLight: '#eeeeee' })).not.toHaveProperty('secondaryColor');
        expect(buildSeedUpdate({ accentDark: '#111111', accentLight: '#eeeeee' })).not.toHaveProperty('signal');
    });
});
