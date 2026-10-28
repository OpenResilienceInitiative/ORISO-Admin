// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ElementA11yParameterError } from 'storybook/internal/preview-errors';
import { afterEach, expect, it, vi } from 'vite-plus/test';
import { createVerificationRecorder } from '../../.storybook/verificationIntegrity';
// eslint-disable-next-line import/extensions
import { assertControlPhase, assertAxeWitnessReceipt } from '../../scripts/verification-control-results.mjs';
// eslint-disable-next-line import/extensions
import { allocateControlInvocation, allocateControlPhase } from '../../scripts/verification-control-invocation.mjs';

// eslint-disable-next-line import/extensions
import VerificationReporter from '../../scripts/verification-reporter.mjs';
// eslint-disable-next-line import/extensions
import { sourceIdentity } from '../../scripts/verification-provenance.mjs';

const matcherFile = path.join(
    path.dirname(createRequire(import.meta.url).resolve('@storybook/addon-a11y/preview')),
    '_browser-chunks/matchers-JIUQ3HVY.js',
);
const { toHaveNoViolations } = await import(/* @vite-ignore */ pathToFileURL(matcherFile).href);

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
    selection: 'controls20',
    source: { revision: 'abc', snapshot: { algorithm: 'sha256', digest: '123', files: 1 } },
};
const eventFixtures: Record<
    string,
    {
        kind: 'console-error' | 'uncaught-error' | 'unhandled-rejection' | 'unexpected-request' | 'fallback';
        message: string;
    }[]
