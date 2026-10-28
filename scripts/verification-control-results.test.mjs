// @vitest-environment node
import { writeControlPacket } from './verification-control-packet-fixture.mjs';
import { test } from 'vite-plus/test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { assertControlPhase } from './verification-control-results.mjs';
import { allocateControlInvocation, allocateControlPhase } from './verification-control-invocation.mjs';

const fixture = (unhandledErrors) => {
    const root = mkdtempSync(path.join(tmpdir(), 'admin-native-phase-'));
    const invocation = allocateControlInvocation(root);
    const { directory, capsule } = allocateControlPhase(invocation, 'capture');
    writeControlPacket(capsule, directory, unhandledErrors);
    return { root, directory, capsule };
};
const invoke = (directory, capsule) =>
    new Promise((resolve, reject) => {
        // Production CLI intentionally rejects untrusted invocation. Exercise the
        // native process with the same parent-owned capsule as the real controller.
        const args = [
            '--input-type=module',
            '-e',
            'import { assertControlPhase } from "./scripts/verification-control-results.mjs"; assertControlPhase(process.argv[1], "capture", 1, JSON.parse(process.argv[2]));',
            directory,
            JSON.stringify(capsule),
        ];
        const child = spawn(process.execPath, args);
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
    const { root, directory, capsule } = fixture([]);
    try {
        assert.equal(assertControlPhase(directory, 'capture', 1, capsule).length, 20);
        const native = await invoke(directory, capsule);
        assert.equal(native.code, 0, native.output);
    } finally {
        rmSync(root, { recursive: true });
    }
});
test('rejects an extra runner error at the same phase seam and native process', async () => {
    const { root, directory, capsule } = fixture(['controlled-unrelated-runner-error']);
    try {
        const native = await invoke(directory, capsule);
        assert.notEqual(native.code, 0);
        assert.match(native.output, /runner.*unhandled|Unhandled runner/i);
        assert.throws(
            () => assertControlPhase(directory, 'capture', 1, capsule),
            /runner.*unhandled|Unhandled runner/i,
        );
    } finally {
        rmSync(root, { recursive: true });
    }
});
