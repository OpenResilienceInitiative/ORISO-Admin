/**
 * Seed persistence model (THB-03): the tenant theming stores seeds only —
 * the palette is computed, never persisted, and the legacy mirrored
 * secondaryColor is actively cleared.
 *
 * Storage shape (decided 2026-06-10): flat fields on `theming` —
 * `primaryColor` stays the main seed, `accent`/`signal` are added.
 *
 * Traces: UAT-A, UAT-G (Tests #11, #12, #13 in THB — Test Logic).
 */
import { describe, expect, it } from 'vitest';
import { isReadOnlySetting } from './serverSettingsMeta';
import { buildSeedUpdate, readSeeds } from './themeSeeds';

describe('buildSeedUpdate (Test #11 — seed-only persistence)', () => {
    it('persists the main seed without mirroring it into secondaryColor', () => {
        const update = buildSeedUpdate({ primary: '#a5000a' });
        expect(update.primaryColor).toBe('#a5000a');
        expect(update.secondaryColor).not.toBe('#a5000a');
    });

    it('actively clears the legacy mirrored secondaryColor', () => {
        const update = buildSeedUpdate({ primary: '#a5000a' });
        expect(update.secondaryColor).toBeNull();
    });

    it('persists optional accent and signal seeds as flat theming fields', () => {
        const update = buildSeedUpdate({
            primary: '#a5000a',
            accent: '#646d78',
            signal: '#b1005e',
        });
        expect(update.accent).toBe('#646d78');
        expect(update.signal).toBe('#b1005e');
    });

    it('clears absent optional seeds so stale values cannot survive', () => {
        const update = buildSeedUpdate({ primary: '#a5000a' });
        expect(update.accent).toBeNull();
        expect(update.signal).toBeNull();
    });

    it('never emits a computed palette — only seed fields', () => {
        const update = buildSeedUpdate({
            primary: '#a5000a',
            accent: '#646d78',
            signal: '#b1005e',
        });
        expect(Object.keys(update).sort()).toEqual(['accent', 'primaryColor', 'secondaryColor', 'signal']);
    });
});

describe('readSeeds (Test #12 — legacy primaryColor fallback)', () => {
    it('reads a legacy record (primaryColor + mirrored secondaryColor) as the primary seed', () => {
        const seeds = readSeeds({
            primaryColor: '#a5000a',
            secondaryColor: '#a5000a',
        });
        expect(seeds).toEqual({
            primary: '#a5000a',
            accent: undefined,
            signal: undefined,
        });
    });

    it('reads the full seed set when present', () => {
        const seeds = readSeeds({
            primaryColor: '#a5000a',
            accent: '#646d78',
            signal: '#b1005e',
        });
        expect(seeds).toEqual({
            primary: '#a5000a',
            accent: '#646d78',
            signal: '#b1005e',
        });
    });

    it('handles a tenant without theming', () => {
        expect(readSeeds(undefined)).toEqual({
            primary: undefined,
            accent: undefined,
            signal: undefined,
        });
        expect(readSeeds(null)).toEqual({
            primary: undefined,
            accent: undefined,
            signal: undefined,
        });
    });

    it('normalises null fields to undefined (engine-compatible)', () => {
        const seeds = readSeeds({
            primaryColor: '#a5000a',
            accent: null,
            signal: null,
        });
        expect(seeds.accent).toBeUndefined();
        expect(seeds.signal).toBeUndefined();
    });
});

describe('isReadOnlySetting (Test #13 — central lock, disable not hide)', () => {
    it('locks when any alias key is read-only', () => {
        expect(
            isReadOnlySetting({ 'theming.primaryColor': { readOnly: true } }, ['primaryColor', 'theming.primaryColor']),
        ).toBe(true);
    });

    it('does not lock when no alias matches', () => {
        expect(
            isReadOnlySetting({ 'theming.logo': { readOnly: true } }, ['primaryColor', 'theming.primaryColor']),
        ).toBe(false);
    });

    it('does not lock without server settings meta', () => {
        expect(isReadOnlySetting(undefined, ['primaryColor'])).toBe(false);
    });
});