> = {
    'Caught Error': [{ kind: 'console-error', message: 'controlled console error' }],
    'Uncaught Error': [
        { kind: 'uncaught-error', message: 'Uncaught Error: controlled uncaught error' },
        { kind: 'console-error', message: 'Uncaught Error: controlled uncaught error' },
    ],
    'Unhandled Rejection': [
        { kind: 'unhandled-rejection', message: 'controlled unhandled rejection' },
        { kind: 'console-error', message: '[object PromiseRejectionEvent]' },
    ],
    'Unexpected Request': [
        { kind: 'unexpected-request', message: 'GET http://localhost:63315/service/__verification_unexpected__' },
    ],
    Fallback: [{ kind: 'fallback', message: 'A failure fallback replaced the story' }],
    'Production Boundary': [
        {
            kind: 'console-error',
            message:
                '%o\n\n%s\n\n%s\n controlled production boundary failure The above error occurred in the <BrokenProductChild> component. React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundary.',
        },
        {
            kind: 'console-error',
            message:
                '[ErrorBoundary:verification] controlled production boundary failure \n    at BrokenProductChild (http://localhost:63315/controls.tsx:1:1)\n    at ErrorBoundary (http://localhost:63315/boundary.tsx:1:1)',
        },
        { kind: 'fallback', message: 'A failure fallback replaced the story' },
    ],
    'Known Operational Error': [{ kind: 'console-error', message: 'approved story independent console failure' }],
};
const fixtureEvidence = (title: string, failure: string | null, control: typeof capsule) => {
    const storyId = `verificationcontrols-temporary--${title.toLowerCase().replaceAll(' ', '-')}`;
    const decorated = (message: string) =>
        `\n\x1b[34mClick to debug the error directly in Storybook: http://localhost:6006/?path=/story/${storyId}&addonPanel=storybook/interactions/panel\x1b[39m\n\n${message}`;
    const details: any[] = [];
    const functional = control.profile === 'functional-pilot';
    const events = eventFixtures[title];
    if (events && (title !== 'Known Operational Error' || control.phase === 'verify')) {
        const recorder = createVerificationRecorder();
        events.forEach((event) => recorder.record(event.kind, event.message));
        try {
            recorder.assertComplete();
        } catch (error: any) {
            details.push({
                name: error.name,
                message: error.message,
                verificationFailures: error.verificationFailures,
            });
        }
    }
    if (functional) {
        if (title === 'Duplicate Audit')
            details.push({ name: 'Error', message: 'Functional pilot unexpected audit report' });
        return {
            details,
            a11y: {
                profile: 'functional-pilot',
                storyId,
                auditCount: 0,
                compliance: { status: 'DEFERRED', execution: 'NOT_RUN', reason: 'pilot scope' },
                reports: title === 'Duplicate Audit' ? [{ result: { error: 'controlled duplicate audit' } }] : [],
            },
        };
    }
    const rules: Record<string, string> = {
        'Unnamed Button': 'button-name',
        'Strict Addon Violation': 'button-name',
        'Missing Alt': 'image-alt',
    };
    const rule = rules[title] ?? 'color-contrast';
    const violates =
        failure &&
        [
            'Low Contrast',
            'Unnamed Button',
            'Missing Alt',
            'Known Baseline',
            'Known Added Node',
            'Known Worse Style',
            'Known Operational Error',
            'Strict Addon Violation',
        ].includes(title) &&
        !(title === 'Known Operational Error' && control.phase === 'verify');
    const raw = {
        violations: violates
            ? [
                  {
                      id: rule,
                      impact: 'serious',
                      help: 'Fixture help',
                      nodes: [{ html: '<p>Fixture</p>', target: ['#fixture'], failureSummary: 'Fixture failure' }],
                  },
              ]
            : [],
    };
    const fingerprints = violates ? [JSON.stringify({ rule, html: '<p>Fixture</p>' })] : [];
    const reports: any[] = [{ result: raw }];
    if (violates) {
        const message = toHaveNoViolations(raw).message();
        reports.push({ result: { error: message, errorDetails: { name: 'Error', message } } });
        details.push(
            { name: 'Error', message: decorated(message) },
            { name: 'Error', message: `Unapproved accessibility violation in ${storyId}: ${fingerprints.join('\n')}` },
        );
    }
    const prefix =
        'Accessibility audit requires exactly one fresh version1 raw report and only its pinned strict assertion companion; received';
    if (title === 'Missing Audit') details.push({ name: 'Error', message: `${prefix} 0 reports (0 valid raw)` });
    if (title === 'Duplicate Audit') details.push({ name: 'Error', message: `${prefix} 2 reports (1 valid raw)` });
    if (title === 'Audit Error') {
        const error = new ElementA11yParameterError();
        details.push(
            { name: error.name, message: decorated(error.message) },
            { name: 'Error', message: 'Accessibility audit missing, malformed, failed, or unexpected engine version' },
        );
    }
    return {
        details,
        a11y: {
            profile: 'strict',
            storyId,
            environment: 'fixture',
            auditCount: 1,
            strictAssertionCompanion: !!violates,
            fingerprints,
            reports,
        },
    };
};
function packet(control = capsule, checks = expected) {
    const directory = mkdtempSync(path.join(tmpdir(), 'control-results-'));
    roots.push(directory);
    const run = path.join(directory, 'run-current');
    mkdirSync(run);
    const provenance = { path: 'provenance.json', runId: 'reporter-current' };
    const cases = [...checks].map(([name, failure]) => {
        const { details, a11y } = fixtureEvidence(name, failure, control);
        return {
            provenance,
            file: 'controls.tsx',
            name,
            state: failure ? 'failed' : 'passed',
            errors: details.map((error) => error.message),
            errorDetails: details,
            a11y,
        };
    });
    writeFileSync(
        path.join(directory, 'controls.json'),
        JSON.stringify({
            testResults: [
                {
                    assertionResults: [...checks].map(([title, failure]) => ({
                        title,
                        fullName: title,
                        status: failure ? 'failed' : 'passed',
                        failureMessages: cases
                            .find((item) => item.name === title)!
                            .errorDetails.map((error) => error.stack || error.message),
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
        JSON.stringify({ provenance, inventoryComplete: true, executed: checks.size, unhandledErrors: [] }),
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

it('rejects native/reporter disagreement about an expected failure reason', () => {
    const directory = packet();
    const target = path.join(directory, 'run-current', 'cases.jsonl');
    writeFileSync(
        target,
        readFileSync(target, 'utf8').replace('console-error: controlled console error', 'unrelated setup failure'),
    );
    expect(() => assertControlPhase(directory, 'capture', 1, capsule)).toThrow('Reporter message/detail mismatch');
});

const functionalChecks = new Map(expected);
[
    'Low Contrast',
    'Unnamed Button',
    'Missing Alt',
    'Known Baseline',
    'Known Added Node',
    'Known Worse Style',
    'Missing Audit',
    'Audit Error',
    'Strict Addon Violation',
].forEach((title) => functionalChecks.set(title, null));
functionalChecks.set('Known Operational Error', 'console-error: approved story independent console failure');
functionalChecks.set('Duplicate Audit', 'Functional pilot unexpected audit report');
const functionalPacket = (shuffle = false, source = capsule.source) => {
    const current = { ...capsule, source, phase: 'verify', profile: 'functional-pilot', shuffle };
    const directory = packet(current, functionalChecks);
    const file = path.join(directory, 'run-current', 'cases.jsonl');
    const cases = readFileSync(file, 'utf8')
        .split('\n')
        .map((line) => JSON.parse(line));
    return { directory, current, file, cases };
};
it.each([false, true])('accepts the exact functional20 contract, shuffled=%s', (shuffle) => {
    const { directory, current } = functionalPacket(shuffle);
    expect(assertControlPhase(directory, 'verify', 1, current)).toHaveLength(20);
});
it.each(['audit', 'receipt', 'reason', 'retry', 'missing'])(
    'rejects incomplete or weakened functional controls: %s',
    (kind) => {
        const { directory, current, file, cases } = functionalPacket();
        if (kind === 'audit') cases[0].a11y.reports = [{ result: { error: 'unexpected' } }];
        if (kind === 'receipt') delete cases[0].a11y;
        if (kind === 'reason') cases.find((item) => item.name === 'Caught Error').errors = ['different error'];
        if (kind === 'retry') cases[0].retries = 1;
        if (kind === 'missing') cases.pop();
        writeFileSync(file, cases.map((item) => JSON.stringify(item)).join('\n'));
        expect(() => assertControlPhase(directory, 'verify', 1, current)).toThrow();
    },
);
it('requires a complete healthy one-case witness before evaluating a disconnected counter', async () => {
    // eslint-disable-next-line import/extensions
    const { installedAxeWitness } = await import('../../scripts/verification-axe-witness.mjs');
    const current = {
        ...capsule,
        phase: 'witness-disconnected',
        selection: 'axe-witness1',
        witness: { contractVersion: 1, pairId: 'pair', observation: 'disconnected-negative', ...installedAxeWitness() },
    };
    const directory = packet(current, new Map([['Callsite Witness', null]]));
    // Old strict20 evidence cannot substitute for the witness receipt.
    expect(() => assertAxeWitnessReceipt(assertControlPhase(directory, current.phase, 0, current))).toThrow();
    expect(() => assertControlPhase(directory, current.phase, 1, current)).toThrow('Child must exit naturally');
    const inventory = path.join(directory, 'run-current', 'inventory.json');
    const data = JSON.parse(readFileSync(inventory, 'utf8'));
    data.inventoryComplete = false;
    writeFileSync(inventory, JSON.stringify(data));
    expect(() => assertControlPhase(directory, current.phase, 0, current)).toThrow();
});

it.each(['strict', 'functional-pilot'])(
    'accepts fresh %s evidence emitted by the real reporter lifecycle',
    (profile) => {
        const strict = { ...capsule, source: sourceIdentity(process.cwd()) };
        const { directory, current } =
            profile === 'strict'
                ? { directory: packet(strict), current: strict }
                : functionalPacket(false, strict.source);
        const runDirectory = path.join(directory, 'run-current');
        const samples = readFileSync(path.join(runDirectory, 'cases.jsonl'), 'utf8')
            .split('\n')
            .map((line) => JSON.parse(line));
        rmSync(runDirectory, { recursive: true });
        const oldExit = process.exitCode;
        vi.stubEnv('ORISO_VERIFICATION_CONTROLS', 'true');
        vi.stubEnv('ORISO_VERIFICATION_PROFILE', profile);
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
                result: () => ({ state: sample.state, errors: sample.errorDetails }),
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
            expect(assertControlPhase(directory, current.phase, 1, current)).toHaveLength(20);
        } finally {
            vi.unstubAllEnvs();
            process.exitCode = oldExit;
        }
    },
);

it.each(['native-extra', 'reporter-extra', 'native-aggregate', 'reporter-aggregate'])(
    'rejects an expected functional failure plus an unrelated failure: %s',
    (kind) => {
        const { directory, current, file, cases } = functionalPacket();
        const unexpected = 'Error: controlled unrelated cleanup/token/API failure';
        if (kind.startsWith('native')) {
            const nativeFile = path.join(directory, 'controls.json');
            const native = JSON.parse(readFileSync(nativeFile, 'utf8'));
            const test = native.testResults[0].assertionResults.find(
                (item: { title: string }) => item.title === 'Caught Error',
            );
            if (kind.endsWith('extra')) test.failureMessages.push(unexpected);
            else test.failureMessages[0] += `\n${unexpected}`;
            writeFileSync(nativeFile, JSON.stringify(native));
        } else {
            const test = cases.find((item) => item.name === 'Caught Error');
            if (kind.endsWith('extra')) test.errors.push(unexpected);
            else test.errors[0] += `\n${unexpected}`;
            writeFileSync(file, cases.map((item) => JSON.stringify(item)).join('\n'));
        }
        expect(() => assertControlPhase(directory, 'verify', 1, current)).toThrow();
    },
);

const replaceCaseErrors = (directory: string, title: string, details: any[]) => {
    const file = path.join(directory, 'run-current', 'cases.jsonl');
    const cases = readFileSync(file, 'utf8')
        .split('\n')
        .map((line) => JSON.parse(line));
    const item = cases.find((test) => test.name === title);
    item.errorDetails = details;
    item.errors = details.map((error) => error.message);
    writeFileSync(file, cases.map((test) => JSON.stringify(test)).join('\n'));
    const nativeFile = path.join(directory, 'controls.json');
    const native = JSON.parse(readFileSync(nativeFile, 'utf8'));
    native.testResults[0].assertionResults.find((test: { title: string }) => test.title === title).failureMessages =
        details.map((error) => error.stack || error.message);
    writeFileSync(nativeFile, JSON.stringify(native));
};
const aggregate = (errors: any[]) => ({
    name: 'AggregateError',
    message: errors.map((error) => `${error.name}: ${error.message}`).join('\n'),
    errors,
});
it.each([
    'extra-leaf',
    'nested-extra-leaf',
    'aggregate-suffix',
    'cause',
    'event',
    'event-suffix',
    'count-mismatch',
    'production-extra',
    'production-duplicate',
    'production-missing',
    'unknown-event-field',
    'unknown-leaf-field',
])('rejects complete native/reporter agreement on an unpermitted failure set: %s', (kind) => {
    const { directory, current, cases } = functionalPacket();
    const title = kind.startsWith('production') ? 'Production Boundary' : 'Caught Error';
    const test = cases.find((item) => item.name === title);
    let details = test.errorDetails;
    const extra = { name: 'Error', message: 'unrelated cleanup/token/API failure' };
    if (kind === 'extra-leaf') details.push(extra);
    if (kind === 'nested-extra-leaf') details = [aggregate([aggregate(details), extra])];
    if (kind === 'aggregate-suffix') {
        details = [aggregate(details)];
        details[0].message += '\nError: unrelated';
    }
    if (kind === 'cause') details[0].cause = extra;
    if (kind === 'unknown-event-field') details[0].verificationFailures.unexpected[0].hidden = extra;
    if (kind === 'unknown-leaf-field') details[0].hidden = extra;
    if (kind === 'event' || kind === 'production-extra')
        details[0].verificationFailures.unexpected.push({ kind: 'console-error', message: 'unrelated' });
    if (kind === 'event-suffix') details[0].verificationFailures.unexpected[0].message += '\nunrelated';
    if (kind === 'count-mismatch')
        details[0].verificationFailures.mismatches.push({
            kind: 'console-error',
            message: 'expected',
            expected: 1,
            received: 0,
        });
    if (kind === 'production-duplicate')
        details[0].verificationFailures.unexpected.push({ ...details[0].verificationFailures.unexpected[0] });
    if (kind === 'production-missing') details[0].verificationFailures.unexpected.shift();
    if (details[0].verificationFailures)
        details[0].message = `Story verification failed:\n${details[0].verificationFailures.unexpected
            .map((event: { kind: string; message: string }) => `${event.kind}: ${event.message}`)
            .join('\n')}`;
    replaceCaseErrors(directory, title, details);
    expect(() => assertControlPhase(directory, 'verify', 1, current)).toThrow();
});
it('accepts the full source-defined production-boundary companion set in a consistent aggregate', () => {
    const { directory, current, cases } = functionalPacket();
    replaceCaseErrors(directory, 'Production Boundary', [
        aggregate(cases.find((item) => item.name === 'Production Boundary').errorDetails),
    ]);
    expect(assertControlPhase(directory, 'verify', 1, current)).toHaveLength(20);
});
it('accepts a complete strict matcher plus audit-gate aggregate and rejects an appended unrelated leaf', () => {
    const directory = packet();
    const cases = readFileSync(path.join(directory, 'run-current', 'cases.jsonl'), 'utf8')
        .split('\n')
        .map((line) => JSON.parse(line));
    const details = [aggregate(cases.find((item) => item.name === 'Low Contrast').errorDetails)];
    replaceCaseErrors(directory, 'Low Contrast', details);
    expect(assertControlPhase(directory, 'capture', 1, capsule)).toHaveLength(20);
    details[0].errors.push({ name: 'Error', message: 'unrelated cleanup failure' });
    replaceCaseErrors(directory, 'Low Contrast', [aggregate(details[0].errors)]);
    expect(() => assertControlPhase(directory, 'capture', 1, capsule)).toThrow('Unexpected case failure set');
});

it('keeps strict verify phase companions exact using the parent capture baselines', () => {
    const captured = packet();
    const readCases = (directory: string) =>
        readFileSync(path.join(directory, 'run-current', 'cases.jsonl'), 'utf8')
            .split('\n')
            .map((line) => JSON.parse(line));
    const original = readCases(captured);
    const known = ['Known Baseline', 'Known Added Node', 'Known Worse Style', 'Known Operational Error'];
    const baselines = original
        .filter((item) => known.includes(item.name))
        .map((item) => ({
            storyId: item.a11y.storyId,
            environment: item.a11y.environment,
            fingerprints: item.a11y.fingerprints,
        }));
    const current = { ...capsule, phase: 'verify' };
    const checks = new Map(expected);
    checks.set('Known Baseline', null);
    checks.set('Known Added Node', 'Unapproved accessibility violation');
    checks.set('Known Worse Style', 'Unapproved accessibility violation');
    checks.set('Known Operational Error', 'console-error: approved story independent console failure');
    const directory = packet(current, checks);
    const cases = readCases(directory);
    known.forEach((title) => {
        const test = cases.find((item) => item.name === title);
        const before = original.find((item) => item.name === title);
        test.a11y = { ...before.a11y, strictAssertionCompanion: false, reports: before.a11y.reports.slice(0, 1) };
        if (title === 'Known Added Node')
            test.a11y.fingerprints = [...before.a11y.fingerprints, 'new-button-fingerprint'];
        if (title === 'Known Worse Style') test.a11y.fingerprints = ['worsened-color-fingerprint'];
    });
    writeFileSync(
        path.join(directory, 'run-current', 'cases.jsonl'),
        cases.map((item) => JSON.stringify(item)).join('\n'),
    );
    replaceCaseErrors(directory, 'Known Baseline', []);
    ['Known Added Node', 'Known Worse Style'].forEach((title) => {
        const test = cases.find((item) => item.name === title);
        const extra = title === 'Known Added Node' ? 'new-button-fingerprint' : 'worsened-color-fingerprint';
        replaceCaseErrors(directory, title, [
            { name: 'Error', message: `Unapproved accessibility violation in ${test.a11y.storyId}: ${extra}` },
        ]);
    });
    expect(assertControlPhase(directory, 'verify', 1, current, baselines)).toHaveLength(20);
    expect(() => assertControlPhase(directory, 'verify', 1, current)).toThrow('Unexpected case failure set');
});

it('rejects extra error text hidden in the deliberate functional duplicate-audit report', () => {
    const { directory, current, file, cases } = functionalPacket();
    cases.find((item) => item.name === 'Duplicate Audit').a11y.reports[0].result.error += '\nunrelated engine failure';
    writeFileSync(file, cases.map((item) => JSON.stringify(item)).join('\n'));
    expect(() => assertControlPhase(directory, 'verify', 1, current)).toThrow(
        'Unexpected injected audit error evidence',
    );
});

it.each(['origin', 'story', 'panel', 'duplicate', 'suffix', 'missing'])(
    'rejects a changed or missing source-defined Storybook debug banner: %s',
    (kind) => {
        const directory = packet();
        const cases = readFileSync(path.join(directory, 'run-current/cases.jsonl'), 'utf8')
            .split('\n')
            .map((line) => JSON.parse(line));
        const details = cases.find((item) => item.name === 'Low Contrast').errorDetails;
        const first = details[0];
        if (kind === 'origin') first.message = first.message.replace('localhost:6006', 'other.example');
        if (kind === 'story') first.message = first.message.replace('--low-contrast', '--unnamed-button');
        if (kind === 'panel') first.message = first.message.replace('storybook/interactions/panel', 'other/panel');
        if (kind === 'duplicate') first.message += first.message;
        if (kind === 'suffix') first.message += '\nextra failure';
        if (kind === 'missing') first.message = first.message.slice(first.message.indexOf('expect(received)'));
        replaceCaseErrors(directory, 'Low Contrast', details);
        expect(() => assertControlPhase(directory, 'capture', 1, capsule)).toThrow();
    },
);

it.each(['missing', 'duplicate', 'reason-as-companion', 'wrong-reason'])(
    'rejects a changed PromiseRejectionEvent forwarding contract: %s',
    (kind) => {
        const { directory, current, cases } = functionalPacket();
        const details = cases.find((item) => item.name === 'Unhandled Rejection').errorDetails;
        const events = details[0].verificationFailures.unexpected;
        if (kind === 'missing')
            events.splice(
                events.findIndex((event) => event.kind === 'console-error'),
                1,
            );
        if (kind === 'duplicate') events.push({ kind: 'console-error', message: '[object PromiseRejectionEvent]' });
        if (kind === 'reason-as-companion')
            events.find((event) => event.kind === 'console-error').message = 'controlled unhandled rejection';
        if (kind === 'wrong-reason')
            events.find((event) => event.kind === 'unhandled-rejection').message = 'different rejection';
        details[0].message = `Story verification failed:\n${events
            .map((event) => `${event.kind}: ${event.message}`)
            .join('\n')}`;
        replaceCaseErrors(directory, 'Unhandled Rejection', details);
        expect(() => assertControlPhase(directory, 'verify', 1, current)).toThrow();
    },
);
