import { test } from 'vite-plus/test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { assertControlPhase } from './verification-control-results.mjs';

// Synthetic acceptance artifacts exercise the consumer, not an axe execution.
const positives = ['Healthy', 'Contextual Feedback', 'Expected Error'];
const negatives = {
    'Low Contrast': 'color-contrast',
    'Unnamed Button': 'button-name',
    'Missing Alt': 'image-alt',
    'Caught Error': 'console-error: controlled console error',
    'Uncaught Error': 'uncaught-error: Uncaught Error: controlled uncaught error',
    'Unhandled Rejection': 'unhandled-rejection: controlled unhandled rejection',
    'Unexpected Request': 'unexpected-request:',
    Fallback: 'fallback: A failure fallback replaced the story',
    'Production Boundary': 'fallback: A failure fallback replaced the story',
    'Known Baseline': 'color-contrast',
    'Known Added Node': 'color-contrast',
    'Known Worse Style': 'color-contrast',
    'Known Operational Error': 'color-contrast',
    'Missing Audit': 'Accessibility audit requires exactly one',
    'Audit Error': 'Accessibility audit',
    'Duplicate Audit': 'Accessibility audit requires exactly one',
    'Strict Addon Violation': 'Unapproved accessibility violation',
};
const fixture = async (unhandledErrors) => {
    const directory = await mkdtemp(path.join(tmpdir(), 'admin-phase-'));
    const tests = [
        ...positives.map((title) => ({
            title,
            status: 'passed',
            failureMessages: [],
        })),
        ...Object.entries(negatives).map(([title, reason]) => ({
            title,
            status: 'failed',
            failureMessages: [reason],
        })),
    ];
    await writeFile(
        path.join(directory, 'controls.json'),
        JSON.stringify({ testResults: [{ assertionResults: tests }] }),
    );
    await mkdir(path.join(directory, 'run-synthetic'));
    await writeFile(
        path.join(directory, 'run-synthetic/inventory.json'),
        JSON.stringify({
            inventoryComplete: true,
            executed: 20,
            skipped: 0,
            todo: 0,
            retries: 0,
            declaredNeedsData: 0,
            unhandledErrors,
        }),
    );
    const strict = {
        errors: ['Unapproved accessibility violation'],
        a11y: {
            storyId: 'temporary--strict-addon-violation',
            auditCount: 1,
            strictAssertionCompanion: true,
            fingerprints: ['synthetic-fingerprint'],
            reports: [
                { result: { testEngine: { version: '4.12.1' }, violations: [{ id: 'button-name' }] } },
                { result: { error: 'expect(...).toHaveNoViolations(...)' } },
            ],
        },
    };
    const cases = tests.map((item) => ({
        name: item.title,
        state: item.status,
        ...(item.title === 'Strict Addon Violation' ? strict : {}),
    }));
    await writeFile(path.join(directory, 'run-synthetic/cases.jsonl'), cases.map(JSON.stringify).join('\n') + '\n');
    return directory;
};
const invoke = (directory) =>
    new Promise((resolve, reject) => {
        const args = [path.resolve('scripts/verification-control-results.mjs'), directory, 'capture'];
        const child = spawn(process.execPath, args);
        console.info(
            JSON.stringify({
                childPid: child.pid,
                command: [process.execPath, ...args],
                cwd: process.cwd(),
            }),
        );
        let output = '';
        child.stdout.on('data', (data) => {
            output += data;
        });
        child.stderr.on('data', (data) => {
            output += data;
        });
        child.on('error', reject);
        child.on('close', (code) => resolve({ code, output }));
    });
test('accepts complete expected-negative artifacts with no independent runner error', async () => {
    const directory = await fixture([]);
    try {
        assert.equal(assertControlPhase(directory, 'capture', 1).length, 20);
        assert.equal((await invoke(directory)).code, 0);
    } finally {
        await rm(directory, { recursive: true });
    }
});
test('rejects an extra runner error at the same phase seam and native CLI', async () => {
    const directory = await fixture(['controlled-unrelated-runner-error']);
    try {
        const native = await invoke(directory);
        assert.notEqual(native.code, 0, 'Expected-negative proof must reject unrelated runner errors');
        assert.match(native.output, /runner.*unhandled|Unhandled runner/i);
        assert.throws(() => assertControlPhase(directory, 'capture', 1), /runner.*unhandled|Unhandled runner/i);
    } finally {
        await rm(directory, { recursive: true });
    }
});
