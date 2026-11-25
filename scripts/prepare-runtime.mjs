import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { checkFieldFormBackport, prepareFieldFormBackport } from './field-form-backport.mjs';

assert.ok(
    process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--check'),
    'Use prepare-runtime.mjs [--check]',
);
const checkOnly = process.argv[2] === '--check';
const receipt = checkOnly ? checkFieldFormBackport() : prepareFieldFormBackport();
if (!checkOnly) {
    const directory = path.resolve(
        process.env.VERIFICATION_ARTIFACTS_DIR || 'verification-artifacts',
        'runtime-integrations',
    );
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, 'field-form-650.json'), JSON.stringify(receipt, null, 2));
}
console.info(JSON.stringify({ mode: checkOnly ? 'check' : 'explicit-first-party-prepare', ...receipt }));
