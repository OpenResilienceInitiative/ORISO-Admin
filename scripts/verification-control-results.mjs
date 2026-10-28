import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { validateControlCapsule } from './verification-profile.mjs';
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
    validateControlCapsule(capsule);
    assert.equal(capsule.phase, phase);
    const witness = capsule.selection === 'axe-witness1';
    assert.equal(status, witness ? 0 : 1, `Child must exit naturally with expected status; see ${directory}`);
    const tests = JSON.parse(readFileSync(path.join(directory, 'controls.json'), 'utf8')).testResults.flatMap(
        (suite) => suite.assertionResults,
    );
    const checks = witness ? new Map([['Callsite Witness', null]]) : new Map(expected);
    if (phase === 'verify') {
        checks.set('Known Baseline', null);
        checks.set('Known Added Node', 'Unapproved accessibility violation');
        checks.set('Known Worse Style', 'Unapproved accessibility violation');
        checks.set('Known Operational Error', 'console-error: approved story independent console failure');
    }
    if (capsule.profile === 'functional-pilot' && !witness) {
        for (const name of [
            'Low Contrast',
            'Unnamed Button',
            'Missing Alt',
            'Known Baseline',
            'Known Added Node',
            'Known Worse Style',
            'Missing Audit',
            'Audit Error',
            'Strict Addon Violation',
        ])
            checks.set(name, null);
        checks.set('Duplicate Audit', 'Functional pilot unexpected audit report');
    }
    assert.equal(tests.length, checks.size, 'Every control must execute');
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
    assert.equal(cases.length, checks.size, 'Every native case must have one reporter packet');
    const events = readFileSync(path.join(runDirectory, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    for (const record of [...cases, ...events]) assert.deepEqual(record.provenance, reference, 'Packet run mismatch');
    assert.equal(
        new Set(cases.map((item) => JSON.stringify([item.file, item.name]))).size,
        checks.size,
        'Duplicate cases',
    );
    const results = events.filter((event) => event.event === 'result');
    assert.equal(results.length, checks.size, 'Every case needs one terminal event');
    for (const test of tests) {
        const matching = cases.filter((item) => item.name === test.fullName);
        assert.equal(matching.length, 1, 'Native case identity mismatch');
        const record = matching[0];
        assert.equal(record.state, test.status, 'Native case state mismatch');
        assert.equal(record.retries ?? 0, 0, 'Control retries invalidate proof');
        const failure = checks.get(test.title);
        if (failure)
            assert.ok(
                record.errors?.some((error) => error.includes(failure)),
                'Reporter case failed for the wrong reason',
            );
        else assert.deepEqual(record.errors ?? [], [], 'Healthy case contains errors');
        assert.equal(
            results.filter(
                (event) => event.name === record.name && event.file === record.file && event.state === record.state,
            ).length,
            1,
            'Terminal event mismatch',
        );
    }
    assert.equal(inventory.inventoryComplete, true);
    assert.equal(inventory.executed, checks.size);
    assert.deepEqual(inventory.unhandledErrors, [], 'Unhandled runner errors invalidate expected-negative proof');
    for (const field of ['skipped', 'todo', 'retries']) assert.equal(inventory[field] ?? 0, 0, `Unexpected ${field}`);
    if (witness) return { capsule, browser: cases[0].browser, case: cases[0] };
    if (capsule.profile === 'functional-pilot') {
        for (const test of cases) {
            assert.equal(test.a11y?.profile, 'functional-pilot');
            assert.deepEqual(test.a11y.compliance, { status: 'DEFERRED', execution: 'NOT_RUN', reason: 'pilot scope' });
            assert.equal(test.a11y.auditCount, 0);
            if (test.a11y.storyId.endsWith('--duplicate-audit')) {
                assert.equal(test.a11y.reports.length, 1);
                assert.ok(test.a11y.reports[0].result.error.includes('controlled duplicate audit'));
            } else assert.deepEqual(test.a11y.reports, [], 'Unexpected functional audit report');
        }
        return cases;
    }
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

// Validate healthy native completion/raw data first. The disconnected negative
// must reach the counter check; startup failure or missing reports is never proof.
export const assertAxeWitnessReceipt = (receipt) => {
    const { capsule, browser, case: test } = receipt;
    validateControlCapsule(capsule);
    assert.equal(capsule.selection, 'axe-witness1');
    assert.equal(test.state, 'passed');
    assert.deepEqual(test.errors ?? [], []);
    assert.equal(test.a11y?.profile, capsule.profile);
    assert.ok(
        browser?.userAgent &&
            browser.version &&
            browser.provider &&
            browser.instance &&
            browser.locale &&
            browser.timezone &&
            browser.viewport?.length === 3,
        'Actual browser/provider identity required',
    );
    const observation = test.a11y.witness;
    assert.ok(observation, 'Missing witness receipt');
    const { moduleLoaded, invocationCount, ...identity } = observation;
    assert.deepEqual(
        identity,
        { ...capsule.witness, invocationId: capsule.invocationId, phase: capsule.phase, source: capsule.source },
        'Witness identity mismatch',
    );
    assert.equal(moduleLoaded, true, 'Installed addon observer not loaded');
    if (capsule.profile === 'strict') {
        assert.equal(test.a11y.auditCount, 1, 'Strict witness needs one real audit');
        assert.equal(test.a11y.reports.length, 1);
        const report = test.a11y.reports[0];
        assert.equal(report.version, 1);
        assert.equal(report.status, 'passed');
        assert.equal(report.result.testEngine.name, 'axe-core');
        assert.equal(report.result.testEngine.version, capsule.witness.axe.version);
        assert.equal(report.result.testEnvironment.userAgent, browser.userAgent, 'Raw/browser identity mismatch');
        assert.deepEqual(report.result.violations, []);
        assert.deepEqual(report.result.incomplete, []);
        assert.ok(!report.result.error, 'Raw engine error');
        assert.deepEqual(
            report.result.passes.map((rule) => rule.id),
            ['oriso-callsite-witness'],
        );
        assert.equal(report.result.passes[0].nodeCount, 1, 'Witness sentinel was not checked');
    } else {
        assert.equal(test.a11y.auditCount, 0);
        assert.deepEqual(test.a11y.reports, []);
        assert.deepEqual(test.a11y.compliance, { status: 'DEFERRED', execution: 'NOT_RUN', reason: 'pilot scope' });
    }
    // A distinct code lets the controller accept exactly this negative rejection.
    if (invocationCount !== (capsule.profile === 'strict' ? 1 : 0)) {
        const error = new Error('Installed addon callsite count mismatch');
        error.code = 'ORISO_AXE_CALLSITE_COUNT';
        throw error;
    }
    return receipt;
};

export const assertAxeWitnessPair = (positive, functional) => {
    assert.equal(positive.capsule.phase, 'witness-positive');
    assert.equal(functional.capsule.phase, 'witness-functional');
    assertAxeWitnessReceipt(positive);
    assertAxeWitnessReceipt(functional);
    assert.deepEqual(positive.capsule.source, functional.capsule.source, 'Witness source mismatch');
    assert.equal(positive.capsule.invocationId, functional.capsule.invocationId, 'Witness invocation mismatch');
    assert.deepEqual(positive.capsule.witness, functional.capsule.witness, 'Witness pair/module mismatch');
    assert.deepEqual(positive.browser, functional.browser, 'Witness browser/provider mismatch');
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    assertControlPhase(process.argv[2], process.argv[3], 1); // No trusted capsule: diagnostic intentionally fails closed.
}
