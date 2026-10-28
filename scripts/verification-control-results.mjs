import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { validateControlCapsule } from './verification-profile.mjs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { ElementA11yParameterError } from 'storybook/internal/preview-errors';

const require = createRequire(import.meta.url);
const { toHaveNoViolations } = await import(
    pathToFileURL(
        path.join(
            path.dirname(require.resolve('@storybook/addon-a11y/preview')),
            '_browser-chunks/matchers-JIUQ3HVY.js',
        ),
    ).href
);
const plain = (value) => value.replace(/\x1b\[[0-9;]*m/g, '');

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
// These are fixture contracts, not approvals learned from child output.
const functionalEvents = (title, events) => {
    const exact = {
        'Caught Error': [['console-error', 'controlled console error']],
        'Known Operational Error': [['console-error', 'approved story independent console failure']],
        Fallback: [['fallback', 'A failure fallback replaced the story']],
        'Uncaught Error': [['uncaught-error', 'Uncaught Error: controlled uncaught error']],
        'Unhandled Rejection': [['unhandled-rejection', 'controlled unhandled rejection']],
    };
    assert.ok(Array.isArray(events), 'Missing recorder events');
    for (const event of events) {
        assert.deepEqual(Object.keys(event).sort(), ['kind', 'message'], 'Unknown recorder event fields');
        assert.equal(typeof event.kind, 'string');
        assert.equal(typeof event.message, 'string');
    }
    const remaining = events.map((event) => ({ ...event }));
    const take = (kind, predicate) => {
        const index = remaining.findIndex((event) => event.kind === kind && predicate(event.message));
        assert.ok(index >= 0, `Missing permitted ${title} ${kind} event`);
        remaining.splice(index, 1);
    };
    for (const [kind, message] of exact[title] ?? []) take(kind, (value) => value === message);
    if (title === 'Unexpected Request')
        take('unexpected-request', (value) => {
            if (!value.startsWith('GET ')) return false;
            try {
                const url = new URL(value.slice(4));
                return (
                    ['http:', 'https:'].includes(url.protocol) &&
                    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
                    url.pathname === '/service/__verification_unexpected__' &&
                    !url.search &&
                    !url.hash
                );
            } catch {
                return false;
            }
        });
    if (title === 'Production Boundary') {
        take('fallback', (value) => value === 'A failure fallback replaced the story');
        take(
            'console-error',
            (value) =>
                value ===
                '%o\n\n%s\n\n%s\n controlled production boundary failure The above error occurred in the <BrokenProductChild> component. React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundary.',
        );
        take(
            'console-error',
            (value) =>
                /^\[ErrorBoundary:verification\] controlled production boundary failure (?:\n\s+at [^\n]+)+\n?$/.test(
                    value,
                ) &&
                value.includes('at BrokenProductChild') &&
                value.includes('at ErrorBoundary'),
        );
    }
    // Pinned browser error-catcher forwards owned window events to console.error.
    const forwarded = {
        'Uncaught Error': 'Uncaught Error: controlled uncaught error',
        'Unhandled Rejection': 'controlled unhandled rejection',
    }[title];
    if (forwarded) take('console-error', (value) => value === forwarded);
    assert.deepEqual(remaining, [], `Unexpected or duplicate ${title} event`);
    assert.ok(events.length, 'Empty failure evidence');
};

const assertCaseFailures = (test, record, capsule, baselines) => {
    const details = record.errorDetails ?? [];
    assert.deepEqual(
        record.errors ?? [],
        details.map((error) => error.message),
        'Reporter message/detail mismatch',
    );
    assert.deepEqual(
        test.failureMessages ?? [],
        details.map((error) => error.stack || error.message),
        'Native error/detail mismatch',
    );
    const leaves = [];
    const visit = (error, depth = 0) => {
        assert.ok(depth <= 16 && error && typeof error === 'object', 'Unsupported case error tree');
        assert.ok(
            Object.keys(error).every((key) =>
                ['name', 'message', 'stack', 'errors', 'cause', 'verificationFailures'].includes(key),
            ),
            'Unknown case error fields',
        );
        assert.equal(typeof error.message, 'string');
        if (depth > 0) assert.equal(error.stack, undefined, 'Unexpected nested stack field');
        assert.equal(error.cause, undefined, 'Unexpected error cause');
        if (error.name === 'AggregateError') {
            assert.ok(Array.isArray(error.errors) && error.errors.length > 0, 'Missing aggregate children');
            assert.equal(error.verificationFailures, undefined, 'Unexpected aggregate evidence');
            assert.equal(
                error.message,
                error.errors.map((child) => `${child.name}: ${child.message}`).join('\n'),
                'Unexpected aggregate message',
            );
            error.errors.forEach((child) => visit(child, depth + 1));
        } else {
            assert.equal(error.errors, undefined, 'Unexpected nested error evidence');
            leaves.push(error);
        }
    };
    details.forEach((error) => visit(error));
    const expectedMessages = [];
    const engineError = new ElementA11yParameterError();
    let needsRecorder =
        [
            'Caught Error',
            'Uncaught Error',
            'Unhandled Rejection',
            'Unexpected Request',
            'Fallback',
            'Production Boundary',
        ].includes(test.title) ||
        (test.title === 'Known Operational Error' && capsule.phase === 'verify');
    if (capsule.profile === 'functional-pilot') {
        if (test.title === 'Duplicate Audit') expectedMessages.push('Functional pilot unexpected audit report');
    } else {
        const raw = record.a11y?.reports?.find((report) => report.result?.violations)?.result;
        const fingerprints = record.a11y?.fingerprints ?? [];
        if (
            [
                'Low Contrast',
                'Unnamed Button',
                'Missing Alt',
                'Known Baseline',
                'Known Added Node',
                'Known Worse Style',
                'Known Operational Error',
                'Strict Addon Violation',
            ].includes(test.title)
        ) {
            assert.ok(raw, 'Missing strict raw result for error contract');
            const allowed = [
                ...(baselines.find(
                    (entry) => entry.storyId === record.a11y.storyId && entry.environment === record.a11y.environment,
                )?.fingerprints ?? []),
            ];
            const unexpected = fingerprints.filter((fingerprint) => {
                const index = allowed.indexOf(fingerprint);
                if (index < 0) return true;
                allowed.splice(index, 1);
                return false;
            });
            if (unexpected.length)
                expectedMessages.push(
                    `Unapproved accessibility violation in ${record.a11y.storyId}: ${unexpected.join('\n')}`,
                );
            const approved = baselines.some(
                (entry) => entry.storyId === record.a11y.storyId && entry.environment === record.a11y.environment,
            );
            if (!approved && raw.violations.length) expectedMessages.push(toHaveNoViolations(raw).message());
        }
        const auditPrefix =
            'Accessibility audit requires exactly one fresh version1 raw report and only its pinned strict assertion companion; received';
        if (test.title === 'Missing Audit') expectedMessages.push(`${auditPrefix} 0 reports (0 valid raw)`);
        if (test.title === 'Duplicate Audit') expectedMessages.push(`${auditPrefix} 2 reports (1 valid raw)`);
        if (test.title === 'Audit Error')
            expectedMessages.push(
                engineError.message,
                'Accessibility audit missing, malformed, failed, or unexpected engine version',
            );
    }
    const actualMessages = [];
    for (const error of leaves) {
        if (error.verificationFailures !== undefined) {
            assert.deepEqual(
                Object.keys(error.verificationFailures).sort(),
                ['mismatches', 'unexpected'],
                'Unknown recorder evidence fields',
            );
            assert.ok(needsRecorder, 'Unexpected extra recorder failure');
            needsRecorder = false;
            assert.equal(error.name, 'Error');
            assert.deepEqual(error.verificationFailures.mismatches, [], 'Unexpected expected-error count mismatch');
            const events = error.verificationFailures.unexpected;
            functionalEvents(test.title, events);
            assert.equal(
                error.message,
                `Story verification failed:\n${events.map((event) => `${event.kind}: ${event.message}`).join('\n')}`,
                'Recorder message/evidence mismatch',
            );
        } else {
            assert.equal(
                error.name,
                error.message === engineError.message ? engineError.name : 'Error',
                'Unexpected error leaf type',
            );
            actualMessages.push(plain(error.message));
        }
    }
    assert.equal(needsRecorder, false, 'Missing functional recorder failure');
    assert.deepEqual(actualMessages.sort(), expectedMessages.map(plain).sort(), 'Unexpected case failure set');
};

export const assertControlPhase = (directory, phase, status, capsule, baselines = []) => {
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
        assertCaseFailures(test, record, capsule, baselines);
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
                assert.deepEqual(
                    test.a11y.reports[0].result,
                    { error: 'controlled duplicate audit' },
                    'Unexpected injected audit error evidence',
                );
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
