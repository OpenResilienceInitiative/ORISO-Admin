import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
export const assertControlPhase = (directory, phase, status, capsule) => {
    assert.ok(capsule?.invocationId, 'Trusted current invocation expectation required');
    assert.equal(capsule.profile, 'strict', 'Unsupported acceptance profile');
    assert.equal(capsule.phase, phase);
    assert.equal(typeof capsule.shuffle, 'boolean');
    assert.ok(capsule.source?.revision && capsule.source?.snapshot?.digest, 'Exact source identity required');
    assert.equal(status, 1, `Broken stories must fail child run; see ${directory}`);
    const tests = JSON.parse(readFileSync(path.join(directory, 'controls.json'), 'utf8')).testResults.flatMap(
        (suite) => suite.assertionResults,
    );
    assert.equal(tests.length, expected.size, 'Every control must execute');
    const checks = new Map(expected);
    if (phase === 'verify') {
        checks.set('Known Baseline', null);
        checks.set('Known Added Node', 'Unapproved accessibility violation');
        checks.set('Known Worse Style', 'Unapproved accessibility violation');
        checks.set('Known Operational Error', 'console-error: approved story independent console failure');
    }
    for (const [name, failure] of checks) {
        const test = tests.find((item) => item.title === name);
        assert.ok(test, `Missing executed control: ${name}`);
        assert.equal(
            test.status,
            failure ? 'failed' : 'passed',
            `Unexpected ${phase} result for ${name}; see ${directory}`,
        );
        if (failure)
            assert.ok(
                test.failureMessages.join('\n').includes(failure),
                `${name} failed for the wrong reason; see ${directory}`,
            );
    }
    const runs = readdirSync(directory).filter((name) => name.startsWith('run-'));
    assert.equal(runs.length, 1, 'Use a fresh artifacts directory for unambiguous controls');
    const cases = readFileSync(path.join(directory, runs[0], 'cases.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const inventory = JSON.parse(readFileSync(path.join(directory, runs[0], 'inventory.json'), 'utf8'));
    const runDirectory = path.join(directory, runs[0]);
    const provenance = JSON.parse(readFileSync(path.join(runDirectory, 'provenance.json'), 'utf8'));
    assert.deepEqual(provenance.control, capsule, 'Stale or mismatched control invocation');
    assert.deepEqual(provenance.source, capsule.source, 'Control source mismatch');
    assert.ok(provenance.runId, 'Missing reporter run identity');
    const reference = { path: 'provenance.json', runId: provenance.runId };
    assert.deepEqual(inventory.provenance, reference, 'Inventory run mismatch');
    assert.equal(cases.length, expected.size, 'Every native case must have one reporter packet');
    const events = readFileSync(path.join(runDirectory, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    for (const record of [...cases, ...events]) assert.deepEqual(record.provenance, reference, 'Packet run mismatch');
    assert.equal(
        new Set(cases.map((item) => JSON.stringify([item.file, item.name]))).size,
        expected.size,
        'Duplicate cases',
    );
    const results = events.filter((event) => event.event === 'result');
    assert.equal(results.length, expected.size, 'Every case needs one terminal event');
    for (const test of tests) {
        const matching = cases.filter((item) => item.name === test.fullName);
        assert.equal(matching.length, 1, 'Native case identity mismatch');
        const record = matching[0];
        assert.equal(record.state, test.status, 'Native case state mismatch');
        assert.equal(
            results.filter(
                (event) => event.name === record.name && event.file === record.file && event.state === record.state,
            ).length,
            1,
            'Terminal event mismatch',
        );
    }
    assert.equal(inventory.inventoryComplete, true);
    assert.equal(inventory.executed, expected.size);
    assert.deepEqual(inventory.unhandledErrors, [], 'Unhandled runner errors invalidate expected-negative proof');
    const strict = cases.find((test) => test.a11y?.storyId.endsWith('--strict-addon-violation'));
    assert.equal(strict.a11y.auditCount, 1, 'Pinned addon violation must represent one axe execution');
    assert.equal(strict.a11y.strictAssertionCompanion, true);
    assert.equal(strict.a11y.reports.length, 2, 'Keep both raw result and strict assertion evidence');
    assert.ok(strict.a11y.reports[0].result.violations.some((rule) => rule.id === 'button-name'));
    assert.ok(strict.a11y.fingerprints.length > 0);
    assert.ok(strict.a11y.reports[1].result.error.includes('toHaveNoViolations'));
    assert.ok(
        !strict.errors.some((error) => error.includes('Accessibility audit requires exactly one')),
        'A real strict violation must not be misdiagnosed as duplicate audits',
    );
    return cases;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    assertControlPhase(process.argv[2], process.argv[3], 1); // No trusted capsule: diagnostic intentionally fails closed.
}
