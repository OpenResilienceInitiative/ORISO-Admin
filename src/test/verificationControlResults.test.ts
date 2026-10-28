// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vite-plus/test';
// eslint-disable-next-line import/extensions
import { assertControlPhase } from '../../scripts/verification-control-results.mjs';
// eslint-disable-next-line import/extensions
import { allocateControlInvocation, allocateControlPhase } from '../../scripts/verification-control-invocation.mjs';

// eslint-disable-next-line import/extensions
import VerificationReporter from '../../scripts/verification-reporter.mjs';
// eslint-disable-next-line import/extensions
import { sourceIdentity } from '../../scripts/verification-provenance.mjs';

const expected = new Map([
    ['Healthy', null],
    ['Contextual Feedback', null],
    ['Low Contrast', 'color-contrast'],
    ['Unnamed Button', 'button-name'],
    ['Missing Alt', 'image-alt'],
    ['Caught Error', 'console-error: controlled console error'],
    ['Uncaught Error', 'uncaught-error: Uncaught Error: controlled uncaught error'],
    ['Unhandled Rejection', 'unhandled-rejection: controlled unhandled rejection'],
    ['Unexpected Request', 'unexpected-request:'],
    ['Fallback', 'fallback: A failure fallback replaced the story'],
    ['Production Boundary', 'fallback: A failure fallback replaced the story'],
    ['Expected Error', null],
    ['Known Baseline', 'color-contrast'],
    ['Known Added Node', 'color-contrast'],
    ['Known Worse Style', 'color-contrast'],
    ['Known Operational Error', 'color-contrast'],
    ['Missing Audit', 'Accessibility audit requires exactly one'],
    ['Audit Error', 'Accessibility audit'],
    ['Duplicate Audit', 'Accessibility audit requires exactly one'],
    ['Strict Addon Violation', 'Unapproved accessibility violation'],
]);
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));
const capsule = {
    invocationId: 'current',
    phase: 'capture',
    shuffle: false,
    profile: 'strict',
    source: { revision: 'abc', snapshot: { algorithm: 'sha256', digest: '123', files: 1 } },
};
function packet(control = capsule) {
    const directory = mkdtempSync(path.join(tmpdir(), 'control-results-'));
    roots.push(directory);
    const run = path.join(directory, 'run-current');
    mkdirSync(run);
    const provenance = { path: 'provenance.json', runId: 'reporter-current' };
    const cases = [...expected].map(([name, failure]) => ({
        provenance,
        file: 'controls.tsx',
        name,
        state: failure ? 'failed' : 'passed',
        errors: failure ? [failure] : [],
        a11y: {
            storyId: `controls--${name === 'Strict Addon Violation' ? 'strict-addon-violation' : name}`,
            auditCount: 1,
            strictAssertionCompanion: true,
            fingerprints: ['real'],
            reports: [{ result: { violations: [{ id: 'button-name' }] } }, { result: { error: 'toHaveNoViolations' } }],
        },
    }));
    writeFileSync(
        path.join(directory, 'controls.json'),
        JSON.stringify({
            testResults: [
                {
                    assertionResults: [...expected].map(([title, failure]) => ({
                        title,
                        fullName: title,
                        status: failure ? 'failed' : 'passed',
                        failureMessages: failure ? [failure] : [],
                    })),
                },
            ],
        }),
    );
    writeFileSync(path.join(run, 'cases.jsonl'), cases.map((item) => JSON.stringify(item)).join('\n'));
    writeFileSync(
        path.join(run, 'events.jsonl'),
        cases
            .map((item) =>
                JSON.stringify({ provenance, event: 'result', name: item.name, file: item.file, state: item.state }),
            )
            .join('\n'),
    );
    writeFileSync(
        path.join(run, 'inventory.json'),
        JSON.stringify({ provenance, inventoryComplete: true, executed: 20, unhandledErrors: [] }),
    );
    writeFileSync(
        path.join(run, 'provenance.json'),
        JSON.stringify({ runId: provenance.runId, source: control.source, control }),
    );
    return directory;
}
it('rejects the precise stale packet false-green after an actual startup exit 1', () => {
    const directory = packet({ ...capsule, invocationId: 'previous' });
    const child = spawnSync(process.execPath, ['-e', 'process.exit(1)']);
    expect(child.status).toBe(1);
    expect(() => assertControlPhase(directory, 'capture', child.status, capsule)).toThrow();
});
it('accepts a fresh complete strict packet', () =>
    expect(assertControlPhase(packet(), 'capture', 1, capsule)).toHaveLength(20));
