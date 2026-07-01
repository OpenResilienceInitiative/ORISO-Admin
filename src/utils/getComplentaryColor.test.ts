import { describe, expect, it } from 'vitest';
import getComplentaryColor from './getComplentaryColor';

describe('getComplentaryColor', () => {
    it('inverts white to black and black to white', () => {
        expect(getComplentaryColor('#ffffff')).toBe('#000000');
        expect(getComplentaryColor('#000000')).toBe('#ffffff');
    });

    it('inverts each channel independently', () => {
        expect(getComplentaryColor('#ff0000')).toBe('#00ffff');
        expect(getComplentaryColor('#00ff00')).toBe('#ff00ff');
        expect(getComplentaryColor('#0000ff')).toBe('#ffff00');
    });

    it('expands 3-digit hex before inverting', () => {
        expect(getComplentaryColor('#fff')).toBe('#000000');
        expect(getComplentaryColor('#000')).toBe('#ffffff');
    });

    it('zero-pads single-digit channel results', () => {
        // 0x01 -> 254 = 0xfe ; ensures padZero keeps two digits per channel
        expect(getComplentaryColor('#010101')).toBe('#fefefe');
    });
});
