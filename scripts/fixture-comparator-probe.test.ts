import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, it, vi } from 'vite-plus/test';
import {
    comparatorContract,
    fixtureComparatorProbePlugin,
    instrumentComparator,
    prepareComparatorProbe,
} from './fixture-comparator-probe.mjs';
import { beginFixtureDiagnostic } from './story-fixture-diagnostic';

const require = createRequire(import.meta.url);
const source = readFileSync(require.resolve('rc-util/es/isEqual.js'), 'utf8');
const evaluate = (text: string, transformed: boolean, warning: (ok: boolean, message: string) => void) => {
    const body = text
        .replace(/^import .*;$/gm, '')
        .replace('export default isEqual;', 'return isEqual;')
        .replace('export default function diagnosticIsEqual', 'function diagnosticIsEqual');
    return new Function(
        '_typeof',
        'warning',
        'window',
        'CustomEvent',
        body + (transformed ? '\nreturn diagnosticIsEqual;' : ''),
    )((value: unknown) => typeof value, warning, window, CustomEvent);
};
afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});
it('pins the installed exact comparator and keeps ordinary config inert', () => {
    expect(fixtureComparatorProbePlugin(undefined, undefined)).toBeUndefined();
    expect(() => instrumentComparator(source + '\n')).toThrow('Unsupported comparator source');
    expect(() => fixtureComparatorProbePlugin('all', '/tmp')).toThrow('Unknown comparator diagnostic selection');
});
it('records exact pre-command transformed bytes and intercepts only the pinned module', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'comparator-probe-'));
    try {
        prepareComparatorProbe(root, 'deadline-warning');
        const plugin = fixtureComparatorProbePlugin('deadline-warning', root);
        expect(plugin.transform(source, '/other/isEqual.js')).toBeUndefined();
        const result = plugin.transform(source, require.resolve('rc-util/es/isEqual.js'));
        expect(result.code).toBe(readFileSync(path.join(root, 'comparator-probe/transformed-module.js'), 'utf8'));
        const receipt = JSON.parse(readFileSync(path.join(root, 'comparator-probe/interception.json'), 'utf8'));
        expect(receipt).toMatchObject({
            module: comparatorContract.module,
            sha256: comparatorContract.sha256,
            transforms: 1,
        });
    } finally {
        rmSync(root, { recursive: true });
    }
});
it('preserves original results, warnings and original thrown object', () => {
    const originalWarnings: string[] = [],
        transformedWarnings: string[] = [];
    const original = evaluate(source, false, (ok, message) => {
        if (!ok) originalWarnings.push(message);
    });
    const wrapped = evaluate(instrumentComparator(source), true, (ok, message) => {
        if (!ok) transformedWarnings.push(message);
    });
    const shared: unknown[] = [];
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    const cases = [
        [{ value: { a: 1 } }, { value: { a: 1 } }, false],
        [
            { errors: shared, warnings: shared, name: ['deadline'] },
            { errors: [], warnings: [], name: ['deadline'] },
            false,
        ],
        [cycle, { self: {} }, false],
        [{ value: {} }, { value: {} }, true],
    ];
    cases.forEach((args) => expect(wrapped(...args)).toBe(original(...args)));
    expect(transformedWarnings).toEqual(originalWarnings);
    const failure = new Error('original ownKeys failure');
    const proxy = new Proxy(
        {},
        {
            ownKeys() {
                throw failure;
            },
        },
    );
    expect(wrapped(proxy, proxy)).toBe(original(proxy, proxy));
    for (const comparator of [original, wrapped]) {
        let caught;
        try {
            comparator(proxy, {});
        } catch (error) {
            caught = error;
        }
        expect(caught).toBe(failure);
    }
});
it('binds metadata aliases to the active comparison at the actual warning and preserves sink', () => {
    vi.stubEnv('VITE_ORISO_FIXTURE_DIAGNOSTIC', 'deadline-warning');
    const sink = vi.spyOn(console, 'error').mockImplementation(() => {});
    const output = vi.spyOn(console, 'info').mockImplementation(() => {});
    const release = beginFixtureDiagnostic('deadline-warning');
    const wrapped = evaluate(instrumentComparator(source), true, (ok, message) => {
        if (!ok) console.error(message);
    });
    const empty: unknown[] = [];
    wrapped({ errors: empty, warnings: empty, name: ['deadline'] }, { errors: [], warnings: [], name: ['deadline'] });
    release();
    expect(console.error).toBe(sink);
    expect(sink).toHaveBeenCalledTimes(1);
    const warning = output.mock.calls
        .map(([line]) => JSON.parse(line))
        .find((item) => item.fixtureDiagnostic === 'first-warning');
    expect(warning.comparison).toMatchObject({
        module: comparatorContract.module,
        sha256: comparatorContract.sha256,
        left: { field: 'deadline', errorsWarningsAlias: true, errorsLength: 0, warningsLength: 0 },
        right: { field: 'deadline', errorsWarningsAlias: false, errorsLength: 0, warningsLength: 0 },
    });
    expect(warning.comparison.comparisonId).toBeGreaterThan(0);
});