it.each(['invocationId', 'phase', 'shuffle', 'profile', 'source'])('rejects mismatched %s', (key) => {
    const changed = { ...capsule, [key]: key === 'source' ? { revision: 'other' } : 'other' };
    expect(() => assertControlPhase(packet(changed), 'capture', 1, capsule)).toThrow();
});

it('allocates exclusive invocation and phase roots without overwriting evidence', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'control-paths-'));
    roots.push(root);
    const first = allocateControlInvocation(root, 'fixed');
    expect(() => allocateControlInvocation(root, 'fixed')).toThrow();
    allocateControlPhase(first, 'capture');
    expect(() => allocateControlPhase(first, 'capture')).toThrow();
    expect(allocateControlPhase(first, 'verify').directory).not.toBe(
        allocateControlPhase(first, 'verify', true).directory,
    );
    expect(allocateControlInvocation(root).directory).not.toBe(allocateControlInvocation(root).directory);
});
it.each(['cases.jsonl', 'events.jsonl', 'inventory.json', 'provenance.json'])(
    'rejects mismatched reporter identity in %s',
    (file) => {
        const directory = packet();
        const target = path.join(directory, 'run-current', file);
        writeFileSync(target, readFileSync(target, 'utf8').replaceAll('reporter-current', 'previous-run'));
        expect(() => assertControlPhase(directory, 'capture', 1, capsule)).toThrow();
    },
);
it('rejects duplicate reporter case packets', () => {
    const directory = packet();
    const target = path.join(directory, 'run-current', 'cases.jsonl');
    const lines = readFileSync(target, 'utf8').split('\n');
    [, lines[1]] = [null, lines[0]];
    writeFileSync(target, lines.join('\n'));
    expect(() => assertControlPhase(directory, 'capture', 1, capsule)).toThrow();
});
it('fails closed without trusted expectations or for an unsupported profile', () => {
    expect(() => assertControlPhase(packet(), 'capture', 1)).toThrow();
    expect(() => assertControlPhase(packet(), 'capture', 1, { ...capsule, profile: 'functional' })).toThrow();
});

it('accepts fresh evidence emitted by the real reporter lifecycle', () => {
    const current = { ...capsule, source: sourceIdentity(process.cwd()) };
    const directory = packet(current);
    const runDirectory = path.join(directory, 'run-current');
    const samples = readFileSync(path.join(runDirectory, 'cases.jsonl'), 'utf8')
        .split('\n')
        .map((line) => JSON.parse(line));
    rmSync(runDirectory, { recursive: true });
    const oldExit = process.exitCode;
    vi.stubEnv('ORISO_VERIFICATION_CONTROLS', 'true');
    vi.stubEnv('ORISO_CONTROL_INVOCATION_JSON', JSON.stringify(current));
    try {
        const reporter = new VerificationReporter({ directory: runDirectory });
        reporter.onInit({ config: {}, state: { getUnhandledErrors: () => [] }, onClose: () => {} });
        let tests: typeof samples = [];
        const module = {
            moduleId: path.resolve('src/test/verificationControlResults.test.ts'),
            children: { allTests: () => tests },
        };
        tests = samples.map((sample, index) => ({
            id: String(index),
            module,
            fullName: sample.name,
            options: { mode: 'run' },
            result: () => ({ state: sample.state, errors: sample.errors.map((message: string) => ({ message })) }),
            diagnostic: () => ({ duration: 1 }),
            meta: () => ({ verificationA11y: sample.a11y }),
        }));
        reporter.onTestRunStart([module]);
        reporter.onTestModuleCollected(module);
        tests.forEach((test) => {
            reporter.onTestCaseReady(test);
            reporter.onTestCaseResult(test);
        });
        reporter.onTestModuleEnd(module);
        reporter.onTestRunEnd([module], [], 'failed');
        reporter.finalizeAfterPool();
        expect(assertControlPhase(directory, 'capture', 1, current)).toHaveLength(20);
    } finally {
        vi.unstubAllEnvs();
        process.exitCode = oldExit;
    }
});
