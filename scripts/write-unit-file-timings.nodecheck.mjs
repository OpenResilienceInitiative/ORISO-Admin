import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileTimings } from './write-unit-file-timings.mjs';

test('retains only relative test path and test execution window, never test names or failure output', () => {
    const report = {
        testResults: [{ name: '/repo/src/example.test.ts', startTime: 100, endTime: 125, message: 'secret' }],
    };
    assert.deepEqual(fileTimings(report, '/repo'), [{ file: 'src/example.test.ts', testExecutionWindowMs: 25 }]);
});

test('rejects outside paths and invalid timing', () => {
    assert.throws(() =>
        fileTimings({ testResults: [{ name: '/other/a.test.ts', startTime: 1, endTime: 2 }] }, '/repo'),
    );
    assert.throws(() =>
        fileTimings({ testResults: [{ name: '/repo/src/a.test.ts', startTime: 2, endTime: 1 }] }, '/repo'),
    );
});
