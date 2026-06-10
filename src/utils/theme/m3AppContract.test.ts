/**
 * Admin app-layer contract (THB-02, Admin-only — not part of the
 * byte-identical vendored set).
 *
 * Test #2: the `--m3-*` tokens hand-defined in src/app.css are read LIVE
 * from the file (the test follows the code) and must equal the engine's
 * light-scheme output for the default seed STRING-EXACTLY. Swapping the
 * static block for engine output is then provably invisible.
 *
 * Test #4 (report-only): tokens defined in app.css but consumed nowhere
 * are reported, never failed on.
 *
 * Test #10: this file passing here while the identical golden test
 * passes in ORISO-Frontend proves both repos compute the same palette.
 *
 * Traces: UAT-B, UAT-D, UAT-H.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { computeOrisoPalette } from './orisoScheme';
import { collectConsumedM3Tokens } from './testUtils';

const BENCHMARK_SEED = '#A5000A';

const appCssPath = path.join(__dirname, '..', '..', 'app.css');

/** Parses every `--m3-<role>: #rrggbb;` definition out of app.css. */
const loadDefinedM3Tokens = (): Record<string, string> => {
	const css = fs.readFileSync(appCssPath, 'utf8');
	const defined: Record<string, string> = {};
	for (const match of css.matchAll(
		/(--m3-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g
	)) {
		defined[match[1]] = match[2].toLowerCase();
	}
	return defined;
};

describe('app.css --m3-* block vs engine (Test #2)', () => {
	const defined = loadDefinedM3Tokens();
	const { tokens } = computeOrisoPalette(
		{ primary: BENCHMARK_SEED },
		'light'
	);

	it('app.css defines the expected token block', () => {
		expect(Object.keys(defined).length).toBeGreaterThanOrEqual(9);
	});

	it.each(Object.entries(loadDefinedM3Tokens()))(
		'%s: engine output equals the hand-coded value exactly',
		(token, handCoded) => {
			expect(tokens[token]?.toLowerCase()).toBe(handCoded);
		}
	);
});

describe('defined vs consumed tokens (Test #4, report-only)', () => {
	it('reports defined-but-unused tokens without failing', () => {
		const defined = Object.keys(loadDefinedM3Tokens());
		const consumed = new Set(
			collectConsumedM3Tokens([path.join(__dirname, '..', '..')])
		);
		const orphans = defined.filter((token) => !consumed.has(token));
		if (orphans.length > 0) {
			// eslint-disable-next-line no-console
			console.warn(
				`[m3 token hygiene] defined in app.css but consumed nowhere: ${orphans.join(', ')}`
			);
		}
		expect(Array.isArray(orphans)).toBe(true);
	});
});
